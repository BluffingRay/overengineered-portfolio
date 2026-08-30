// 5f-a verification: export/import bridge endpoints (public export vs
// authed import) + the shared stripDrafts helper.
//
// Structure: Part 1 is PURE (stripDrafts — no servers, no KV, no .env
// reads). Part 2 is LIVE E2E against the bridge endpoints.
//
// LIVE-INTEGRATION requirements (Part 2 only):
//   1. `next dev` running on localhost:3000 (hosted env: KV + Firebase in .env.local)
//   2. Reads .env.local for the Firebase web API key (never printed)
//   3. Uses/creates TWO real Firebase test users; PUTs REAL docs to KV
//      (each user's own key — no cross-user writes)
// Side effects: test users 5f-bridge-a@test.local / 5f-bridge-b@test.local;
// their portfolio:<uid>:default KV docs; portfolios:index entries for both
// uids (A claims slug `5f-bridge-a`, B claims `5f-bridge-b` in step 6).
// Cleanup note for AGENTS.md: when done testing, delete both users from
// the Firebase console, kvDelete both doc keys, and prune both entries
// from portfolios:index.
// Run: npx tsx scripts/5f-a-verify.ts
import { readFileSync } from 'node:fs';
import { stripDrafts } from '../src/lib/loadHostedDoc';
import { initialData } from '../src/data/initialData';
import type { PortfolioData } from '../src/types/schema';

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
// stripDrafts: the ONE draft-stripping helper (the /u/ page's former
// inline shape — filter + sort + spread — shared with the export route
// and GET /api/portfolio). The import route's identity-overlay decision is
// implemented INLINE in the route (strip + registry write-back before
// prepareDocument) — no pure helper exists, so it is covered by the E2E
// steps below only. NOTE: this file process-reads .env.local at module
// load for the Firebase web API key (house pattern, never printed) — the
// checks in this part are pure, the process is not.
function pureChecks() {
  console.log('— pure: stripDrafts —');
  const baseDoc = (): PortfolioData => structuredClone(initialData);

  const doc1 = baseDoc();
  doc1.posts = [
    { id: 'p-draft', title: 'draft', content: '<p>d</p>', status: 'draft' },
    { id: 'p-pub', title: 'pub', content: '<p>p</p>', status: 'published', publishedAt: '2026-01-01' },
  ];
  const out1 = stripDrafts(doc1);
  const posts1 = out1.posts ?? [];
  check(
    'filters drafts (published only)',
    posts1.length === 1 && posts1[0]?.id === 'p-pub',
    JSON.stringify(posts1),
  );

  const doc2 = baseDoc();
  doc2.posts = [
    { id: 'old', title: 'old', content: '', status: 'published', publishedAt: '2025-01-01' },
    { id: 'new', title: 'new', content: '', status: 'published', publishedAt: '2026-06-15' },
    { id: 'mid', title: 'mid', content: '', status: 'published', publishedAt: '2025-12-31' },
  ];
  const ids = (stripDrafts(doc2).posts ?? []).map((p) => p.id);
  check(
    'sorts published by publishedAt desc',
    JSON.stringify(ids) === JSON.stringify(['new', 'mid', 'old']),
    JSON.stringify(ids),
  );

  const doc3 = baseDoc();
  doc3.slug = 'check-slug';
  doc3.visibility = 'public';
  doc3.showcase = true;
  doc3.posts = [{ id: 'd', title: 'd', content: '', status: 'draft' }];
  const out3 = stripDrafts(doc3);
  check(
    'preserves other root fields (slug/visibility/showcase/theme/cards/tabs)',
    out3.slug === 'check-slug' &&
      out3.visibility === 'public' &&
      out3.showcase === true &&
      JSON.stringify(out3.theme) === JSON.stringify(doc3.theme) &&
      JSON.stringify(out3.cards) === JSON.stringify(doc3.cards) &&
      JSON.stringify(out3.tabs) === JSON.stringify(doc3.tabs),
  );

  const doc4 = baseDoc();
  delete doc4.posts;
  const posts4 = stripDrafts(doc4).posts;
  check(
    'absent posts -> posts: [] (never undefined — the /u/ page shape)',
    Array.isArray(posts4) && posts4.length === 0,
    JSON.stringify(posts4),
  );

  const doc5 = baseDoc();
  doc5.posts = [
    { id: 'a', title: 'a', content: '', status: 'published', publishedAt: '2024-01-01' },
    { id: 'b', title: 'b', content: '', status: 'draft' },
  ];
  const out5 = stripDrafts(doc5);
  check(
    'input doc not mutated (posts intact, order kept)',
    doc5.posts?.length === 2 && doc5.posts[0]?.id === 'a' && (out5.posts ?? []).length === 1,
  );
}

// ============================ Part 2 — live E2E ========================
async function liveChecks() {
  console.log('— live: export/import bridge —');

  const cookieA = await mintSession(await fbAuth('5f-bridge-a@test.local', '5fBridgeA-12345'));
  if (!cookieA) throw new Error('no session cookie for user A');
  const cookieB = await mintSession(await fbAuth('5f-bridge-b@test.local', '5fBridgeB-12345'));
  if (!cookieB) throw new Error('no session cookie for user B');
  console.log('signed in as 5f-bridge-a@test.local + 5f-bridge-b@test.local');

  // --- 1. A PUTs a doc: slug claim + a draft + a published post, private
  const docA: Json = {
    version: 3,
    skin: 'hud',
    theme: { accentColor: '#22d3ee' },
    cards: [],
    tabs: [
      {
        id: 'tab-5fa',
        label: '5f-a',
        blocks: [
          { id: 'block-5fa', type: 'rich_text', content: '<p>5f-a bridge content marker</p>' },
        ],
      },
    ],
    slug: '5f-bridge-a',
    visibility: 'private',
    posts: [
      { id: 'post-5fa-draft', title: '5f-a DRAFT marker', status: 'draft', content: '<p>draft</p>' },
      { id: 'post-5fa-pub', title: '5f-a published post', status: 'published', publishedAt: '2026-08-30', content: '<p>published</p>' },
    ],
  };
  const putA = await fetch(`${BASE}/api/portfolio`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify(docA),
  });
  const confirmedA = (await putA.json()) as Json;
  check('1. A PUT (slug claim + private + posts) -> 200', putA.status === 200, `${putA.status} — ${JSON.stringify(confirmedA).slice(0, 120)}`);
  check('1. confirmed doc carries the slug claim', confirmedA.slug === '5f-bridge-a', JSON.stringify(confirmedA).slice(0, 120));

  const exportUrl = `${BASE}/api/portfolio/5f-bridge-a/export`;

  // --- 2. unauthed export of the PRIVATE slug -> 404 (no leak)
  const privRes = await fetch(exportUrl);
  const privText = await privRes.text();
  check('2. unauthed export, private doc -> 404', privRes.status === 404, `${privRes.status} — ${privText.slice(0, 120)}`);

  // --- 3. full mode is owner-only (404 for everyone else — never 401/403)
  const fullUnauth = await fetch(`${exportUrl}?full=1`);
  check('3a. unauthed ?full=1 -> 404 (never 401 — no leak)', fullUnauth.status === 404, `${fullUnauth.status}`);
  const fullB = await fetch(`${exportUrl}?full=1`, { headers: { Cookie: cookieB } });
  check('3b. user B (not owner) ?full=1 -> 404', fullB.status === 404, `${fullB.status}`);
  const fullA = await fetch(`${exportUrl}?full=1`, { headers: { Cookie: cookieA } });
  const fullAText = await fullA.text();
  check('3c. user A (owner) ?full=1 -> 200', fullA.status === 200, `${fullA.status}`);
  check('3c. full export includes the draft', fullAText.includes('5f-a DRAFT marker'));
  check(
    '3c. attachment header with slug filename',
    (fullA.headers.get('content-disposition') ?? '').includes('attachment; filename="5f-bridge-a-portfolio.json"'),
    fullA.headers.get('content-disposition') ?? 'missing',
  );
  // full=1 precedence over public=1 when both flags are present (locked:
  // full wins — the owner sees everything either way).
  const bothRes = await fetch(`${BASE}/api/portfolio/5f-bridge-a/export?full=1&public=1`, { headers: { Cookie: cookieA } });
  const bothText = await bothRes.text();
  check('3d. both flags -> full wins (200 + drafts present)', bothRes.status === 200 && bothText.includes('5f-a DRAFT marker'), `${bothRes.status}`);

  // --- 4. A goes public; the unauthed public export is the bridge
  const putPublic = await fetch(`${BASE}/api/portfolio`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ ...confirmedA, visibility: 'public' }),
  });
  check('4. A re-PUTs visibility public -> 200', putPublic.status === 200, `${putPublic.status}`);
  const pubRes = await fetch(exportUrl);
  const pubText = await pubRes.text();
  check('4. unauthed public export (no flag) -> 200', pubRes.status === 200, `${pubRes.status} — ${pubText.slice(0, 120)}`);
  check(
    '4. Content-Type is application/json',
    (pubRes.headers.get('content-type') ?? '').includes('application/json'),
    pubRes.headers.get('content-type') ?? 'missing',
  );
  let pubJson: Json = {};
  try {
    pubJson = JSON.parse(pubText) as Json;
  } catch {
    // flagged by the version check below
  }
  check('4. export body parses as version 3', pubJson.version === 3, pubText.slice(0, 120));
  check('4. drafts ABSENT from public export', !pubText.includes('5f-a DRAFT marker'));
  check('4. published post present', pubText.includes('post-5fa-pub'));
  check(
    '4. attachment header with slug filename',
    (pubRes.headers.get('content-disposition') ?? '').includes('attachment; filename="5f-bridge-a-portfolio.json"'),
    pubRes.headers.get('content-disposition') ?? 'missing',
  );

  // --- 5. /u/<slug> obeys the same visibility rule (sanity)
  const pageRes = await fetch(`${BASE}/u/5f-bridge-a`);
  check('5. GET /u/<slug> public doc -> 200', pageRes.status === 200, `${pageRes.status}`);

  // --- 6. B imports A's public export (A's slug embedded)
  check('6. precondition: export body carries A\'s slug', pubJson.slug === '5f-bridge-a', String(pubJson.slug));
  const impRes = await fetch(`${BASE}/api/portfolio/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify(pubJson),
  });
  const confirmedB = (await impRes.json()) as Json;
  check('6. B import -> 200', impRes.status === 200, `${impRes.status} — ${JSON.stringify(confirmedB).slice(0, 160)}`);
  check('6. B confirmed doc has content', JSON.stringify(confirmedB).includes('5f-a bridge content marker'));
  // Identity overlay: the file's slug ('5f-bridge-a') must NEVER land in
  // B's doc. B's own claim is preserved when one exists (re-runs: B
  // already claimed '5f-bridge-b' in a previous run) — absent on a true
  // first run.
  check('6. B confirmed doc does NOT inherit A\'s slug', confirmedB.slug !== '5f-bridge-a', String(confirmedB.slug));
  check(
    '6. B slug is own-preserved or absent (identity overlay)',
    confirmedB.slug == null || confirmedB.slug === '5f-bridge-b',
    String(confirmedB.slug),
  );
  const metaB = await fetch(`${BASE}/api/portfolio/meta`, { headers: { Cookie: cookieB } });
  const metaBJson = (await metaB.json()) as Json;
  check(
    '6. B registry slug matches the overlay rule (null or own)',
    metaBJson.slug === null || metaBJson.slug === '5f-bridge-b',
    JSON.stringify(metaBJson),
  );
  const freshPutB = await fetch(`${BASE}/api/portfolio`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify({ ...confirmedB, slug: '5f-bridge-b' }),
  });
  check('6. B PUT of a fresh slug -> 200 (no phantom conflict)', freshPutB.status === 200, `${freshPutB.status}`);

  // --- 6c. identity overlay pin: B (existing slug + PRIVATE) re-imports
  // A's PUBLIC export — B keeps their slug and their privacy; only the
  // content is replaced. (First run: B's doc inherited A's public
  // visibility above because B had no registry entry yet — the fresh-
  // account rule; this step makes B explicitly private first.)
  const bDoc = JSON.parse(JSON.stringify(confirmedB)) as Json;
  bDoc.slug = '5f-bridge-b';
  bDoc.visibility = 'private';
  delete (bDoc as Record<string, unknown>).showcase;
  const bPrivatePut = await fetch(`${BASE}/api/portfolio`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify(bDoc),
  });
  check('6c. precondition: B re-PUT as private with own slug -> 200', bPrivatePut.status === 200, `${bPrivatePut.status}`);
  const reimpRes = await fetch(`${BASE}/api/portfolio/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify(pubJson),
  });
  const reconfirmedB = (await reimpRes.json()) as Json;
  check('6c. B re-import of A public export -> 200', reimpRes.status === 200, `${reimpRes.status}`);
  check('6c. B kept their own slug (never A\'s)', reconfirmedB.slug === '5f-bridge-b', String(reconfirmedB.slug));
  check(
    '6c. B stayed PRIVATE (A\'s public not inherited)',
    reconfirmedB.visibility !== 'public',
    `visibility ${JSON.stringify(reconfirmedB.visibility)} — absent or 'private' both mean private (5e-f absent-defaults shape drops explicit 'private')`,
  );
  check('6c. B content replaced by the import', JSON.stringify(reconfirmedB).includes('5f-a bridge content marker'));
  // Showcase axis (review finding): an OPTED-OUT B importing an opted-in
  // export must NOT join the gallery — the overlay's unconditional
  // showcase write-back. B's registry showcase is false/absent here
  // (deleted in the private re-PUT above), so inject true into the source
  // body and assert it does not survive.
  const optedIn = { ...pubJson, showcase: true };
  const optRes = await fetch(`${BASE}/api/portfolio/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify(optedIn),
  });
  const optConfirmed = (await optRes.json()) as Json;
  check('6c. opted-in export import -> 200', optRes.status === 200, `${optRes.status}`);
  check('6c. B stays opted OUT of the showcase (false does not inherit true)', optConfirmed.showcase !== true, String(optConfirmed.showcase));

  // --- 7. import auth + body validation
  const unauthImport = await fetch(`${BASE}/api/portfolio/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pubJson),
  });
  check('7. unauthed import -> 401', unauthImport.status === 401, `${unauthImport.status}`);
  const badImport = await fetch(`${BASE}/api/portfolio/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify([1, 2, 3]),
  });
  check('7. import array body -> 400', badImport.status === 400, `${badImport.status}`);

  // --- 8. nonexistent slug exports 404, indistinguishable from private
  const missRes = await fetch(`${BASE}/api/portfolio/no-such-5f-a/export`);
  const missText = await missRes.text();
  check('8. export of nonexistent slug -> 404', missRes.status === 404, `${missRes.status}`);
  check(
    '8. private-404 and miss-404 bodies identical (no existence leak)',
    missText === privText,
    `"${missText.slice(0, 80)}" vs "${privText.slice(0, 80)}"`,
  );
}

async function main() {
  pureChecks();
  await liveChecks();
}

main()
  .then(() => {
    console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
    console.log('\nCleanup reminder (test artifacts left behind):');
    console.log('- Firebase users 5f-bridge-a@test.local + 5f-bridge-b@test.local — delete from the console when done testing');
    console.log('- KV docs portfolio:<uidA>:default + portfolio:<uidB>:default — kvDelete both keys');
    console.log('- portfolios:index entries for both uids (slugs 5f-bridge-a / 5f-bridge-b) — prune when done');
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
