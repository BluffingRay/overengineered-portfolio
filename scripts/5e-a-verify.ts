// 5e-a foundation verify — PURE function checks only: no servers, no KV
// calls, no .env reads (safe to run alongside the dev server).
// Covers: normalizeSlug matrix, prepareDocument meta sanitizers, parseIndex
// robustness, deriveIndexEntry/mergeIndexEntry, and absent-meta serialization.
// Run: npx tsx scripts/5e-a-verify.ts
import { prepareDocument } from '../src/lib/storage';
import { normalizeSlug, RESERVED_SLUGS } from '../src/types/schema';
import {
  deriveIndexEntry,
  mergeIndexEntry,
  parseIndex,
  type PortfolioIndex,
  type PortfolioIndexEntry,
} from '../src/lib/portfolioIndex';
import { initialData } from '../src/data/initialData';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const baseDoc = () => structuredClone(initialData);

console.log('— normalizeSlug matrix —');
const slugMatrix: Array<[string, unknown, string | null]> = [
  ['valid', 'jane-doe', 'jane-doe'],
  ['upper -> lower', 'Jane-Doe', 'jane-doe'],
  ['trim', '  jane-doe  ', 'jane-doe'],
  ['3 chars (lower bound)', 'abc', 'abc'],
  ['40 chars (upper bound)', 'a'.repeat(40), 'a'.repeat(40)],
  ['2 chars (too short)', 'ab', null],
  ['41 chars (too long)', 'a'.repeat(41), null],
  ['leading hyphen', '-jane', null],
  ['trailing hyphen', 'jane-', null],
  ['invalid chars (underscore)', 'jane_doe', null],
  ['invalid chars (space)', 'jane doe', null],
  ['non-string: number', 5, null],
  ['non-string: object', {}, null],
  ['non-string: null', null, null],
  ['non-string: undefined', undefined, null],
];
for (const [name, input, expected] of slugMatrix) {
  check(`normalizeSlug: ${name}`, normalizeSlug(input) === expected, String(normalizeSlug(input)));
}
for (const word of RESERVED_SLUGS) {
  check(`normalizeSlug: reserved '${word}'`, normalizeSlug(word) === null);
}

console.log('— prepareDocument meta sanitizers —');
const good = prepareDocument({ ...baseDoc(), slug: 'jane-doe', visibility: 'public', showcase: true });
check('valid meta: doc prepared', good !== null);
check('valid meta: slug kept', good?.slug === 'jane-doe', String(good?.slug));
check('valid meta: visibility kept', good?.visibility === 'public', String(good?.visibility));
check('valid meta: showcase kept', good?.showcase === true, String(good?.showcase));

const bad = prepareDocument({ ...baseDoc(), slug: 'Bad Slug!', visibility: 'friends', showcase: 'yes' });
check('invalid meta: bad slug dropped (absent, not null)', bad?.slug === undefined, String(bad?.slug));
check('invalid meta: bad visibility dropped (absent, not null)', bad?.visibility === undefined, String(bad?.visibility));
check('invalid meta: bad showcase dropped (absent, not null)', bad?.showcase === undefined, String(bad?.showcase));

const collapsed = prepareDocument({ ...baseDoc(), visibility: 'private' });
check("default visibility 'private' stored as absent", collapsed?.visibility === undefined, String(collapsed?.visibility));

console.log('— parseIndex —');
check('parseIndex: null -> {}', Object.keys(parseIndex(null)).length === 0, JSON.stringify(parseIndex(null)));
check('parseIndex: bad JSON -> {}', Object.keys(parseIndex('not json{')).length === 0);
check('parseIndex: array -> {}', Object.keys(parseIndex('[]')).length === 0);
check('parseIndex: primitive -> {}', Object.keys(parseIndex('42')).length === 0);
check('parseIndex: empty string -> {}', Object.keys(parseIndex('')).length === 0);
const malformed = parseIndex(JSON.stringify({ '': { slug: 'x' }, a: 'nope', b: null, c: ['arr'] }));
check('parseIndex: malformed entries dropped', Object.keys(malformed).length === 0, JSON.stringify(malformed));
const coerced = parseIndex(
  JSON.stringify({ uid: { slug: 5, visibility: 'weird', showcase: 'yes', updatedAt: 'x' } }),
);
check(
  'parseIndex: garbage fields coerced to defaults',
  JSON.stringify(coerced['uid']) ===
    JSON.stringify({ slug: null, visibility: 'private', showcase: false, updatedAt: 0 }),
  JSON.stringify(coerced['uid']),
);
const goodIndex = parseIndex(
  JSON.stringify({ 'uid-1': { slug: 'jane', visibility: 'public', showcase: true, updatedAt: 123 } }),
);
check(
  'parseIndex: good entry survives',
  goodIndex['uid-1']?.slug === 'jane' &&
    goodIndex['uid-1']?.visibility === 'public' &&
    goodIndex['uid-1']?.showcase === true &&
    goodIndex['uid-1']?.updatedAt === 123,
  JSON.stringify(goodIndex),
);

console.log('— deriveIndexEntry / mergeIndexEntry —');
const plainForIndex = prepareDocument(baseDoc());
check('deriveIndexEntry: doc prepared', plainForIndex !== null);
if (plainForIndex) {
  const derived = deriveIndexEntry('uid-a', plainForIndex, 1000);
  check(
    'deriveIndexEntry: no meta -> null slug / private / not shown',
    derived.slug === null && derived.visibility === 'private' && derived.showcase === false && derived.updatedAt === 1000,
    JSON.stringify(derived),
  );
}
const metaForIndex = prepareDocument({ ...baseDoc(), slug: 'jane-doe', visibility: 'public', showcase: true });
check('deriveIndexEntry: meta doc prepared', metaForIndex !== null);
if (metaForIndex) {
  const derived = deriveIndexEntry('uid-a', metaForIndex, 1000);
  check(
    'deriveIndexEntry: meta doc -> slug / public / shown',
    derived.slug === 'jane-doe' && derived.visibility === 'public' && derived.showcase === true && derived.updatedAt === 1000,
    JSON.stringify(derived),
  );
}
const entryA: PortfolioIndexEntry = { slug: 'alpha', visibility: 'private', showcase: false, updatedAt: 1 };
const entryB: PortfolioIndexEntry = { slug: null, visibility: 'public', showcase: true, updatedAt: 2 };
const index: PortfolioIndex = { 'uid-a': entryA };
const merged = mergeIndexEntry(index, 'uid-b', entryB);
check('mergeIndexEntry: returns a new object', merged !== index);
check('mergeIndexEntry: new uid added', merged['uid-b'] === entryB);
check(
  'mergeIndexEntry: other uids untouched',
  JSON.stringify(merged['uid-a']) === JSON.stringify(entryA),
  JSON.stringify(merged['uid-a']),
);
check(
  'mergeIndexEntry: original index not mutated',
  index['uid-b'] === undefined && JSON.stringify(index['uid-a']) === JSON.stringify(entryA),
);

console.log('— serialization (absent meta = no keys) —');
const plainJson = JSON.stringify(prepareDocument(baseDoc()));
check(
  'doc without meta: no slug/visibility/showcase keys in JSON',
  !plainJson.includes('"slug"') && !plainJson.includes('"visibility"') && !plainJson.includes('"showcase"'),
);
const metaJson = JSON.stringify(prepareDocument({ ...baseDoc(), slug: 'jane-doe', visibility: 'public', showcase: true }));
const back = prepareDocument(JSON.parse(metaJson));
check(
  'doc with meta: round-trips through JSON + prepareDocument',
  back?.slug === 'jane-doe' && back?.visibility === 'public' && back?.showcase === true,
  metaJson.slice(0, 120),
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
