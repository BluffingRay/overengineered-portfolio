// FIX-B E2E: two real Firebase users — cross-user DELETE + list scoping.
//
// LIVE-INTEGRATION script — NOT a pure unit test. Requirements:
//   1. `next dev` running on localhost:3000 (hosted env: KV + R2 + Firebase in .env.local)
//   2. Reads .env.local for the Firebase web API key (never prints it)
//   3. CREATES real Firebase test users + uploads/deletes REAL R2 objects
//      (works against LOCAL=false; also fine with local-storage mode)
// Side effects: test users fixb-a@test.local / fixb-b@test.local remain in the
// Firebase project afterwards — delete them from the console when done testing.
// Run: npx tsx scripts/fix-b-verify.ts
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:3000';

// --- .env.local parsing (quotes stripped; never printed) -------------------
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

// --- helpers ----------------------------------------------------------------
type Json = Record<string, unknown>;
let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log((ok ? '  ok  ' : 'FAIL  ') + name + (ok ? '' : ` — ${detail}`));
  if (!ok) failures++;
}

async function postJson(url: string, body: unknown, cookie?: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Json, res };
}

async function fbCall(method: string, body: unknown) {
  return postJson(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${API_KEY}`, body);
}

async function makeSession(email: string, password: string) {
  let { json } = await fbCall('signUp', { email, password, returnSecureToken: true });
  if (typeof json.idToken !== 'string') {
    ({ json } = await fbCall('signInWithPassword', { email, password, returnSecureToken: true }));
  }
  if (typeof json.idToken !== 'string' || typeof json.localId !== 'string') {
    throw new Error(`firebase auth failed for ${email}: ${JSON.stringify(json).slice(0, 200)}`);
  }
  const uid = json.localId;
  const { status, json: mint, res } = await postJson(`${BASE}/api/auth/session`, { idToken: json.idToken });
  if (status !== 200) throw new Error(`session mint failed: ${JSON.stringify(mint)}`);
  // Node exposes all Set-Cookie lines via getSetCookie()
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = (setCookie[0] ?? '').split(';')[0];
  if (!cookie) throw new Error('no session cookie in response');
  return { uid, cookie };
}

async function upload(cookie: string, filename: string) {
  const fd = new FormData();
  fd.append('file', new Blob(['\x89PNG\r\n\x1a\n fix-b test'], { type: 'image/png' }), filename);
  const res = await fetch(`${BASE}/api/upload`, { method: 'POST', headers: { Cookie: cookie }, body: fd });
  const json = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok || typeof json.key !== 'string') throw new Error(`upload failed: ${JSON.stringify(json)}`);
  return json.key as string;
}

async function api(method: 'GET' | 'DELETE', path: string, cookie?: string) {
  const res = await fetch(`${BASE}${path}`, { method, headers: cookie ? { Cookie: cookie } : {} });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Json };
}

// --- the test ---------------------------------------------------------------
async function main() {
const [a, b] = await Promise.all([
  makeSession('fixb-a@test.local', 'FixBVerify-A-12345'),
  makeSession('fixb-b@test.local', 'FixBVerify-B-12345'),
]);
console.log(`uid A: ${a.uid.slice(0, 12)}…, uid B: ${b.uid.slice(0, 12)}…`);

// A uploads a file
const keyA = await upload(a.cookie, 'a-image.png');
console.log('A uploaded:', keyA);
check('A upload under A prefix', keyA.startsWith(`uploads/${a.uid}/`), keyA);

// 1. B tries to DELETE A's file — must 403
{
  const { status, json } = await api('DELETE', `/api/upload?key=${encodeURIComponent(keyA)}`, b.cookie);
  check('cross-user DELETE -> 403', status === 403, `${status} ${JSON.stringify(json)}`);
}

// 2. A deletes own file — must 200
{
  const { status, json } = await api('DELETE', `/api/upload?key=${encodeURIComponent(keyA)}`, a.cookie);
  check('own DELETE -> 200', status === 200, `${status} ${JSON.stringify(json)}`);
}

// 3. Unauthed DELETE — must 401
{
  const { status, json } = await api('DELETE', '/api/upload?key=uploads/dev/x.png');
  check('unauthed DELETE -> 401', status === 401, `${status} ${JSON.stringify(json)}`);
}

// 4. Path traversal — 400/403, never touches fs
{
  const { status } = await api('DELETE', '/api/upload?key=uploads/..%2F..%2Fpackage.json', a.cookie);
  check('traversal key rejected', status === 400 || status === 403, `status ${status}`);
}

// 5. Legacy flat key: B (non-dev) -> 403
{
  const { status, json } = await api('DELETE', '/api/upload?key=uploads/legacy.png', b.cookie);
  check('legacy flat for non-dev -> 403', status === 403, `${status} ${JSON.stringify(json)}`);
}

// 6-7. List scoping: A's list must NOT contain B's uploads
const keyB = await upload(b.cookie, 'b-image.png');
{
  const { json } = await api('GET', '/api/upload?list=1', a.cookie);
  const files = (json.files as { key: string }[] | undefined) ?? [];
  const bKeys = files.filter((f) => f.key.startsWith(`uploads/${b.uid}/`));
  check("A's list has no B keys", bKeys.length === 0, JSON.stringify(bKeys.map((f) => f.key)));
}

// 8. B's list contains B's upload
{
  const { json } = await api('GET', '/api/upload?list=1', b.cookie);
  const files = (json.files as { key: string }[] | undefined) ?? [];
  check("B's list contains B's upload", files.some((f) => f.key === keyB), JSON.stringify(files));
}

// 9. Unauthed list: session-less => dev prefix scope, must not leak A or B keys
{
  const { json } = await api('GET', '/api/upload?list=1');
  const files = (json.files as { key: string }[] | undefined) ?? [];
  const leaked = files.filter(
    (f) => f.key.startsWith(`uploads/${a.uid}/`) || f.key.startsWith(`uploads/${b.uid}/`),
  );
  check('unauthed list leaks no user keys', leaked.length === 0, JSON.stringify(leaked.map((f) => f.key)));
}

// 10. ?prefix= override is ignored (server derives scope from session)
{
  const { json } = await api('GET', `/api/upload?list=1&prefix=uploads/${b.uid}/`, a.cookie);
  const files = (json.files as { key: string }[] | undefined) ?? [];
  const leaked = files.filter((f) => f.key.startsWith(`uploads/${b.uid}/`));
  check('?prefix= cannot name another user', leaked.length === 0, JSON.stringify(leaked.map((f) => f.key)));
}

// cleanup: B deletes own upload
{
  const { status, json } = await api('DELETE', `/api/upload?key=${encodeURIComponent(keyB)}`, b.cookie);
  check('cleanup B delete own -> 200', status === 200, `${status} ${JSON.stringify(json)}`);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
console.log('NOTE: test users fixb-a@test.local + fixb-b@test.local left in Firebase — delete when done.');
process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
