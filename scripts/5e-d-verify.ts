// 5e-d onboarding verify — PURE function checks only: no servers, no KV
// calls, no .env reads (safe to run alongside the dev server).
// Covers the buildInitialDoc shape matrix (fresh doc passes prepareDocument;
// hero carries name/roles/design/banner layout + the required hero fields;
// slug set; visibility/showcase ABSENT; no seed leak; JSON round-trip; blank
// role -> roles absent; unique uuids per call) and the suggestSlug matrix
// (spaces, mixed case, invalid chars, collapse, edge hyphens, 40 clamp,
// reserved/short/all-invalid -> '').
// NOTE: the PUT handoff (savePortfolioData + recordLastSaved), the gate and
// the live availability fetch are wiring, not pure-testable — covered by
// review + the orchestrator's browser gate, per docs/specs/5e-d-onboarding.md.
// Run: npx tsx scripts/5e-d-verify.ts
import { buildInitialDoc, suggestSlug } from '../src/lib/onboarding';
import { prepareDocument } from '../src/lib/storage';
import { initialData } from '../src/data/initialData';
import { normalizeSlug, SLUG_PATTERN } from '../src/types/schema';
import type { FeaturedHeroBlock, RichTextBlock } from '../src/types/schema';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function isUuid(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
  );
}

console.log('— buildInitialDoc: shape the schema accepts —');
const doc = buildInitialDoc({ name: 'Jane Doe', role: 'Designer', design: 'cutie', slug: 'jane-doe' });
check('version is 3', doc.version === 3);
check("skin is 'clean'", doc.skin === 'clean');
check('theme is a plain object', typeof doc.theme === 'object' && doc.theme !== null);
check('cards library empty (no seed leak)', Array.isArray(doc.cards) && doc.cards.length === 0);
check('exactly one tab', doc.tabs.length === 1);
const tab = doc.tabs[0];
check("tab label 'Home'", tab.label === 'Home');
check('tab id is a uuid', isUuid(tab.id));
check('two blocks (hero + intro)', tab.blocks.length === 2);
check('prepareDocument accepts the fresh doc', prepareDocument(doc) !== null);
const prepared = prepareDocument({ ...doc });
check(
  'prepared doc round-trips byte-stable through prepareDocument',
  JSON.stringify(prepared) === JSON.stringify(doc),
);

console.log('— hero: identity model (name = H1, heading = tagline) —');
const hero = doc.tabs[0].blocks[0] as FeaturedHeroBlock;
check('type featured_hero', hero.type === 'featured_hero');
check('hero id is a uuid', isUuid(hero.id));
check('name carried verbatim', hero.name === 'Jane Doe');
check("roles = ['Designer']", Array.isArray(hero.roles) && hero.roles.length === 1 && hero.roles[0] === 'Designer');
check('heading is a non-empty tagline distinct from the name', typeof hero.heading === 'string' && hero.heading.length > 0 && hero.heading !== hero.name);
check('subheading present (required field)', typeof hero.subheading === 'string');
check('layout banner', hero.layout === 'banner');
check('design carried', hero.design === 'cutie');
check('ctaLabel usable', typeof hero.ctaLabel === 'string' && hero.ctaLabel.trim() !== '');
check("ctaHref is '#'", hero.ctaHref === '#');
check('thumbnail present (required field, empty)', typeof hero.thumbnail === 'string' && hero.thumbnail === '');
check('no eyebrow', hero.eyebrow === undefined);
check('no media fields', hero.mediaRatio === undefined && hero.mediaSide === undefined && hero.mediaPosition === undefined);

console.log('— intro: rich_text welcome —');
const intro = doc.tabs[0].blocks[1] as RichTextBlock;
check('type rich_text', intro.type === 'rich_text');
check('intro id is a uuid', isUuid(intro.id));
check('design carried', intro.design === 'cutie');
check(
  'content is a <p> welcome paragraph using the name',
  typeof intro.content === 'string' &&
    intro.content.startsWith('<p>') &&
    intro.content.endsWith('</p>') &&
    intro.content.includes('Jane'),
);

console.log('— meta: slug set, everything else ABSENT (never null) —');
check('slug set', doc.slug === 'jane-doe');
check('visibility ABSENT', doc.visibility === undefined && !('visibility' in doc));
check('showcase ABSENT', doc.showcase === undefined && !('showcase' in doc));
check('socials ABSENT', doc.socials === undefined && !('socials' in doc));
check('footer ABSENT', doc.footer === undefined && !('footer' in doc));
check('assets ABSENT', doc.assets === undefined && !('assets' in doc));
check('posts ABSENT', doc.posts === undefined && !('posts' in doc));

console.log('— no seed leak —');
check('seed has cards (precondition)', initialData.cards.length > 0);
check(
  'no seed card id appears in the generated doc',
  initialData.cards.every((card) => !JSON.stringify(doc).includes(card.id)),
);
check(
  'no seed block id appears in the generated doc',
  initialData.tabs.every((t) =>
    t.blocks.every((b) => !JSON.stringify(doc).includes(`"${b.id}"`)),
  ),
);
check(
  'generated tab ids differ from seed tab ids',
  initialData.tabs.every((t) => t.id !== tab.id),
);

console.log('— blank role -> roles ABSENT (conditional spread) —');
const noRole = buildInitialDoc({ name: 'Sam', role: '   ', design: 'default', slug: 'sam' });
const noRoleHero = noRole.tabs[0].blocks[0] as FeaturedHeroBlock;
check('roles key absent, never null/empty array', !('roles' in noRoleHero) && noRoleHero.roles === undefined);
check('name still trimmed+set', noRoleHero.name === 'Sam');
check('design default applied', noRoleHero.design === 'default' && (noRole.tabs[0].blocks[1] as RichTextBlock).design === 'default');

console.log('— name trimming + per-call uuids —');
const padded = buildInitialDoc({ name: '  Jane  ', role: '', design: 'riso', slug: 'jane' });
check('name trimmed', (padded.tabs[0].blocks[0] as FeaturedHeroBlock).name === 'Jane');
check('design riso applied', (padded.tabs[0].blocks[0] as FeaturedHeroBlock).design === 'riso');
const second = buildInitialDoc({ name: 'Jane Doe', role: 'Designer', design: 'cutie', slug: 'jane-doe' });
check('fresh ids per call (tab)', second.tabs[0].id !== tab.id);
check('fresh ids per call (hero)', (second.tabs[0].blocks[0] as FeaturedHeroBlock).id !== hero.id);
check('two calls deep-equal apart from ids', (() => {
  const strip = (d: typeof doc) => JSON.stringify({ ...d, tabs: d.tabs.map((t) => ({ ...t, id: '', blocks: [] })) });
  return strip(second) === strip(doc);
})());

console.log('— JSON round-trip (the localStorage/KV path) —');
const revived: unknown = JSON.parse(JSON.stringify(doc));
check('revived doc passes prepareDocument', prepareDocument(revived) !== null);
check('revived doc deep-equals the original', JSON.stringify(prepareDocument(revived)) === JSON.stringify(doc));
check('absent keys stay absent after JSON (no undefined -> null)', !('visibility' in (revived as object)) && !('showcase' in (revived as object)));

console.log('— suggestSlug matrix —');
check("'Jane Doe' -> jane-doe", suggestSlug('Jane Doe') === 'jane-doe', suggestSlug('Jane Doe'));
check("'  Jane   DOE  ' collapses + lowercases", suggestSlug('  Jane   DOE  ') === 'jane-doe', suggestSlug('  Jane   DOE  '));
check("'Jane -- Doe' collapses hyphen runs", suggestSlug('Jane -- Doe') === 'jane-doe', suggestSlug('Jane -- Doe'));
check("'Jane@Doe!' strips invalid chars", suggestSlug('Jane@Doe!') === 'janedoe', suggestSlug('Jane@Doe!'));
check("'jane_doe' strips underscores", suggestSlug('jane_doe') === 'janedoe', suggestSlug('jane_doe'));
check("'Jane @ Doe' -> jane-doe (no double hyphen)", suggestSlug('Jane @ Doe') === 'jane-doe', suggestSlug('Jane @ Doe'));
check("'  -jane-  ' trims edge hyphens", suggestSlug('  -jane-  ') === 'jane', suggestSlug('  -jane-  '));
check("'Jane Doe 3' keeps digits", suggestSlug('Jane Doe 3') === 'jane-doe-3', suggestSlug('Jane Doe 3'));
check('60 a clamps to 40', suggestSlug('a'.repeat(60)) === 'a'.repeat(40), suggestSlug('a'.repeat(60)));
check('clamp ending on a hyphen re-trims (39 b + " c")', suggestSlug(`${'b'.repeat(39)} c`) === 'b'.repeat(39), suggestSlug(`${'b'.repeat(39)} c`));
check("'dashboard' reserved -> ''", suggestSlug('dashboard') === '');
check("'u' reserved+short -> ''", suggestSlug('u') === '');
check("'ab' too short -> ''", suggestSlug('ab') === '');
check("'@@@ ***' all invalid -> ''", suggestSlug('@@@ ***') === '');
check("'' -> ''", suggestSlug('') === '');
check('every non-empty suggestion passes normalizeSlug', ['Jane Doe', 'Jane@Doe!', 'a'.repeat(60), '  -jane-  '].every((n) => normalizeSlug(suggestSlug(n)) !== null));
check('40-char suggestion satisfies SLUG_PATTERN', SLUG_PATTERN.test(suggestSlug('a'.repeat(60))));

console.log('— availability-endpoint equivalence (client gate vs server truth) —');
// The Create button gates on normalizeSlug locally; the endpoint answers
// available iff the same steps pass. Spot-check the shared vocabulary.
check('normalizeSlug("jane-doe") non-null (endpoint would say available)', normalizeSlug('jane-doe') === 'jane-doe');
check('normalizeSlug("dashboard") null (endpoint reason: reserved)', normalizeSlug('dashboard') === null);
check('normalizeSlug("-jane-") null (endpoint reason: invalid)', normalizeSlug('-jane-') === null);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
