// FIX-E E2E: restore 5b `LOCAL` tri-state semantics (unset = auto/hybrid).
//
// LIVE and fully self-contained — spawns its own `next dev` server per env
// case (ports 3121+, serial; route handlers only read env at startup, so each
// case needs a fresh server). Env control is by FILE SWAP, never process-env
// override: `.env.local` is rebuilt per case by filtering/replacing lines
// (secret values are never printed). The original file is backed up to
// `.env.local.fixe-backup` BEFORE the first swap and restored in `finally`
// and in the SIGINT/SIGTERM handlers — Ctrl-C cannot leave it swapped.
//
// Auth gate: every case file omits the Firebase admin keys
// (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) and
// the KV keys (CLOUDFLARE_ACCOUNT_ID / KV_NAMESPACE_ID / CLOUDFLARE_API_TOKEN)
// so `isAdminConfigured()` is false -> all requests work unauthenticated under
// the `dev` prefix. NEXT_PUBLIC_* lines are kept as-is (harmless).
//
// Side effects: case A uploads one real object to the R2 bucket and deletes
// it again through the route. Run from the repo root:
//   npx tsx scripts/fix-e-verify.ts
//
// Preflight: aborts when another `next dev` already runs on this directory —
// this modified Next build enforces ONE dev server per project dir (a second
// prints "Another next dev server is already running" and exits; with stdio
// ignored that failure is invisible and reads as six confusing readiness
// failures — see the run notes in docs/specs/fix-e.md). Stop the dev server
// first, run this script, restart it afterwards.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, readlinkSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs';

const ENV_FILE = '.env.local';
const BACKUP_FILE = '.env.local.fixe-backup';
const BASE_PORT = 3121;
const READY_CAP_MS = 90_000; // on-demand route compile can take 20s+ on WSL2
const REQUEST_TIMEOUT_MS = 15_000;

// --- helpers (fix-b style) ---------------------------------------------------
type Json = Record<string, unknown>;
let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log((ok ? '  ok  ' : 'FAIL  ') + name + (ok ? '' : ` — ${detail}`));
  if (!ok) failures++;
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// --- .env.local line surgery (never printed) ---------------------------------
type StripSpec = string | RegExp;
function lineKey(line: string): string | null {
  const t = line.trim();
  if (t.startsWith('#') || !t.includes('=')) return null;
  return t.split('=')[0].trim() || null;
}
function keyMatches(key: string, spec: StripSpec): boolean {
  return typeof spec === 'string' ? key === spec : spec.test(key);
}
// Build one case file: drop stripped keys, replace `set` keys (or append),
// keep every other line (comments + NEXT_PUBLIC_*) verbatim.
function buildCaseFile(base: string[], opts: { strip?: StripSpec[]; set?: Record<string, string> }): string {
  const strip = opts.strip ?? [];
  const out: string[] = [];
  for (const line of base) {
    const key = lineKey(line);
    if (key && strip.some((s) => keyMatches(key, s))) continue;
    if (key && opts.set && key in opts.set) continue; // re-added below
    out.push(line);
  }
  for (const [k, v] of Object.entries(opts.set ?? {})) out.push(`${k}=${v}`);
  return out.join('\n');
}

// keys removed from EVERY case file — auth gate off + KV off
const STRIP_ALWAYS: StripSpec[] = [
  'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY',
  'CLOUDFLARE_ACCOUNT_ID', 'KV_NAMESPACE_ID', 'CLOUDFLARE_API_TOKEN',
];
// the LOCAL trio — removed for unset cases
const LOCAL_KEYS: StripSpec[] = ['LOCAL', 'USE_LOCAL', 'STORAGE_LOCAL'];
// every R2 config key the route honors (R2_* plus the non-prefixed aliases) —
// removed for the "R2 NOT configured" cases
const STRIP_R2: StripSpec[] = [
  /^R2_/, 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
  'CLOUDFLARE_R2_BUCKET', 'CLOUDFLARE_R2_PUBLIC_URL',
  'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
];

// --- startup guard -------------------------------------------------------------
if (!existsSync(ENV_FILE)) {
  console.error(`ABORT: ${ENV_FILE} not found — run from the repo root.`);
  process.exit(1);
}
const ORIGINAL = readFileSync(ENV_FILE, 'utf8');
{
  const keys = new Set(ORIGINAL.split(/\r?\n/).map(lineKey).filter((k): k is string => !!k));
  const endpoint = keys.has('R2_ENDPOINT') || keys.has('R2_ACCOUNT_ID');
  if (!endpoint || !keys.has('R2_ACCESS_KEY_ID') || !keys.has('R2_SECRET_ACCESS_KEY')) {
    console.error(
      `ABORT: ${ENV_FILE} lacks R2_ENDPOINT (or R2_ACCOUNT_ID) + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY — ` +
      'cases A/B/D/E need a working R2 config. Never a silent pass.',
    );
    process.exit(1);
  }
}
// This Next build runs ONE dev server per project directory — a second one
// exits at boot and every readiness check fails with no visible reason.
function findBlockingDevServer(): string | null {
  try {
    for (const pid of readdirSync('/proc')) {
      if (!/^\d+$/.test(pid) || pid === String(process.pid)) continue;
      let cmd: string;
      try {
        cmd = readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim();
      } catch {
        continue; // gone / no perms
      }
      if (!cmd.includes('next-server') && !cmd.includes('next dev')) continue;
      try {
        if (readlinkSync(`/proc/${pid}/cwd`) === process.cwd()) {
          return `pid ${pid} (${cmd.slice(0, 80)})`;
        }
      } catch {
        continue;
      }
    }
  } catch {
    // not Linux / no /proc — can't check; the spawn will tell us.
  }
  return null;
}
{
  const blocker = findBlockingDevServer();
  if (blocker) {
    console.error(
      `ABORT: another next dev server is running on this directory (${blocker}). ` +
      'This build enforces one dev server per project dir — stop it first, ' +
      'run this script, then restart it.',
    );
    process.exit(1);
  }
}
// belt-and-braces: the backup copy exists on disk BEFORE the first swap, so
// even a hard kill leaves a recoverable original behind
copyFileSync(ENV_FILE, BACKUP_FILE);

function restoreOriginal(): boolean {
  try {
    writeFileSync(ENV_FILE, ORIGINAL);
    try { unlinkSync(BACKUP_FILE); } catch { /* already gone */ }
    return true;
  } catch {
    return false;
  }
}
// restore must survive Ctrl-C: handle the signals synchronously, then exit
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    restoreOriginal();
    process.exit(130);
  });
}

// --- server lifecycle ----------------------------------------------------------
type RunningServer = { proc: ReturnType<typeof spawn>; port: number; failed: boolean };
function startServer(port: number): RunningServer {
  // never SET env here (file swap is the control) — only strip ambient keys
  // that would override the case file inside the spawned server
  const env: typeof process.env = { ...process.env };
  for (const k of Object.keys(env)) {
    if (STRIP_ALWAYS.includes(k) || LOCAL_KEYS.includes(k) || keyMatches(k, /^R2_/)) delete env[k];
  }
  // detached => own process group; stdio ignored so server stdout (which can
  // echo env values) is never printed
  const proc = spawn('npx', ['next', 'dev', '-p', String(port)], { detached: true, stdio: 'ignore', env });
  const server: RunningServer = { proc, port, failed: false };
  proc.on('error', () => { server.failed = true; });
  return server;
}
async function killServer(s: RunningServer): Promise<void> {
  const pid = s.proc.pid;
  if (!pid) return;
  try { process.kill(-pid, 'SIGTERM'); } catch { /* group already gone */ }
  await sleep(400);
  try {
    process.kill(-pid, 0); // still alive?
    try { process.kill(-pid, 'SIGKILL'); } catch { /* gone meanwhile */ }
  } catch { /* ESRCH — already gone */ }
  await sleep(150);
}
async function waitReady(s: RunningServer): Promise<boolean> {
  const deadline = Date.now() + READY_CAP_MS;
  while (Date.now() < deadline) {
    if (s.failed) return false;
    try {
      const res = await fetch(`http://localhost:${s.port}/api/upload`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (res.ok) return true;
    } catch { /* not up yet — retry */ }
    await sleep(500);
  }
  return false;
}

// --- API helpers -----------------------------------------------------------------
async function api(port: number, method: 'GET' | 'POST' | 'DELETE', path: string, body?: BodyInit) {
  const res = await fetch(`http://localhost:${port}${path}`, { method, body, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Json };
}
const getStatus = (port: number) => api(port, 'GET', '/api/upload');
function uploadPng(port: number) {
  const fd = new FormData();
  fd.append('file', new Blob(['\x89PNG\r\n\x1a\n fix-e test'], { type: 'image/png' }), 'fix-e.png');
  return api(port, 'POST', '/api/upload', fd);
}
type ListFile = { key: string; source: string };
async function listFiles(port: number): Promise<ListFile[]> {
  const { json } = await api(port, 'GET', '/api/upload?list=1');
  return (json.files as ListFile[] | undefined) ?? [];
}
function statusOf(json: Json): { forced: string; mode: string; r2: unknown; hint: unknown } {
  return { forced: String(json.forced), mode: String(json.mode), r2: json.r2, hint: json.hint };
}

// --- case runners ------------------------------------------------------------------
async function caseA(port: number) { // unset LOCAL + R2 configured -> R2 wins
  const s = statusOf((await getStatus(port)).json);
  check('A unset -> forced hybrid (5b restored)', s.forced === 'hybrid', `forced=${s.forced}`);
  check('A unset -> mode r2', s.mode === 'r2', `mode=${s.mode}`);
  const up = await uploadPng(port);
  const key = typeof up.json.key === 'string' ? up.json.key : '';
  check('A upload -> mode r2', up.status === 200 && up.json.mode === 'r2', `status=${up.status} ${JSON.stringify(up.json)}`);
  check('A key uploads/dev/<uuid>.png', /^uploads\/dev\/[0-9a-f-]{36}\.png$/.test(key), key);
  const hit = (await listFiles(port)).find((f) => f.key === key);
  check('A list contains key with source r2', !!hit && hit.source === 'r2', hit ? `source=${hit.source}` : 'key missing from list');
  if (!key) return;
  try {
    const del = await api(port, 'DELETE', `/api/upload?key=${encodeURIComponent(key)}`);
    check('A cleanup DELETE -> 200', del.status === 200, `status=${del.status} ${JSON.stringify(del.json)}`);
    if (del.status !== 200) console.warn(`WARNING: manual cleanup — R2 key not deleted: ${key}`);
  } catch (e) {
    console.warn(`WARNING: cleanup DELETE failed (${(e as Error).message}) — manual cleanup: delete R2 key ${key}`);
  }
}
async function caseB(port: number) { // LOCAL=true + R2 configured -> local only
  const s = statusOf((await getStatus(port)).json);
  check('B true -> forced local', s.forced === 'local', `forced=${s.forced}`);
  check('B true -> mode local', s.mode === 'local', `mode=${s.mode}`);
  const up = await uploadPng(port);
  const key = typeof up.json.key === 'string' ? up.json.key : '';
  check('B upload -> mode local', up.status === 200 && up.json.mode === 'local', `status=${up.status} ${JSON.stringify(up.json)}`);
  check('B url under /uploads/dev/', typeof up.json.url === 'string' && String(up.json.url).startsWith('/uploads/dev/'), String(up.json.url));
  const hit = (await listFiles(port)).find((f) => f.key === key);
  check('B list contains key with source local', !!hit && hit.source === 'local', hit ? `source=${hit.source}` : 'key missing from list');
  if (!key) return;
  const del = await api(port, 'DELETE', `/api/upload?key=${encodeURIComponent(key)}`);
  check('B DELETE -> 200', del.status === 200, `status=${del.status} ${JSON.stringify(del.json)}`);
  check('B key gone from list', !(await listFiles(port)).some((f) => f.key === key), 'key still listed after delete');
}
async function caseC(port: number) { // LOCAL=false, R2 NOT configured -> forced target is R2, unconfigured: GET shows mode r2 + r2:false + hint (the hint only fires when mode==='r2'), POST fails loudly
  const s = statusOf((await getStatus(port)).json);
  check('C false -> forced r2', s.forced === 'r2', `forced=${s.forced}`);
  check('C false + no R2 -> mode r2 (forced target, never silently local)', s.mode === 'r2', `mode=${s.mode}`);
  check('C status r2: false', s.r2 === false, `r2=${String(s.r2)}`);
  check('C hint mentions R2_ENDPOINT', typeof s.hint === 'string' && s.hint.includes('R2_ENDPOINT'), String(s.hint));
  const up = await uploadPng(port);
  const err = typeof up.json.error === 'string' ? up.json.error : '';
  check('C upload -> 500', up.status === 500, `status=${up.status}`);
  check('C error mentions R2_ENDPOINT', err.includes('R2_ENDPOINT'), err);
}
async function caseD(port: number) { // LOCAL=hybrid, R2 configured -> R2 (GET-only)
  const s = statusOf((await getStatus(port)).json);
  check('D hybrid -> forced hybrid', s.forced === 'hybrid', `forced=${s.forced}`);
  check('D hybrid -> mode r2', s.mode === 'r2', `mode=${s.mode}`);
}
async function caseE(port: number) { // garbage value -> auto, never silently-local
  const s = statusOf((await getStatus(port)).json);
  check('E banana -> forced hybrid (garbage degrades to auto)', s.forced === 'hybrid', `forced=${s.forced}`);
  check('E banana -> mode r2', s.mode === 'r2', `mode=${s.mode}`);
}
async function caseF(port: number) { // unset + no R2 -> Product B zero-config local
  const s = statusOf((await getStatus(port)).json);
  check('F unset + no R2 -> forced hybrid', s.forced === 'hybrid', `forced=${s.forced}`);
  check('F unset + no R2 -> mode local (frictionless)', s.mode === 'local', `mode=${s.mode}`);
  check('F status r2: false', s.r2 === false, `r2=${String(s.r2)}`);
}

// --- the run -------------------------------------------------------------------------
const CASES: { name: string; file: string; run: (port: number) => Promise<void> }[] = [
  { name: 'Case A — unset LOCAL, R2 configured', file: buildCaseFile(ORIGINAL.split(/\r?\n/), { strip: [...STRIP_ALWAYS, ...LOCAL_KEYS] }), run: caseA },
  { name: 'Case B — LOCAL=true, R2 configured', file: buildCaseFile(ORIGINAL.split(/\r?\n/), { strip: [...STRIP_ALWAYS, 'USE_LOCAL', 'STORAGE_LOCAL'], set: { LOCAL: 'true' } }), run: caseB },
  { name: 'Case C — LOCAL=false, R2 NOT configured', file: buildCaseFile(ORIGINAL.split(/\r?\n/), { strip: [...STRIP_ALWAYS, ...LOCAL_KEYS, ...STRIP_R2], set: { LOCAL: 'false' } }), run: caseC },
  { name: 'Case D — LOCAL=hybrid, R2 configured', file: buildCaseFile(ORIGINAL.split(/\r?\n/), { strip: [...STRIP_ALWAYS, 'USE_LOCAL', 'STORAGE_LOCAL'], set: { LOCAL: 'hybrid' } }), run: caseD },
  { name: 'Case E — LOCAL=banana (garbage), R2 configured', file: buildCaseFile(ORIGINAL.split(/\r?\n/), { strip: [...STRIP_ALWAYS, 'USE_LOCAL', 'STORAGE_LOCAL'], set: { LOCAL: 'banana' } }), run: caseE },
  { name: 'Case F — unset LOCAL, no R2 keys', file: buildCaseFile(ORIGINAL.split(/\r?\n/), { strip: [...STRIP_ALWAYS, ...LOCAL_KEYS, ...STRIP_R2] }), run: caseF },
];

async function main() {
  try {
    for (let i = 0; i < CASES.length; i++) {
      const c = CASES[i]!;
      const port = BASE_PORT + i;
      console.log(`\n== ${c.name} (port ${port}) ==`);
      writeFileSync(ENV_FILE, c.file); // swap BEFORE spawning this case's server
      const server = startServer(port);
      console.log('  booting next dev — silent while it compiles, up to 90s …');
      try {
        if (await waitReady(server)) {
          await c.run(port);
        } else {
          check(`${c.name}: server ready`, false, `no 200 from /api/upload within ${READY_CAP_MS / 1000}s`);
        }
      } finally {
        await killServer(server);
      }
    }
  } finally {
    if (!restoreOriginal()) {
      failures++;
      console.error(`WARNING: could not restore ${ENV_FILE} — recover with: cp ${BACKUP_FILE} ${ENV_FILE}`);
    }
  }
  const restored = readFileSync(ENV_FILE, 'utf8') === ORIGINAL;
  check('original .env.local restored byte-identical', restored, 'content differs from the original');
  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
  console.log(`NOTE: original ${ENV_FILE} restored${existsSync(BACKUP_FILE) ? ` (backup kept at ${BACKUP_FILE})` : ''}.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  restoreOriginal();
  console.error(e);
  process.exit(1);
});
