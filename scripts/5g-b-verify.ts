// 5g-b sitemap-helper verify — PURE function checks only: no servers, no
// KV calls, no .env reads (safe to run alongside the dev server).
// Covers publicSitemapEntries: public+slug inclusion (showcase opt-in NOT
// required — a showcase-off public portfolio IS included), private and
// slugless skips, malformed entries skipped without throwing, updatedAt-
// desc ordering with Object.entries order preserved on ties, empty index,
// lastModified passthrough, and purity (no index mutation).
// NOTE: the route wiring (base URL fallback, revalidate, try/catch
// degrade to root-only) is wiring, not pure-testable — covered by review
// + the orchestrator's build/curl gates, per docs/specs/5g-b-badge-sitemap.md.
// Run: npx tsx scripts/5g-b-verify.ts
import {
  publicSitemapEntries,
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

const entry = (
  slug: string | null,
  overrides: Partial<PortfolioIndexEntry> = {},
): PortfolioIndexEntry => ({
  slug,
  visibility: 'public',
  showcase: false,
  updatedAt: 1,
  ...overrides,
});

console.log('— inclusion matrix (public + slug; showcase NOT required) —');
const index: PortfolioIndex = {
  'uid-public-slug': entry('jane-doe', { updatedAt: 500 }),
  'uid-public-noslug': entry(null, { updatedAt: 900 }),
  'uid-private-slug': entry('private-jane', {
    visibility: 'private',
    updatedAt: 800,
  }),
  'uid-showcase-off': entry('showcase-off', { showcase: false, updatedAt: 300 }),
  'uid-showcase-on': entry('showcase-on', { showcase: true, updatedAt: 400 }),
};

const result = publicSitemapEntries(index);
check(
  'public + slug + showcase-off IS included (showcase opt-in not required)',
  result.some((e) => e.slug === 'showcase-off'),
);
check(
  'public + slug + showcase-on included',
  result.some((e) => e.slug === 'showcase-on'),
);
check('private entry skipped', !result.some((e) => e.slug === 'private-jane'));
check(
  'slugless entry skipped (newer updatedAt must not smuggle it in)',
  !result.some((e) => e.slug === null),
);
check(
  'exactly the expected slugs come out',
  JSON.stringify(result.map((e) => e.slug).sort()) ===
    JSON.stringify(['jane-doe', 'showcase-off', 'showcase-on']),
  JSON.stringify(result.map((e) => e.slug)),
);
check(
  'lastModified = updatedAt passthrough',
  result.find((e) => e.slug === 'jane-doe')?.lastModified === 500,
);

console.log('— ordering: updatedAt desc, ties keep Object.entries order —');
check(
  'sorted newest first',
  result.map((e) => e.lastModified).join(',') === '500,400,300',
  result.map((e) => e.lastModified).join(','),
);
const tieIndex: PortfolioIndex = {
  'uid-z': entry('z-slug', { updatedAt: 7 }),
  'uid-a': entry('a-slug', { updatedAt: 7 }),
};
check(
  'equal updatedAt keeps insertion order (stable sort)',
  publicSitemapEntries(tieIndex).map((e) => e.slug).join(',') === 'z-slug,a-slug',
);

console.log('— malformed entries skipped, never throws —');
const garbage = {
  'uid-ok': entry('good-slug'),
  'uid-null': null,
  'uid-number': 42,
  'uid-partial': { slug: 'partial-slug' },
  'uid-badslug': { slug: 42, visibility: 'public', showcase: true, updatedAt: 1 },
  'uid-badvis': { slug: 'vis-slug', visibility: 'secret', showcase: true, updatedAt: 1 },
  'uid-noupdated': { slug: 'nostamp-slug', visibility: 'public', showcase: false },
} as unknown as PortfolioIndex;
const garbageResult = publicSitemapEntries(garbage);
check(
  'only well-formed entries survive (missing updatedAt coerces to 0)',
  garbageResult.length === 2 &&
    garbageResult.some((e) => e.slug === 'good-slug') &&
    garbageResult.some((e) => e.slug === 'nostamp-slug' && e.lastModified === 0),
  JSON.stringify(garbageResult),
);

console.log('— empty index —');
check('empty index -> []', publicSitemapEntries({}).length === 0);
check(
  'all-private index -> []',
  publicSitemapEntries({ 'uid-x': entry('x', { visibility: 'private' }) })
    .length === 0,
);

console.log('— purity (no mutation) —');
const before = JSON.stringify(index);
const keysBefore = Object.keys(index).join(',');
publicSitemapEntries(index);
publicSitemapEntries(garbage);
check(
  'indexes unchanged after scans (value + key order)',
  JSON.stringify(index) === before && Object.keys(index).join(',') === keysBefore,
);
check(
  'result is a fresh array (never a shared reference)',
  publicSitemapEntries(index) !== publicSitemapEntries(index),
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
