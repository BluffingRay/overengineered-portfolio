// 5d-a metadata verify — PURE function checks only: no servers, no KV
// calls, no .env reads, no localStorage (safe to run alongside the dev
// server). Covers the spec's locked decisions: the title chain (name ->
// heading -> first tab label -> 'Portfolio'), the description chain
// (subheading -> heading -> first rich_text stripped/capped -> key
// omitted), tag stripping + whitespace collapse + the 160 cap, OG image
// absolute-ization, twitter card selection, isPubliclyIndexable, and
// never-throw on degenerate docs — per docs/specs/5d-a-metadata.md.
// NOTE: the RSC wiring (cache()-shared load, headers-derived metadataBase,
// the layout's title template) is not pure-testable — covered by review +
// the orchestrator's build/curl gates, per the spec's verify list.
// Run: npx tsx scripts/5d-a-verify.ts
import { buildPortfolioMetadata, isPubliclyIndexable } from '../src/lib/metadata';
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

// Minimal valid doc factories — only the fields the helpers read.
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

console.log('— title chain: hero name → heading → first tab label → Portfolio —');
const named = makeDoc([tab('t', 'Home', [hero({ name: 'Jane Doe', heading: 'Heading Title' })])]);
check('hero name wins over heading', buildPortfolioMetadata(named).title === 'Jane Doe');
const headingOnly = makeDoc([tab('t', 'Home', [hero({ name: '   ', heading: 'Heading Title' })])]);
check('blank name falls to hero heading', buildPortfolioMetadata(headingOnly).title === 'Heading Title');
const noHero = makeDoc([tab('t', 'Contact', [richText('<p>text</p>')])]);
check('no hero -> first tab label', buildPortfolioMetadata(noHero).title === 'Contact');
check('empty tabs -> "Portfolio"', buildPortfolioMetadata(makeDoc([])).title === 'Portfolio');
const blankHero = makeDoc([tab('t', 'Solo', [hero({ name: '', heading: '' })])]);
check('blank hero falls through to tab label', buildPortfolioMetadata(blankHero).title === 'Solo');
const heroSecondTab = makeDoc([
  tab('a', 'Alpha', [richText('<p>x</p>')]),
  tab('b', 'Beta', [hero({ name: 'Second Tab Hero' })]),
]);
check('hero found across later tabs (first one decides)', buildPortfolioMetadata(heroSecondTab).title === 'Second Tab Hero');

console.log('— description chain: subheading → heading → rich_text strip → omitted —');
const sub = makeDoc([tab('t', 'T', [hero({ subheading: 'Short bio', heading: 'Heading Desc' })])]);
check('subheading wins', buildPortfolioMetadata(sub).description === 'Short bio');
const headingDesc = makeDoc([tab('t', 'T', [hero({ subheading: '  ', heading: 'Heading Desc' })])]);
check('blank subheading falls to heading', buildPortfolioMetadata(headingDesc).description === 'Heading Desc');
const rtOnly = makeDoc([tab('t', 'T', [richText('<p>Plain text here</p>')])]);
check('no hero -> first rich_text stripped', buildPortfolioMetadata(rtOnly).description === 'Plain text here');
const nothing = makeDoc([tab('t', 'T', [hero({ subheading: '', heading: '' })])]);
const nothingMeta = buildPortfolioMetadata(nothing);
check('nothing yields text -> description key OMITTED (never null/undefined-valued)', !('description' in nothingMeta));
check('absent description reads as undefined', nothingMeta.description === undefined);
const firstEmpty = makeDoc([tab('t', 'T', [richText('<p></p>'), richText('<p>Second</p>')])]);
check('first rich_text decides — a later one never rescues it', !('description' in buildPortfolioMetadata(firstEmpty)));
const headingVsRt = makeDoc([tab('t', 'T', [hero({ subheading: '', heading: 'Hero Heading' }), richText('<p>Rich text body</p>')])]);
check('blank subheading: heading beats rich_text (order pinned)', buildPortfolioMetadata(headingVsRt).description === 'Hero Heading');

console.log('— rich_text summary: tag stripping + whitespace collapse + 160 cap —');
const messy = makeDoc([tab('t', 'T', [richText('<h2>Local-first</h2>\n<p>One   document,</p><p>two   halves</p>')])]);
check(
  'tags become separators, whitespace collapses',
  buildPortfolioMetadata(messy).description === 'Local-first One document, two halves',
  JSON.stringify(buildPortfolioMetadata(messy).description),
);
const long = 'a'.repeat(300);
const capped = makeDoc([tab('t', 'T', [richText(`<p>${long}</p>`)])]);
check('hard cap: exactly 160 chars', buildPortfolioMetadata(capped).description?.length === 160);
check('cap is a plain slice (no ellipsis added)', buildPortfolioMetadata(capped).description === long.slice(0, 160));
const onlyTags = makeDoc([tab('t', 'T', [richText('<p></p><br><hr/>')])]);
check('rich_text stripping to nothing -> omitted', !('description' in buildPortfolioMetadata(onlyTags)));

console.log('— openGraph image absolute-ization —');
const relWithBase = buildPortfolioMetadata(
  makeDoc([tab('t', 'T', [hero({ thumbnail: '/images/me.jpg' })])]),
  { baseUrl: 'https://acme.com' },
);
check(
  'root-relative + baseUrl -> absolute',
  relWithBase.openGraph.images?.[0] === 'https://acme.com/images/me.jpg',
  JSON.stringify(relWithBase.openGraph.images),
);
check('images is a single-entry array', Array.isArray(relWithBase.openGraph.images) && relWithBase.openGraph.images.length === 1);
const relNoBase = buildPortfolioMetadata(makeDoc([tab('t', 'T', [hero({ thumbnail: '/images/me.jpg' })])]));
check('root-relative WITHOUT baseUrl -> images key OMITTED', !('images' in relNoBase.openGraph));
const protocolRelative = buildPortfolioMetadata(
  makeDoc([tab('t', 'T', [hero({ thumbnail: '//cdn.example.com/me.jpg' })])]),
  { baseUrl: 'https://acme.com' },
);
check('protocol-relative //host — never joined onto baseUrl', !('images' in protocolRelative.openGraph));
const relSlashedBase = buildPortfolioMetadata(
  makeDoc([tab('t', 'T', [hero({ thumbnail: '/images/me.jpg' })])]),
  { baseUrl: 'https://acme.com/' },
);
check(
  'baseUrl trailing slash stripped (no // join)',
  relSlashedBase.openGraph.images?.[0] === 'https://acme.com/images/me.jpg',
  JSON.stringify(relSlashedBase.openGraph.images),
);
const absolute = buildPortfolioMetadata(
  makeDoc([tab('t', 'T', [hero({ thumbnail: 'https://cdn.example.com/x.png' })])]),
  { baseUrl: 'https://acme.com' },
);
check('absolute thumbnail passes through (baseUrl ignored)', absolute.openGraph.images?.[0] === 'https://cdn.example.com/x.png');
const emptyThumb = buildPortfolioMetadata(
  makeDoc([tab('t', 'T', [hero({ thumbnail: '' })])]),
  { baseUrl: 'https://acme.com' },
);
check('empty thumbnail -> no images key', !('images' in emptyThumb.openGraph));

console.log('— openGraph composition —');
check("og:type is 'website'", relWithBase.openGraph.type === 'website');
check('og:title mirrors the title', relWithBase.openGraph.title === relWithBase.title);
check('og:description mirrors the description', relWithBase.openGraph.description === relWithBase.description);
const bare = buildPortfolioMetadata(makeDoc([]));
check('og:description omitted with the top-level one', !('description' in bare.openGraph));
check('og:url = baseUrl when provided', relWithBase.openGraph.url === 'https://acme.com');
check('og:url omitted without baseUrl', !('url' in relNoBase.openGraph));

console.log('— twitter card selection + mirroring —');
check('image resolved -> summary_large_image', relWithBase.twitter.card === 'summary_large_image');
check('no image -> summary', bare.twitter.card === 'summary');
check('twitter:title mirrors the title', bare.twitter.title === 'Portfolio');
const described = makeDoc([tab('t', 'T', [hero({ name: 'Jane', subheading: 'Bio' })])]);
const describedMeta = buildPortfolioMetadata(described);
check('twitter:description mirrors', describedMeta.twitter.description === 'Bio');
// Blank heading AND subheading (the factory defaults would otherwise feed
// the chain) — nothing yields text, so the field stays omitted everywhere.
const undescribed = makeDoc([tab('t', 'T', [hero({ name: 'Jane', subheading: '', heading: '' })])]);
const undescribedMeta = buildPortfolioMetadata(undescribed);
check('twitter:description omitted with the top-level one', !('description' in undescribedMeta.twitter));

console.log('— isPubliclyIndexable (5e-a default: absent = private) —');
check("explicit 'public' -> true", isPubliclyIndexable(makeDoc([], { visibility: 'public' })) === true);
check('absent -> false', isPubliclyIndexable(makeDoc([])) === false);
check("explicit 'private' -> false", isPubliclyIndexable(makeDoc([], { visibility: 'private' })) === false);

console.log('— degenerate docs never throw —');
function safeTitle(doc: PortfolioData): string {
  try {
    return buildPortfolioMetadata(doc).title;
  } catch {
    return '<threw>';
  }
}
check('empty tabs doc -> "Portfolio"', safeTitle(makeDoc([])) === 'Portfolio');
check('tab with no blocks -> tab label', safeTitle(makeDoc([tab('t', 'Solo', [])])) === 'Solo');
const stub = { version: 3 } as unknown as PortfolioData;
check('cast stub doc (no tabs/theme/cards) -> "Portfolio"', safeTitle(stub) === 'Portfolio');
const undefinedTabs = { version: 3, tabs: undefined } as unknown as PortfolioData;
check('explicit undefined tabs -> "Portfolio"', safeTitle(undefinedTabs) === 'Portfolio');
check('isPubliclyIndexable on the stub -> false (no throw)', isPubliclyIndexable(stub) === false);
const degenerateMeta = buildPortfolioMetadata(makeDoc([]));
check("degenerate output stays well-formed (type 'website')", degenerateMeta.openGraph.type === 'website');
check('degenerate twitter card is still one of the two variants', degenerateMeta.twitter.card === 'summary');

console.log('— seed sanity (content/portfolio.json — expectations derived from the doc itself) —');
const seedMeta = buildPortfolioMetadata(initialData);
const seedHero = initialData.tabs
  .flatMap((t) => t.blocks)
  .find((b): b is FeaturedHeroBlock => b.type === 'featured_hero');
const expectedSeedTitle =
  seedHero && seedHero.name !== undefined && seedHero.name.trim() !== ''
    ? seedHero.name
    : seedHero && seedHero.heading.trim() !== ''
      ? seedHero.heading
      : 'Portfolio';
check('seed title follows the chain on real data', seedMeta.title === expectedSeedTitle, seedMeta.title);
check(
  'seed description = the hero subheading (subheading non-empty)',
  seedMeta.description === (seedHero?.subheading.trim() ? seedHero.subheading : undefined),
);
check('seed og:title mirrors the seed title', seedMeta.openGraph.title === seedMeta.title);
check('seed twitter:title mirrors the seed title', seedMeta.twitter.title === seedMeta.title);
check('seed og:url omitted (no baseUrl passed)', !('url' in seedMeta.openGraph));
check(
  'seed og:image omitted while the thumbnail is root-relative (no baseUrl)',
  (seedHero?.thumbnail ?? '').startsWith('/') ? !('images' in seedMeta.openGraph) : true,
);
check('seed twitter card is one of the two variants', seedMeta.twitter.card === 'summary' || seedMeta.twitter.card === 'summary_large_image');
check('seed (visibility absent) is not publicly indexable', isPubliclyIndexable(initialData) === false);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
