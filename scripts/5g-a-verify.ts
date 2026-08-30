// 5g-a verification: the PUBLIC + paginated showcase endpoint (pageOf)
// and the signed-out /dashboard render gate.
//
// Structure: Part 1 is PURE (pageOf — no servers, no KV, no .env reads).
// Part 2 is LIVE E2E against GET /api/portfolio/showcase + GET /dashboard.
//
// LIVE-INTEGRATION requirements (Part 2 only):
//   1. `next dev` running on localhost:3000 (hosted env: KV + Firebase in .env.local)
//   2. Reads .env.local for the Firebase web API key (never printed)
//   3. Uses/creates ONE real Firebase test user; PUTs a REAL doc to KV
//      (the user's own key — no cross-user writes)
// Side effects: test user 5g-showcase@test.local; their
// portfolio:<uid>:default KV doc (OVERWRITTEN every run — dedicated test
// account); the portfolios:index entry for their uid (slug `5g-showcase`,
// public + showcase:true). Idempotent: signUp falls back to signIn and the
// PUT re-writes the same doc, so re-runs are safe.
// Assumes: the pre-existing `fixc-demo` slug (5e-c½ test artifact) is NOT
// public+showcase — step 2 pins it as absent from the signed-out feed
// (the spec's "no private entries" probe).
// Cleanup note (printed at the end): when done testing, delete
// 5g-showcase@test.local from the Firebase console, kvDelete their
// portfolio:<uid>:default doc key, and prune their portfolios:index entry
// (slug 5g-showcase).
// Run: npx tsx scripts/5g-a-verify.ts
import { readFileSync } from 'node:fs';
import { pageOf } from '../src/lib/portfolioIndex';

const BASE = 'http://localhost:3000';

function envValue(name: string): string {
  const raw = readFileSync('.env.local', 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (t.startsWith('#') || !t.includes('=')) continue;
    const [k, ...rest] = t.split('=');
    if (k === name) return rest.join('=').trim().replace(/^"|"$/g, '');
  }
  throw new Error(`${name} not found in .env.local`);
}
const API_KEY = envValue('NEXT_PUBLIC_FIREBASE_API_KEY');

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log((ok ? '  ok  ' : 'FAIL  ') + name + (ok ? '' : ` — ${detail}`));
  if (!ok) failures++;
}

type Json = Record<string, unknown>;

async function postJson(url: string, body: unknown, cookie?: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Json, res };
}

async function fbAuth(email: string, password: string) {
  let { json } = await postJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    { email, password, returnSecureToken: true },
  );
  if (typeof json.idToken !== 'string') {
    ({ json } = await postJson(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      { email, password, returnSecureToken: true },
    ));
  }
  if (typeof json.idToken !== 'string') throw new Error(`firebase auth failed: ${JSON.stringify(json).slice(0, 200)}`);
  return json.idToken as string;
}

// fix-c house pattern: mint the HttpOnly session cookie server-side, keep
// just the cookie pair for subsequent requests.
async function mintSession(idToken: string): Promise<string> {
  const { status, json, res } = await postJson(`${BASE}/api/auth/session`, { idToken });
  if (status !== 200) throw new Error(`session mint failed: ${JSON.stringify(json)}`);
  return (res.headers.getSetCookie?.() ?? [])[0]?.split(';')[0] ?? '';
}

// ============================ Part 1 — pure ============================
// pageOf: clamped 1-based page math over an already-ordered feed. NOTE:
// this file process-reads .env.local at module load for the Firebase web
// API key (house pattern, never printed) — the checks in this part are
// pure, the process is not.
function pureChecks() {
  console.log('— pure: pageOf —');
  const feed = ['a', 'b', 'c', 'd', 'e'];

  const p1 = pageOf(feed, 1, 2);
  check('page 1 slices [0, size)', JSON.stringify(p1.items) === JSON.stringify(['a', 'b']), JSON.stringify(p1.items));
  check('page 1 echoes page=1 + hasMore (end 2 < 5)', p1.page === 1 && p1.hasMore === true, JSON.stringify({ page: p1.page, hasMore: p1.hasMore }));

  const p2 = pageOf(feed, 2, 2);
  check('page 2 slices [2, 4)', JSON.stringify(p2.items) === JSON.stringify(['c', 'd']), JSON.stringify(p2.items));
  check('page 2 hasMore still true', p2.hasMore === true, String(p2.hasMore));

  const p3 = pageOf(feed, 3, 2);
  check('last page slices the remainder', JSON.stringify(p3.items) === JSON.stringify(['e']), JSON.stringify(p3.items));
  check('last page hasMore false (end 6 !< 5)', p3.hasMore === false, String(p3.hasMore));

  check('clamp 0 -> 1', pageOf(feed, 0, 2).page === 1 && JSON.stringify(pageOf(feed, 0, 2).items) === JSON.stringify(['a', 'b']), JSON.stringify(pageOf(feed, 0, 2)));
  check('clamp -1 -> 1', pageOf(feed, -1, 2).page === 1 && pageOf(feed, -1, 2).items[0] === 'a', JSON.stringify(pageOf(feed, -1, 2)));
  check('clamp NaN -> 1', pageOf(feed, Number.NaN, 2).page === 1 && JSON.stringify(pageOf(feed, Number.NaN, 2).items) === JSON.stringify(['a', 'b']), JSON.stringify(pageOf(feed, Number.NaN, 2)));
  check('clamp Infinity -> 1', pageOf(feed, Number.POSITIVE_INFINITY, 2).page === 1 && JSON.stringify(pageOf(feed, Number.POSITIVE_INFINITY, 2).items) === JSON.stringify(['a', 'b']), JSON.stringify(pageOf(feed, Number.POSITIVE_INFINITY, 2)));
  // Exact-multiple boundary (review finding): when length is an exact
  // multiple of the size, the LAST full page must have hasMore false —
  // end < length and end <= length agree on the 5-item fixture, so pin the
  // case where they differ.
  const exact = ['a', 'b', 'c', 'd'];
  check('exact multiple: last full page -> hasMore false', pageOf(exact, 2, 2).hasMore === false && pageOf(exact, 2, 2).items.length === 2, JSON.stringify(pageOf(exact, 2, 2)));
  check('exact multiple: past the end -> empty + false', pageOf(exact, 3, 2).items.length === 0 && pageOf(exact, 3, 2).hasMore === false, JSON.stringify(pageOf(exact, 3, 2)));

  const far = pageOf(feed, 999, 24);
  check('far page: empty entries + hasMore false', far.items.length === 0 && far.hasMore === false, JSON.stringify(far));

  const empty = pageOf([], 1, 24);
  check('empty feed: empty entries + hasMore false', empty.items.length === 0 && empty.hasMore === false, JSON.stringify(empty));

  const before = JSON.stringify(feed);
  pageOf(feed, 2, 2);
  pageOf(feed, 0, 2);
  check('input not mutated', JSON.stringify(feed) === before, JSON.stringify(feed));
}

// ============================ Part 2 — live E2E ========================
async function liveChecks() {
  console.log('— live: public showcase + dashboard gate —');

  const cookie = await mintSession(await fbAuth('5g-showcase@test.local', '5gShowcase-12345'));
  if (!cookie) throw new Error('no session cookie for the test user');
  console.log('signed in as 5g-showcase@test.local');

  // --- 1. PUT a public + showcase doc claiming slug 5g-showcase
  const doc: Json = {
    version: 3,
    skin: 'hud',
    theme: { accentColor: '#22d3ee' },
    cards: [],
    tabs: [
      {
        id: 'tab-5ga',
        label: '5g-a',
        blocks: [
          { id: 'block-5ga', type: 'rich_text', content: '<p>5g-a public showcase marker</p>' },
        ],
      },
    ],
    slug: '5g-showcase',
    visibility: 'public',
    showcase: true,
  };
  const put = await fetch(`${BASE}/api/portfolio`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(doc),
  });
  const confirmed = (await put.json().catch(() => ({}))) as Json;
  check('1. PUT public+showcase doc -> 200', put.status === 200, `${put.status} — ${JSON.stringify(confirmed).slice(0, 120)}`);
  check(
    '1. confirmed doc keeps slug/visibility/showcase',
    confirmed.slug === '5g-showcase' && confirmed.visibility === 'public' && confirmed.showcase === true,
    JSON.stringify({ slug: confirmed.slug, visibility: confirmed.visibility, showcase: confirmed.showcase }),
  );

  // --- 2. signed-out GET: the full filtered feed, new shape
  const anonRes = await fetch(`${BASE}/api/portfolio/showcase`);
  check('2. signed-out GET -> 200 (no 401 anymore)', anonRes.status === 200, `${anonRes.status}`);
  const anonJson = (await anonRes.json().catch(() => ({}))) as Json;
  check(
    '2. shape {entries, page, hasMore}',
    Array.isArray(anonJson.entries) && anonJson.page === 1 && typeof anonJson.hasMore === 'boolean',
    JSON.stringify(anonJson).slice(0, 160),
  );
  const entries = (Array.isArray(anonJson.entries) ? anonJson.entries : []) as Json[];
  const slugs = entries.map((e) => e.slug);
  check('2. the new slug IS present', slugs.includes('5g-showcase'), JSON.stringify(slugs));
  check('2. no private entries (fixc-demo absent)', !slugs.includes('fixc-demo'), JSON.stringify(slugs));
  check(
    '2. entries carry only slug/title/updatedAt (no uid key)',
    entries.every((e) => JSON.stringify(Object.keys(e).sort()) === JSON.stringify(['slug', 'title', 'updatedAt'])),
    JSON.stringify(entries[0] ?? null),
  );

  // --- 3. pagination params
  const p1Res = await fetch(`${BASE}/api/portfolio/showcase?page=1`);
  const p1Json = (await p1Res.json().catch(() => ({}))) as Json;
  check('3. ?page=1 equals the default response', JSON.stringify(p1Json) === JSON.stringify(anonJson), 'responses differ (registry changed between calls?)');
  const farRes = await fetch(`${BASE}/api/portfolio/showcase?page=999`);
  const farJson = (await farRes.json().catch(() => ({}))) as Json;
  check(
    '3. ?page=999 -> 200, empty entries, hasMore false (no crash)',
    farRes.status === 200 && Array.isArray(farJson.entries) && farJson.entries.length === 0 && farJson.hasMore === false,
    `${farRes.status} — ${JSON.stringify(farJson).slice(0, 120)}`,
  );
  const garbageRes = await fetch(`${BASE}/api/portfolio/showcase?page=abc`);
  const garbageJson = (await garbageRes.json().catch(() => ({}))) as Json;
  check(
    '3. ?page=abc (NaN) clamps to page 1, no crash',
    garbageRes.status === 200 && garbageJson.page === 1 && JSON.stringify(garbageJson) === JSON.stringify(anonJson),
    `${garbageRes.status} — ${JSON.stringify(garbageJson).slice(0, 120)}`,
  );

  // --- 4. authed GET as the test user: caller excluded (rule intact)
  const authedRes = await fetch(`${BASE}/api/portfolio/showcase`, { headers: { Cookie: cookie } });
  check('4. authed GET -> 200', authedRes.status === 200, `${authedRes.status}`);
  const authedJson = (await authedRes.json().catch(() => ({}))) as Json;
  const authedSlugs = ((Array.isArray(authedJson.entries) ? authedJson.entries : []) as Json[]).map((e) => e.slug);
  check('4. caller own doc EXCLUDED (5g-showcase absent)', !authedSlugs.includes('5g-showcase'), JSON.stringify(authedSlugs));

  // --- 5. signed-out /dashboard HTML is the splash (client-gated render)
  const dashRes = await fetch(`${BASE}/dashboard`);
  const dashHtml = await dashRes.text();
  check('5. GET /dashboard -> 200', dashRes.status === 200, `${dashRes.status}`);
  check('5. SSR HTML is the auth splash', dashHtml.includes('~/loading'), 'splash marker missing from SSR HTML');
  check('5. no doc data in SSR HTML', !dashHtml.includes('5g-showcase'), 'test slug leaked into SSR HTML');
}

async function main() {
  pureChecks();
  await liveChecks();
}

main()
  .then(() => {
    console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
    console.log('\nCleanup reminder (test artifacts left behind):');
    console.log('- Firebase user 5g-showcase@test.local — delete from the console when done testing');
    console.log('- KV doc portfolio:<uid>:default for that user — kvDelete the key');
    console.log('- portfolios:index entry for that uid (slug 5g-showcase) — prune when done');
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
