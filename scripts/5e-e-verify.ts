// 5e-e load-offer verify — PURE function checks only: no servers, no KV,
// no .env reads, no window/localStorage (safe to run alongside the dev
// server). Covers the resolveLoadOffer matrix that gates the FIX-C
// seed-overwrite offer: the offer fires ONLY when the mount-time seed
// proves the draft is unverified — the ?full=1 fetch succeeded, NO prior
// last-saved snapshot existed (the baseline came from the cloud THIS
// mount), and the local draft differs from it.
// hasLastSaved() is NOT Node-testable: it reads window.localStorage,
// which Node doesn't have (hostedDoc touches localStorage only inside
// functions, so importing the module itself is safe). Its hadSnapshot
// input is exercised via this matrix; its one-line wiring (captured
// BEFORE seedLastSaved runs) is covered by review + the orchestrator's
// browser gate — see docs/specs/5e-e-load-path.md.
// Run: npx tsx scripts/5e-e-verify.ts
import { resolveLoadOffer } from '../src/lib/hostedDoc';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('— resolveLoadOffer matrix —');
check(
  'fresh device + dirty draft -> OFFER (the landmine case)',
  resolveLoadOffer({ hadSnapshot: false, fetchOk: true, dirtyNow: true }) === true,
  String(resolveLoadOffer({ hadSnapshot: false, fetchOk: true, dirtyNow: true })),
);
check(
  'fresh device + clean draft -> no offer (no-doc seed fallback: draft(seed) == saved(seed))',
  resolveLoadOffer({ hadSnapshot: false, fetchOk: true, dirtyNow: false }) === false,
);
check(
  'had snapshot + dirty -> no offer (real edit on a device that knows the truth)',
  resolveLoadOffer({ hadSnapshot: true, fetchOk: true, dirtyNow: true }) === false,
);
check(
  'had snapshot + clean -> no offer',
  resolveLoadOffer({ hadSnapshot: true, fetchOk: true, dirtyNow: false }) === false,
);

console.log('— fetch failure never offers (no seeding — today\'s behavior) —');
check(
  'fetch failed + no snapshot + dirty -> no offer',
  resolveLoadOffer({ hadSnapshot: false, fetchOk: false, dirtyNow: true }) === false,
);
check(
  'fetch failed + no snapshot + clean -> no offer',
  resolveLoadOffer({ hadSnapshot: false, fetchOk: false, dirtyNow: false }) === false,
);
check(
  'fetch failed + had snapshot + dirty -> no offer',
  resolveLoadOffer({ hadSnapshot: true, fetchOk: false, dirtyNow: true }) === false,
);
check(
  'fetchOk false beats dirty (whole 2x2x2 matrix: exactly one true cell)',
  [
    { hadSnapshot: false, fetchOk: true, dirtyNow: true },
    { hadSnapshot: false, fetchOk: true, dirtyNow: false },
    { hadSnapshot: true, fetchOk: true, dirtyNow: true },
    { hadSnapshot: true, fetchOk: true, dirtyNow: false },
    { hadSnapshot: false, fetchOk: false, dirtyNow: true },
    { hadSnapshot: false, fetchOk: false, dirtyNow: false },
    { hadSnapshot: true, fetchOk: false, dirtyNow: true },
    { hadSnapshot: true, fetchOk: false, dirtyNow: false },
  ].filter((input) => resolveLoadOffer(input)).length === 1,
);

console.log('— purity (no input mutation) —');
const input = { hadSnapshot: false, fetchOk: true, dirtyNow: true };
resolveLoadOffer(input);
check(
  'input object unchanged after the call',
  input.hadSnapshot === false && input.fetchOk === true && input.dirtyNow === true,
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
