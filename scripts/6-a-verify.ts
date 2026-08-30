// 6-a rendering sweep verify — PURE function checks + static file greps:
// no servers, no DOM, no .env reads (safe to run alongside the dev server).
// Covers: marqueeRepeatCount property sweep (seamlessness, minimality,
// min-count, degenerate inputs), the numeric SPEED_SECONDS table, duration
// math, and the static threading/gates this chunk shipped.
// Run: npx tsx scripts/6-a-verify.ts
import { readFileSync } from 'node:fs';
import { SPEED_SECONDS, marqueeRepeatCount } from '../src/components/blocks/designs/marquee/shared';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function readSrc(rel: string): string {
  return readFileSync(`src/${rel}`, 'utf8');
}

console.log('— SPEED_SECONDS table —');
check(
  'SPEED_SECONDS: values are exactly { slow: 60, normal: 36, fast: 20 }',
  SPEED_SECONDS.slow === 60 && SPEED_SECONDS.normal === 36 && SPEED_SECONDS.fast === 20,
  JSON.stringify(SPEED_SECONDS),
);
check(
  'SPEED_SECONDS: exactly the MarqueeSpeed keys',
  Object.keys(SPEED_SECONDS).length === 3 && Object.keys(SPEED_SECONDS).sort().join(',') === 'fast,normal,slow',
  JSON.stringify(Object.keys(SPEED_SECONDS)),
);
check(
  'SPEED_SECONDS: monotonic slow > normal > fast',
  SPEED_SECONDS.slow > SPEED_SECONDS.normal && SPEED_SECONDS.normal > SPEED_SECONDS.fast,
);
check(
  'SPEED_SECONDS: numeric (no string durations left over)',
  Object.values(SPEED_SECONDS).every((value) => typeof value === 'number'),
);

console.log('— duration math = base × count —');
type MarqueeSpeedKey = keyof typeof SPEED_SECONDS;
// Hand-written literals (not the formula) so the check stays honest.
const durationTable: Array<[MarqueeSpeedKey, number, string]> = [
  ['slow', 4, '240s'],
  ['normal', 4, '144s'],
  ['fast', 4, '80s'],
  ['normal', 5, '180s'],
  ['fast', 16, '320s'],
  ['slow', 61, '3660s'],
];
for (const [speed, count, expected] of durationTable) {
  const duration = `${SPEED_SECONDS[speed] * count}s`;
  check(
    `duration: ${speed} × ${count} = ${expected}`,
    duration === expected,
    duration,
  );
}
let monotoneInCount = true;
for (const speed of Object.keys(SPEED_SECONDS) as MarqueeSpeedKey[]) {
  for (let count = 4; count < 40; count++) {
    if (SPEED_SECONDS[speed] * (count + 1) <= SPEED_SECONDS[speed] * count) {
      monotoneInCount = false;
    }
  }
}
check('duration: monotone in count (base × n strictly grows)', monotoneInCount);

console.log('— marqueeRepeatCount: degenerate inputs → minCount —');
const degenerateInputs = [0, -1, -1000, NaN, Infinity];
let degenerateOk = true;
for (const container of degenerateInputs) {
  if (marqueeRepeatCount(container, 500) !== 4) degenerateOk = false;
}
for (const run of degenerateInputs) {
  if (marqueeRepeatCount(1280, run) !== 4) degenerateOk = false;
}
check('degenerate widths (0 / negative / NaN / Infinity) → default minCount 4', degenerateOk);
check(
  'degenerate widths honor a custom minCount',
  [0, -1, NaN, Infinity].every(
    (bad) =>
      marqueeRepeatCount(bad, 500, 7) === 7 &&
      marqueeRepeatCount(1280, bad, 7) === 7,
  ),
);
check(
  'default minCount is 4 (absent third argument)',
  marqueeRepeatCount(100, 1000) === 4 && marqueeRepeatCount(320, 1000) === 4,
);

console.log('— marqueeRepeatCount: property sweep 320–3840 × 40–2000 —');
// Float-safe: integer inputs multiply exactly below 2^53, but the ≥
// comparison keeps an epsilon per the spec.
const EPS = 1e-9;
const containers: number[] = [];
for (let c = 320; c <= 3840; c += 16) containers.push(c);
const runs: number[] = [];
for (let r = 40; r <= 2000; r += 4) runs.push(r);

let filled = true;
let floored = true; // minimality: can never shrink unless already at minCount
let minHonored = true;
for (const container of containers) {
  for (const run of runs) {
    const count = marqueeRepeatCount(container, run);
    if (count < 4) minHonored = false;
    if (count * run + EPS < container) filled = false;
    if (count > 4 && (count - 1) * run + EPS >= container) floored = false;
  }
}
check(
  `seamlessness: count × runWidth ≥ containerWidth for ${containers.length * runs.length} combos`,
  filled,
);
check(
  'minimality: (count − 1) × runWidth < containerWidth unless count = minCount',
  floored,
);
check('min-count honored: count ≥ 4 across the sweep', minHonored);

let customOk = true;
for (const minCount of [1, 5, 7, 25]) {
  for (let c = 320; c <= 3840; c += 480) {
    for (let r = 40; r <= 2000; r += 240) {
      const count = marqueeRepeatCount(c, r, minCount);
      if (count < minCount) customOk = false;
      if (c <= minCount * r && count !== minCount) customOk = false;
      if (c > minCount * r && count * r + EPS < c) customOk = false;
    }
  }
}
check('custom minCount honored across a coarse sweep', customOk);

console.log('— static: placeholder threading (PortfolioView → BlockRenderer → designs) —');
const portfolioView = readSrc('components/PortfolioView.tsx');
check(
  'PortfolioView: passes showMediaPlaceholders={canEdit} to BlockRenderer',
  portfolioView.includes('showMediaPlaceholders={canEdit}'),
);
const hostedView = readSrc('components/hosted/HostedPortfolioView.tsx');
check(
  'HostedPortfolioView: does NOT pass showMediaPlaceholders (public = hidden)',
  !hostedView.includes('showMediaPlaceholders'),
);
const blockRenderer = readSrc('components/blocks/BlockRenderer.tsx');
check(
  'BlockRenderer: declares optional showMediaPlaceholders prop',
  blockRenderer.includes('showMediaPlaceholders?: boolean'),
);
check(
  'BlockRenderer: threads it into FeaturedHeroBlock as showMediaPlaceholder',
  blockRenderer.includes('showMediaPlaceholder={showMediaPlaceholders}'),
);
const featuredHeroBlock = readSrc('components/blocks/FeaturedHeroBlock.tsx');
check(
  'FeaturedHeroBlock: forwards showMediaPlaceholder to the design',
  featuredHeroBlock.includes('showMediaPlaceholder={showMediaPlaceholder}'),
);
const heroTypes = readSrc('components/blocks/designs/types.ts');
check(
  'types: HeroDesignProps.showMediaPlaceholder?: boolean',
  heroTypes.includes('showMediaPlaceholder?: boolean'),
);

console.log('— static: hero placeholder gates —');
for (const hero of ['DefaultHero', 'CutieHero', 'EditorialHero', 'RisoHero']) {
  const source = readSrc(`components/blocks/designs/hero/${hero}.tsx`);
  check(
    `${hero}: gates the absent-thumbnail branch on showMediaPlaceholder`,
    source.includes('showMediaPlaceholder ?') && source.includes(') : null;'),
  );
  check(
    `${hero}: HeroPlaceholder still renders when the gate is open`,
    source.includes('HeroPlaceholder'),
  );
}

console.log('— static: riso hero media positions —');
const risoHero = readSrc('components/blocks/designs/hero/RisoHero.tsx');
check(
  'RisoHero: top branch still renders media then mt-8 copy',
  risoHero.includes('{media}') &&
    risoHero.indexOf('<div className="mt-8">{copy}</div>') !== -1 &&
    risoHero.indexOf('{media}') < risoHero.indexOf('<div className="mt-8">{copy}</div>'),
);
const bottomMediaIndex = risoHero.indexOf('<div className="mt-8">{media}</div>');
const topCopyIndex = risoHero.indexOf('<div className="mt-8">{copy}</div>');
check(
  'RisoHero: bottom branch renders media after copy in an mt-8 wrapper',
  risoHero.includes('{media && ') && bottomMediaIndex > topCopyIndex,
  `bottom at ${bottomMediaIndex}, top at ${topCopyIndex}`,
);
check(
  'RisoHero: keeps the mediaPosition === "top" branch structure',
  risoHero.includes("block.mediaPosition === 'top'"),
);

console.log('— static: marquee designs are thin skins over MarqueeTrack —');
for (const marquee of ['DefaultMarquee', 'CutieMarquee', 'EditorialMarquee', 'RisoMarquee']) {
  const source = readSrc(`components/blocks/designs/marquee/${marquee}.tsx`);
  check(
    `${marquee}: renders the shared MarqueeTrack`,
    source.includes('<MarqueeTrack') && source.includes('speed={block.speed ?? \'normal\'}'),
  );
  check(
    `${marquee}: no per-design loop mechanics left (track div / duration var)`,
    !source.includes('marquee-track') && !source.includes('--marquee-duration') && !source.includes('SPEED_'),
  );
  check(
    `${marquee}: keeps the empty-items early return`,
    source.includes('block.items.length === 0'),
  );
}
const marqueeShared = readSrc('components/blocks/designs/marquee/shared.tsx');
check(
  'marquee/shared: exports MarqueeTrack, marqueeRepeatCount, SPEED_SECONDS',
  marqueeShared.includes('export function MarqueeTrack') &&
    marqueeShared.includes('export function marqueeRepeatCount') &&
    marqueeShared.includes('export const SPEED_SECONDS'),
);
check(
  'marquee/shared: string SPEED_DURATION is gone (no dead exports)',
  !marqueeShared.includes('SPEED_DURATION'),
);
check(
  'marquee/shared: track carries the count-scaled --marquee-duration',
  marqueeShared.includes("'--marquee-duration'") &&
    marqueeShared.includes('SPEED_SECONDS[speed] * count'),
);
check(
  'marquee/shared: count starts at the SSR/no-JS default 4, grow-only',
  marqueeShared.includes('const MIN_REPEAT = 4') &&
    marqueeShared.includes('useState(MIN_REPEAT)') &&
    marqueeShared.includes('Math.max(\n          current,'),
);
check(
  'marquee/shared: measurement rides the ResizeObserver callback, never the effect body',
  marqueeShared.includes('const observer = new ResizeObserver(measure)') &&
    // every setCount call in the module uses the updater form inside measure
    !/setCount\((?!\(current\))/.test(marqueeShared),
);

console.log('— static: globals.css untouched (keyframes still own the loop) —');
const globals = readFileSync('src/app/globals.css', 'utf8');
check(
  'globals.css: translateX(-50%) keyframes + duration var intact',
  globals.includes('translateX(-50%)') && globals.includes('var(--marquee-duration, 36s)'),
);
check(
  'globals.css: reduced-motion static fallback intact',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.marquee-track \{\s*animation: none;/.test(globals),
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
