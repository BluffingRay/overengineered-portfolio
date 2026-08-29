// 5e-i delete-portfolio verify — PURE function checks only: no servers, no
// KV/R2 calls, no localStorage, no .env reads (safe to run alongside the
// dev server). Covers removeIndexEntry (removes only the target uid;
// others untouched; missing uid -> unchanged-equivalent; purity; registry
// round-trip through parseIndex) and the pure assetPrefixForUid — the
// per-user folder sanitizer shared by the upload prefix derivation and the
// delete purge, so both always target the same uploads/<uid>/ folder.
// NOTE: the DELETE handler's layering (assets -> doc -> registry, layers
// independent), the purge loop, kvDelete, and the danger-zone UX are
// wiring, not pure-testable — covered by review + live checks, per
// docs/specs/5e-i-delete-portfolio.md.
// Run: npx tsx scripts/5e-i-verify.ts
import {
  parseIndex,
  removeIndexEntry,
  type PortfolioIndex,
  type PortfolioIndexEntry,
} from '../src/lib/portfolioIndex';
import { assetPrefixForUid } from '../src/lib/r2Assets';

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

console.log('— removeIndexEntry: removes ONLY the target uid —');
const index: PortfolioIndex = {
  'uid-target': entry('target-slug'),
  'uid-a': entry('a-slug'),
  'uid-b': entry(null),
};
const removed = removeIndexEntry(index, 'uid-target');
check('target uid gone', !('uid-target' in removed) && removed['uid-target'] === undefined);
check('other uid kept, same reference (a)', removed['uid-a'] === index['uid-a']);
check('other uid kept, same reference (b)', removed['uid-b'] === index['uid-b']);
check(
  'key count drops by exactly one',
  Object.keys(removed).length === Object.keys(index).length - 1,
  `${Object.keys(removed).length} vs ${Object.keys(index).length}`,
);
check('no other uid removed', 'uid-a' in removed && 'uid-b' in removed);

console.log('— removeIndexEntry: missing uid -> unchanged-equivalent —');
const same = removeIndexEntry(index, 'uid-absent');
check(
  'content equivalent when uid was absent',
  JSON.stringify(same) === JSON.stringify(index),
);
check('still a NEW object (never the input)', same !== index);

console.log('— purity (no mutation, fresh output) —');
const before = JSON.stringify(index);
const keysBefore = Object.keys(index).join(',');
removeIndexEntry(index, 'uid-target');
removeIndexEntry(index, 'uid-a');
check(
  'input index unchanged after removals (value + key order)',
  JSON.stringify(index) === before && Object.keys(index).join(',') === keysBefore,
);
check('hit case also returns a fresh object', removed !== index);

console.log('— removeIndexEntry output survives the registry round-trip —');
const reparsed = parseIndex(JSON.stringify(removed));
check(
  'writeIndex->readIndex (JSON + parseIndex) is content-stable',
  JSON.stringify(reparsed) === JSON.stringify(removed),
  JSON.stringify(reparsed),
);
const empty = removeIndexEntry(index, 'uid-target');
const emptyAgain = removeIndexEntry(
  removeIndexEntry(empty, 'uid-a'),
  'uid-b',
);
check('removing every uid empties the registry', Object.keys(emptyAgain).length === 0);
check(
  'empty registry still round-trips',
  JSON.stringify(parseIndex(JSON.stringify(emptyAgain))) === '{}',
);

console.log('— assetPrefixForUid: shared upload/delete prefix sanitizer —');
check('plain uid passes through', assetPrefixForUid('abc-DEF_123') === 'abc-DEF_123');
check(
  'hostile characters collapse to _',
  assetPrefixForUid('a/b@c d') === 'a_b_c_d',
  assetPrefixForUid('a/b@c d'),
);
check(
  'path traversal defused (dots and slashes are not in the class)',
  assetPrefixForUid('../../etc') === '______etc',
  assetPrefixForUid('../../etc'),
);
check('capped at 64 chars', assetPrefixForUid('u'.repeat(100)).length === 64);
check('64-char uid untouched', assetPrefixForUid('u'.repeat(64)) === 'u'.repeat(64));
check(
  'empty uid -> empty folder name (caller composes uploads/<x>/)',
  assetPrefixForUid('') === '',
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
