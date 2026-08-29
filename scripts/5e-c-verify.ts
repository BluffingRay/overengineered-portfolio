// 5e-c dashboard verify — PURE function checks only: no servers, no KV
// calls, no .env reads (safe to run alongside the dev server).
// Covers: deriveIndexEntry title capture (name wins over heading; neither
// -> null; no hero -> null; FIRST hero decides), parseIndex title
// keep/coerce/drop + old entries staying valid (byte-identical to the 5e-a
// shapes), and the filterShowcase matrix (public+showcase kept; private /
// showcase=false / null-slug excluded; caller excluded; updatedAt desc
// sort; purity — no index mutation).
// Run: npx tsx scripts/5e-c-verify.ts
import {
  deriveIndexEntry,
  filterShowcase,
  parseIndex,
  type PortfolioIndex,
  type PortfolioIndexEntry,
} from '../src/lib/portfolioIndex';
import { initialData } from '../src/data/initialData';
import type { PortfolioData } from '../src/types/schema';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const titleOf = (e: PortfolioIndexEntry | undefined): string | null =>
  e?.title ?? null;

const hero = (name?: string, heading: string = 'Hello There') => ({
  id: 'b-hero',
  type: 'featured_hero' as const,
  ...(name !== undefined ? { name } : {}),
  heading,
  subheading: '',
  ctaLabel: '',
  ctaHref: '',
  thumbnail: '',
});

function docWithBlocks(blocks: unknown[]): PortfolioData {
  const doc = structuredClone(initialData);
  doc.tabs = [
    {
      id: 'tab-verify',
      label: 'Verify',
      blocks: blocks as PortfolioData['tabs'][number]['blocks'],
    },
  ];
  return doc;
}

console.log('— deriveIndexEntry: title capture —');
check(
  'name wins over heading',
  deriveIndexEntry('u', docWithBlocks([hero('Jane Doe', 'Developer')]), 1).title === 'Jane Doe',
  String(deriveIndexEntry('u', docWithBlocks([hero('Jane Doe', 'Developer')]), 1).title),
);
check(
  'no name -> heading',
  deriveIndexEntry('u', docWithBlocks([hero(undefined, 'Developer')]), 1).title === 'Developer',
);
check(
  'empty-string name -> heading (non-empty rule)',
  deriveIndexEntry('u', docWithBlocks([hero('', 'Developer')]), 1).title === 'Developer',
);
check(
  'whitespace-only name -> heading',
  deriveIndexEntry('u', docWithBlocks([hero('   ', 'Developer')]), 1).title === 'Developer',
);
check(
  'neither name nor heading -> null',
  deriveIndexEntry('u', docWithBlocks([hero('', '')]), 1).title === null,
);
check(
  'no hero block -> null',
  deriveIndexEntry(
    'u',
    docWithBlocks([{ id: 'b-rt', type: 'rich_text', content: '<p>hi</p>' }]),
    1,
  ).title === null,
);
check(
  'FIRST hero decides (later hero with name ignored)',
  deriveIndexEntry(
    'u',
    docWithBlocks([hero(undefined, 'First'), hero('Second Name', 'Second heading')]),
    1,
  ).title === 'First',
);
check(
  'title key always captured (null when empty, per the 5e-c contract)',
  'title' in deriveIndexEntry('u', docWithBlocks([hero('', '')]), 1),
);

console.log('— parseIndex: title —');
const titled = parseIndex(
  JSON.stringify({
    uid: { slug: 'jane', visibility: 'public', showcase: true, updatedAt: 5, title: 'Jane Doe' },
  }),
);
check('title kept (non-empty string)', titleOf(titled['uid']) === 'Jane Doe', JSON.stringify(titled));
const coerced = parseIndex(
  JSON.stringify({
    a: { slug: 'x', visibility: 'public', showcase: true, updatedAt: 1, title: '' },
    b: { slug: 'x', visibility: 'public', showcase: true, updatedAt: 1, title: 42 },
    c: { slug: 'x', visibility: 'public', showcase: true, updatedAt: 1, title: null },
  }),
);
check('empty-string title -> null for consumers', titleOf(coerced['a']) === null);
check('non-string title -> null for consumers', titleOf(coerced['b']) === null);
check('null title -> null for consumers', titleOf(coerced['c']) === null);
check(
  'coerced entries stay byte-identical to the 5e-a shape (no title key added)',
  JSON.stringify(coerced['a']) ===
    JSON.stringify({ slug: 'x', visibility: 'public', showcase: true, updatedAt: 1 }),
  JSON.stringify(coerced['a']),
);
const legacy = parseIndex(
  JSON.stringify({ uid: { slug: 'jane', visibility: 'public', showcase: true, updatedAt: 5 } }),
);
check(
  'old entry without title stays valid',
  titleOf(legacy['uid']) === null &&
    legacy['uid']?.slug === 'jane' &&
    legacy['uid']?.visibility === 'public' &&
    legacy['uid']?.showcase === true &&
    legacy['uid']?.updatedAt === 5,
);
check(
  'unknown fields still dropped',
  !('bogus' in (parseIndex(
    JSON.stringify({ uid: { slug: 'x', visibility: 'public', showcase: true, updatedAt: 1, bogus: 'y' } }),
  )['uid'] ?? {})),
);

console.log('— derive -> JSON -> parse round-trip —');
const derived = deriveIndexEntry('u', docWithBlocks([hero('Jane')]), 3);
const roundTripped = parseIndex(JSON.stringify({ u: derived }));
check('title survives serialization', titleOf(roundTripped['u']) === 'Jane', JSON.stringify(roundTripped['u']));
check(
  'round-tripped entry matches the derived entry',
  JSON.stringify(roundTripped['u']) === JSON.stringify(derived),
  JSON.stringify(roundTripped['u']),
);

console.log('— filterShowcase matrix —');
const entry = (over: Partial<PortfolioIndexEntry> = {}): PortfolioIndexEntry => ({
  slug: 'x',
  visibility: 'public',
  showcase: true,
  updatedAt: 1,
  ...over,
});
const matrix: PortfolioIndex = {
  caller: entry({ slug: 'mine' }),
  keeper: entry({ slug: 'jane', title: 'Jane Doe', updatedAt: 5 }),
  keeperNewest: entry({ slug: 'ado', title: null, updatedAt: 9 }),
  hiddenPrivate: entry({ visibility: 'private', slug: 'priv' }),
  hiddenNotShowcase: entry({ showcase: false, slug: 'nope' }),
  hiddenNoSlug: entry({ slug: null }),
};
const result = filterShowcase(matrix, 'caller');
check('only eligible entries kept (2)', result.length === 2, JSON.stringify(result));
check('caller excluded', result.every((e) => e.uid !== 'caller'));
check('private excluded', result.every((e) => e.uid !== 'hiddenPrivate'));
check('showcase=false excluded', result.every((e) => e.uid !== 'hiddenNotShowcase'));
check('null-slug excluded', result.every((e) => e.uid !== 'hiddenNoSlug'));
check(
  'updatedAt desc sort',
  result[0]?.slug === 'ado' && result[1]?.slug === 'jane',
  JSON.stringify(result.map((e) => e.slug)),
);
check('uid carried (route strips it)', result.every((e) => typeof e.uid === 'string'));
check('title kept when present', result.find((e) => e.slug === 'jane')?.title === 'Jane Doe');
check('title null when absent', result.find((e) => e.slug === 'ado')?.title === null);
check('empty index -> []', filterShowcase({}, 'caller').length === 0);
check('all-excluded -> []', filterShowcase({ caller: entry() }, 'caller').length === 0);
check(
  'different caller changes the exclusion',
  filterShowcase(matrix, 'keeper').some((e) => e.uid === 'caller') &&
    !filterShowcase(matrix, 'keeper').some((e) => e.uid === 'keeper'),
);

console.log('— purity (no mutation) —');
const before = JSON.stringify(matrix);
const keysBefore = Object.keys(matrix).join(',');
filterShowcase(matrix, 'caller');
filterShowcase(matrix, 'keeper');
check(
  'index unchanged after scans (value + key order)',
  JSON.stringify(matrix) === before && Object.keys(matrix).join(',') === keysBefore,
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
