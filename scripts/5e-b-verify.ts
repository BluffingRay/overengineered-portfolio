// 5e-b slug-resolution verify — PURE function checks only: no servers, no
// KV calls, no .env reads (safe to run alongside the dev server).
// Covers the matchSlugInIndex matrix: exact hit, case-insensitive hit,
// miss, empty index, null-slug entries never matching, corrupted duplicate
// slugs resolving deterministically, and purity (no index mutation).
// NOTE: the page's resolution ORDER (registry-first -> uid doc -> legacy
// uid-slug fallback -> 404) is wiring, not pure-testable — covered by
// review + live checks, per docs/specs/5e-b-slug-resolution.md.
// Run: npx tsx scripts/5e-b-verify.ts
import {
  matchSlugInIndex,
  type PortfolioIndex,
  type PortfolioIndexEntry,
} from '../src/lib/portfolioIndex';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const entry = (slug: string | null): PortfolioIndexEntry => ({
  slug,
  visibility: 'public',
  showcase: true,
  updatedAt: 1,
});

console.log('— matchSlugInIndex matrix —');
const index: PortfolioIndex = {
  'uid-null': entry(null),
  'uid-a': entry('jane-doe'),
  'uid-b': entry('other-slug'),
};

check('exact hit', matchSlugInIndex(index, 'jane-doe') === 'uid-a', String(matchSlugInIndex(index, 'jane-doe')));
check(
  'case-insensitive hit (requested slug lowercased)',
  matchSlugInIndex(index, 'Jane-Doe') === 'uid-a',
  String(matchSlugInIndex(index, 'Jane-Doe')),
);
check('miss -> null', matchSlugInIndex(index, 'not-taken') === null);
check('empty request -> null', matchSlugInIndex(index, '') === null);
check('empty index -> null', matchSlugInIndex({}, 'jane-doe') === null);

console.log('— null-slug entries never match —');
const onlyNull: PortfolioIndex = { 'uid-n': entry(null) };
check('null-slug-only index: nothing matches', matchSlugInIndex(onlyNull, 'anything') === null);
check(
  'null-slug entry skipped, later real hit still found',
  matchSlugInIndex(index, 'other-slug') === 'uid-b',
  String(matchSlugInIndex(index, 'other-slug')),
);

console.log('— corrupted duplicate slug (PUT 409 prevents; deterministic if hit) —');
const dupZFirst: PortfolioIndex = { 'uid-z': entry('dup'), 'uid-a': entry('dup') };
check(
  'duplicate slug -> FIRST match in Object.entries order (insertion, not sorted)',
  matchSlugInIndex(dupZFirst, 'dup') === 'uid-z',
  String(matchSlugInIndex(dupZFirst, 'dup')),
);
const dupAFirst: PortfolioIndex = { 'uid-a': entry('dup'), 'uid-z': entry('dup') };
check(
  'winner flips with insertion order (proves entries-order determinism)',
  matchSlugInIndex(dupAFirst, 'dup') === 'uid-a',
  String(matchSlugInIndex(dupAFirst, 'dup')),
);

console.log('— stored slugs trusted lowercase (normalizeSlug at write time) —');
const corruptUpper: PortfolioIndex = { 'uid-u': entry('Jane-Doe') };
check(
  'corrupt uppercase stored slug does NOT silently match (surfaces as a miss)',
  matchSlugInIndex(corruptUpper, 'jane-doe') === null,
);

console.log('— purity (no mutation) —');
const before = JSON.stringify(index);
const keysBefore = Object.keys(index).join(',');
matchSlugInIndex(index, 'jane-doe');
matchSlugInIndex(index, 'MISS');
check(
  'index unchanged after scans (value + key order)',
  JSON.stringify(index) === before && Object.keys(index).join(',') === keysBefore,
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
