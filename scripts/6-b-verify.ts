// 6-b verify — PURE checks only: no servers, no DOM, no .env reads (safe
// next to the dev server). Covers: RESERVED_SLUGS += 'demo' +
// normalizeSlug's allowReserved bypass, prepareDocument's slug option, demo
// doc sanity (valid v3, byte-stable round-trip, no "raymar", https image
// URLs, embed-rule iframes, block-type coverage, entry-list presets, no
// hosted-metadata keys in the raw file, card-library reuse, posts,
// icon keys, unique tab ids, #-tab refs), and static greps of the PUT
// route exemption + the seed script's env hygiene.
// Run: npx tsx scripts/6-b-verify.ts
import { readFileSync } from "node:fs";
import { RESERVED_SLUGS, normalizeSlug } from "../src/types/schema";
import type { BlockType, PortfolioData } from "../src/types/schema";
import { prepareDocument } from "../src/lib/storage";
import { sanitizePortfolioDocument } from "../src/lib/sanitize-html";
import { resolveAppIcon } from "../src/components/blocks/iconMap";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const RAW = readFileSync("content/portfolio.json", "utf8");
const parsed = JSON.parse(RAW) as Record<string, unknown>;
const doc = parsed as unknown as PortfolioData;

// ---------------- normalizeSlug + RESERVED_SLUGS ----------------
console.log("— RESERVED_SLUGS + normalizeSlug —");
check("RESERVED_SLUGS contains 'demo'", (RESERVED_SLUGS as readonly string[]).includes("demo"));
check("normalizeSlug('demo') is null by default", normalizeSlug("demo") === null);
check(
  "normalizeSlug('demo') is 'demo' with ['demo']",
  normalizeSlug("demo", ["demo"]) === "demo",
);
check(
  "bad pattern still null WITH allowReserved (underscore)",
  normalizeSlug("bad_slug", ["bad_slug"]) === null,
);
check(
  "bad pattern still null WITH allowReserved (edge hyphens)",
  normalizeSlug("-demo-", ["-demo-"]) === null,
);
check(
  "non-reserved slugs unaffected by allowReserved",
  normalizeSlug("my-site", ["demo"]) === "my-site",
);

// ---------------- prepareDocument opts ----------------
const withSlug = prepareDocument({ ...structuredClone(doc), slug: "demo" });
check(
  "prepareDocument strips slug 'demo' WITHOUT the option",
  withSlug !== null && withSlug.slug === undefined,
  String(withSlug?.slug),
);
const withSlugOpt = prepareDocument(
  { ...structuredClone(doc), slug: "demo" },
  { allowReservedSlugs: ["demo"] },
);
check(
  "prepareDocument keeps slug 'demo' WITH the option",
  withSlugOpt !== null && withSlugOpt.slug === "demo",
  String(withSlugOpt?.slug),
);

// ---------------- demo doc sanity ----------------
console.log("— demo doc sanity —");
const prepared = prepareDocument(structuredClone(doc));
check("demo doc is a valid v3 document", prepared !== null && prepared.version === 3);
if (!prepared) {
  console.log("FAIL  cannot continue doc checks — aborting");
  process.exit(1);
}
const pass1 = JSON.stringify(prepared);
const pass2 = JSON.stringify(prepareDocument(JSON.parse(pass1)));
check("byte-stable round-trip through prepareDocument", pass1 === pass2);
check(
  "byte-stable through the full hosted pipeline (DOMPurify too)",
  JSON.stringify(sanitizePortfolioDocument(prepared)) === pass1,
);

check("no 'raymar' anywhere in the file (case-insensitive)", !/raymar/i.test(RAW));
check(
  "no /images/hero-portrait.jpg",
  !RAW.includes("hero-portrait"),
);
check(
  "no local /images/ paths (demo links remote images only)",
  !/["'(]\/images\//.test(RAW),
);

// Hosted metadata stays OUT of the committed file.
check("raw file has no 'slug' key", !("slug" in parsed));
check("raw file has no 'visibility' key", !("visibility" in parsed));
check("raw file has no 'showcase' key", !("showcase" in parsed));

// Skin/theme/footer contract.
check("skin is 'clean'", doc.skin === "clean");
check("theme accentColor is '#22d3ee'", doc.theme?.accentColor === "#22d3ee");
check(
  "footer enabled with a demo-replace-me {year} line",
  doc.footer?.enabled === true &&
    (doc.footer.copyrightText ?? "").includes("{year}") &&
    /replace/i.test(doc.footer.copyrightText ?? ""),
);
check("no socials (no fake personal handles)", doc.socials === undefined);

// ---------------- image URLs ----------------
console.log("— image URLs —");
const imageUrls: string[] = [];
for (const tab of doc.tabs) {
  for (const block of tab.blocks) {
    if (block.type === "featured_hero") imageUrls.push(block.thumbnail);
  }
}
for (const card of doc.cards) if (card.coverImage) imageUrls.push(card.coverImage);
for (const post of doc.posts ?? []) if (post.coverImage) imageUrls.push(post.coverImage);
check("demo references at least one image URL", imageUrls.length > 0);
check(
  "every image URL is https and non-empty",
  imageUrls.every((url) => url !== "" && url.startsWith("https://")),
  JSON.stringify(imageUrls),
);

// ---------------- iframe embed rules ----------------
// Re-implemented locally from sanitize-html.ts's EMBED_HOSTS list.
const EMBED_HOSTS = [
  "www.youtube.com", "youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com",
  "player.vimeo.com",
  "streamable.com",
  "www.dailymotion.com",
];
function isAllowedEmbedUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    if (!(url.pathname.startsWith("/embed/") || url.pathname.startsWith("/video/") || url.pathname.startsWith("/e/"))) return false;
    return EMBED_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}
const iframeSrcs: string[] = [];
for (const tab of doc.tabs) {
  for (const block of tab.blocks) {
    if (block.type === "custom_html") {
      for (const m of block.html.matchAll(/<iframe[^>]*\ssrc="([^"]+)"/g)) {
        iframeSrcs.push(m[1]);
      }
    }
  }
}
check("at least one custom_html iframe (embed showcase)", iframeSrcs.length > 0);
check(
  "every iframe URL passes isAllowedEmbedUrl (https + allowed host + /embed/|/video/|/e/)",
  iframeSrcs.every(isAllowedEmbedUrl),
  JSON.stringify(iframeSrcs),
);

// ---------------- block coverage + structure ----------------
console.log("— block coverage + structure —");
const ALL_TYPES: BlockType[] = [
  "featured_hero", "app_grid", "rich_text", "custom_html", "marquee", "blog", "entry_list",
];
const present = new Set<BlockType>();
for (const tab of doc.tabs) for (const block of tab.blocks) present.add(block.type);
check(
  "every block type appears at least once",
  ALL_TYPES.every((type) => present.has(type)),
  `missing: ${ALL_TYPES.filter((t) => !present.has(t)).join(", ")}`,
);

const designs = new Set<string>();
const entryPresets = new Set<string>();
const entryColumns = new Set<number>();
for (const tab of doc.tabs) {
  for (const block of tab.blocks) {
    if ("design" in block && block.design) designs.add(block.design);
    if (block.type === "entry_list") {
      if (block.preset) entryPresets.add(block.preset);
      if (block.columns) entryColumns.add(block.columns);
    }
  }
}
check(
  "all four art directions used",
  ["default", "cutie", "editorial", "riso"].every((d) => designs.has(d)),
  [...designs].join(","),
);
check("entry_list appears with 2+ presets", entryPresets.size >= 2, [...entryPresets].join(","));
check("entry_list appears with a columns:2+ variant", [...entryColumns].some((c) => c >= 2), [...entryColumns].join(","));

const tabIds = doc.tabs.map((tab) => tab.id);
check(
  "tab ids unique + demo prefixes",
  new Set(tabIds).size === tabIds.length &&
    ["tab-home", "tab-showcase", "tab-guide"].every((id) => tabIds.includes(id)),
  tabIds.join(","),
);
check("3–5 tabs", doc.tabs.length >= 3 && doc.tabs.length <= 5, String(doc.tabs.length));

// #-tab refs must point at existing tab ids or labels.
const tabLabels = doc.tabs.map((tab) => tab.label.toLowerCase());
const tabRefTargets: string[] = [];
for (const tab of doc.tabs) {
  for (const block of tab.blocks) {
    if (block.type === "featured_hero") {
      if (block.ctaHref.startsWith("#")) tabRefTargets.push(block.ctaHref.slice(1));
      if (block.secondaryAction?.url.startsWith("#")) {
        tabRefTargets.push(block.secondaryAction.url.slice(1));
      }
    }
  }
}
check(
  "every #-prefixed CTA resolves to a tab id or label",
  tabRefTargets.every(
    (ref) => tabIds.includes(ref) || tabLabels.includes(ref.toLowerCase()),
  ),
  tabRefTargets.join(","),
);

// ---------------- card library ----------------
console.log("— card library —");
const cardIds = new Set(doc.cards.map((card) => card.id));
const gridRefs: string[][] = [];
for (const tab of doc.tabs) {
  for (const block of tab.blocks) {
    if (block.type === "app_grid") gridRefs.push(block.apps);
  }
}
const allRefs = gridRefs.flat();
check("app grids reference cards by id (v3)", allRefs.length > 0);
check(
  "no dangling card refs",
  allRefs.every((ref) => cardIds.has(ref)),
);
const refCounts = new Map<string, number>();
for (const ref of allRefs) refCounts.set(ref, (refCounts.get(ref) ?? 0) + 1);
check(
  "at least one card id reused across two grids",
  [...refCounts.values()].some((count) => count >= 2),
  JSON.stringify([...refCounts]),
);
check(
  "all card hrefs are https",
  doc.cards.every((card) => card.href.startsWith("https://")),
);
check(
  "all card icon keys resolve in iconMap",
  doc.cards.every(
    (card) => card.icon === undefined || resolveAppIcon(card.icon) !== null,
  ),
  doc.cards.map((c) => c.icon).join(","),
);

// ---------------- posts ----------------
check(
  "posts present with 1+ published",
  (doc.posts ?? []).some((post) => post.status === "published"),
);
check(
  "published posts carry publishedAt",
  (doc.posts ?? [])
    .filter((post) => post.status === "published")
    .every((post) => typeof post.publishedAt === "string" && post.publishedAt !== ""),
);

// ---------------- static greps ----------------
console.log("— static greps —");
const routeSrc = readFileSync("src/app/api/portfolio/route.ts", "utf8");
check("PUT route exemption keyed on DEMO_EMAIL", routeSrc.includes("DEMO_EMAIL"));
check(
  "exemption threads allowReservedSlugs into prepareDocument",
  routeSrc.includes("allowReservedSlugs") && routeSrc.includes("getDemoUid"),
);
const seedSrc = readFileSync("scripts/seed-demo.ts", "utf8");
check("seed script reads DEMO_EMAIL + DEMO_PASSWORD", seedSrc.includes("DEMO_EMAIL") && seedSrc.includes("DEMO_PASSWORD"));
check(
  "seed script uses the firebase client SDK (signIn + createUser fallback)",
  seedSrc.includes("signInWithEmailAndPassword") && seedSrc.includes("createUserWithEmailAndPassword"),
);
check(
  "seed script never console-logs credential values",
  !seedSrc
    .split("\n")
    .some(
      (line) =>
        /console\.(log|info|warn|error)/.test(line) &&
        /(DEMO_PASSWORD|DEMO_EMAIL|apiKey|authDomain|idToken|password)/.test(line),
    ),
);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
