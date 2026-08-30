// 5d-b OG card-data verify — PURE function checks only: no servers, no KV
// calls, no .env reads, no localStorage (safe to run alongside the dev
// server). Covers the spec's locked decisions per docs/specs/5d-b-og-image.md
// section 6: accent passthrough for valid hex (3/4/6/8-digit,
// case-insensitive), junk accents rejected (red / var(--accent) / rgb(...) /
// empty / missing # / non-hex chars), subtitle mirroring the 5d-a
// description chain (present + omitted, absent-key discipline), title
// equality with buildPortfolioMetadata (no second derivation), the OG_ACCENT
// fallback constant, never-throw on degenerate docs, and the committed seed.
// NOTE: the satori rendering itself (OgCard layout) and the route gate
// chains (isHosted → resolveHostedDoc → isPubliclyIndexable) are not
// pure-testable — covered by review + the orchestrator's build/curl gates,
// per the spec's verify list.
// Run: npx tsx scripts/5d-b-verify.ts
import {
  buildOgCardData,
  buildPortfolioMetadata,
  OG_ACCENT,
} from '../src/lib/metadata';
import { initialData } from '../src/data/initialData';
import type {
  Block,
  FeaturedHeroBlock,
  PortfolioData,
  RichTextBlock,
  Tab,
} from '../src/types/schema';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// Minimal valid doc factories — same shape as 5d-a-verify (theme comes in
// via `extra` so the accent cases stay one-liners).
function makeDoc(tabs: Tab[], extra: Partial<PortfolioData> = {}): PortfolioData {
  return { version: 3, skin: 'clean', theme: {}, cards: [], tabs, ...extra };
}

function tab(id: string, label: string, blocks: Block[]): Tab {
  return { id, label, blocks };
}

function hero(fields: Partial<FeaturedHeroBlock> = {}): FeaturedHeroBlock {
  return {
    id: 'hero',
    type: 'featured_hero',
    heading: 'Default heading',
    subheading: 'Default subheading',
    ctaLabel: 'See work',
    ctaHref: '#tab-work',
    thumbnail: '',
    ...fields,
  };
}

function richText(content: string): RichTextBlock {
  return { id: 'rt', type: 'rich_text', content };
}

console.log('— accent passthrough: valid hex 3/4/6/8-digit (case-insensitive) —');
check(
  '6-digit hex passes through untouched',
  buildOgCardData(makeDoc([], { theme: { accentColor: '#22d3ee' } })).accent === '#22d3ee',
);
check(
  '3-digit hex passes through untouched',
  buildOgCardData(makeDoc([], { theme: { accentColor: '#abc' } })).accent === '#abc',
);
check(
  '4-digit hex passes through untouched',
  buildOgCardData(makeDoc([], { theme: { accentColor: '#abcd' } })).accent === '#abcd',
);
check(
  '8-digit hex passes through untouched',
  buildOgCardData(makeDoc([], { theme: { accentColor: '#aabbccdd' } })).accent === '#aabbccdd',
);
check(
  'uppercase hex passes through untouched',
  buildOgCardData(makeDoc([], { theme: { accentColor: '#AABBCC' } })).accent === '#AABBCC',
);
check(
  'mixed-case hex passes through untouched',
  buildOgCardData(makeDoc([], { theme: { accentColor: '#aBcDeF' } })).accent === '#aBcDeF',
);

console.log('— junk accents rejected → OG_ACCENT —');
check(
  "named color 'red' rejected",
  buildOgCardData(makeDoc([], { theme: { accentColor: 'red' } })).accent === OG_ACCENT,
);
check(
  "'var(--accent)' rejected (satori cannot resolve CSS variables)",
  buildOgCardData(makeDoc([], { theme: { accentColor: 'var(--accent)' } })).accent === OG_ACCENT,
);
check(
  "'rgb(...)' rejected",
  buildOgCardData(makeDoc([], { theme: { accentColor: 'rgb(255, 0, 0)' } })).accent === OG_ACCENT,
);
check(
  'empty string rejected',
  buildOgCardData(makeDoc([], { theme: { accentColor: '' } })).accent === OG_ACCENT,
);
check(
  'missing # rejected',
  buildOgCardData(makeDoc([], { theme: { accentColor: '22d3ee' } })).accent === OG_ACCENT,
);
check(
  'non-hex characters rejected',
  buildOgCardData(makeDoc([], { theme: { accentColor: '#zzzzzz' } })).accent === OG_ACCENT,
);
check(
  'absent accentColor -> OG_ACCENT',
  buildOgCardData(makeDoc([])).accent === OG_ACCENT,
);

console.log('— OG_ACCENT constant —');
check("OG_ACCENT is neutral-900 '#171717'", OG_ACCENT === '#171717');

console.log('— subtitle mirrors the 5d-a description chain —');
const described = makeDoc([tab('t', 'T', [hero({ subheading: 'Short bio', heading: 'Heading' })])]);
const describedCard = buildOgCardData(described);
check('subheading wins the chain', describedCard.subtitle === 'Short bio');
check(
  'subtitle IS buildPortfolioMetadata(...).description (no second derivation)',
  describedCard.subtitle === buildPortfolioMetadata(described).description,
);
const undescribed = makeDoc([tab('t', 'T', [hero({ subheading: '', heading: '' })])]);
const undescribedCard = buildOgCardData(undescribed);
check('nothing yields text -> subtitle key OMITTED (never null/undefined-valued)', !('subtitle' in undescribedCard));
check('absent subtitle reads as undefined', undescribedCard.subtitle === undefined);
const richOnly = makeDoc([tab('t', 'T', [richText('<p>Rich body</p>')])]);
check(
  'rich_text fallback reaches the subtitle',
  buildOgCardData(richOnly).subtitle === 'Rich body',
);
const capped = makeDoc([tab('t', 'T', [richText(`<p>${'a'.repeat(300)}</p>`)])]);
check(
  'description chain cap (160) rides through to the subtitle',
  buildOgCardData(capped).subtitle === buildPortfolioMetadata(capped).description && buildOgCardData(capped).subtitle?.length === 160,
);

console.log('— title equals buildPortfolioMetadata(...).title (no second derivation) —');
const named = makeDoc([tab('t', 'Home', [hero({ name: 'Jane Doe', heading: 'Heading' })])]);
check('hero name title', buildOgCardData(named).title === 'Jane Doe');
const noHero = makeDoc([tab('t', 'Contact', [richText('<p>x</p>')])]);
check('no hero -> tab label title', buildOgCardData(noHero).title === 'Contact');
check('empty tabs -> fallback title', buildOgCardData(makeDoc([])).title === 'Portfolio');
check(
  'title identity holds on the seed',
  buildOgCardData(initialData).title === buildPortfolioMetadata(initialData).title,
);

console.log('— degenerate docs never throw —');
function safeCard(doc: PortfolioData): ReturnType<typeof buildOgCardData> | '<threw>' {
  try {
    return buildOgCardData(doc);
  } catch {
    return '<threw>';
  }
}
const stub = { version: 3 } as unknown as PortfolioData;
const stubCard = safeCard(stub);
check('cast stub (no tabs/theme/cards) -> fallback title', stubCard !== '<threw>' && stubCard.title === 'Portfolio');
check('cast stub accent -> OG_ACCENT', stubCard !== '<threw>' && stubCard.accent === OG_ACCENT);
check('cast stub subtitle omitted', stubCard !== '<threw>' && !('subtitle' in stubCard));
const nullTheme = { version: 3, theme: null } as unknown as PortfolioData;
const nullThemeCard = safeCard(nullTheme);
check('null theme -> OG_ACCENT (no throw)', nullThemeCard !== '<threw>' && nullThemeCard.accent === OG_ACCENT);
const undefinedTabs = { version: 3, tabs: undefined } as unknown as PortfolioData;
const undefinedTabsCard = safeCard(undefinedTabs);
check('explicit undefined tabs -> fallback title', undefinedTabsCard !== '<threw>' && undefinedTabsCard.title === 'Portfolio');

console.log('— seed sanity (content/portfolio.json — expectations derived from the doc) —');
const seedCard = buildOgCardData(initialData);
const seedAccent = initialData.theme.accentColor;
check(
  'seed accent passes through when valid hex, else OG_ACCENT',
  typeof seedAccent === 'string' && /^#[0-9a-f]{3,8}$/i.test(seedAccent)
    ? seedCard.accent === seedAccent
    : seedCard.accent === OG_ACCENT,
);
check(
  'seed subtitle mirrors the seed description',
  seedCard.subtitle === buildPortfolioMetadata(initialData).description,
);
check(
  'seed subtitle present (the seed hero has a subheading)',
  typeof seedCard.subtitle === 'string' && seedCard.subtitle !== '',
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
