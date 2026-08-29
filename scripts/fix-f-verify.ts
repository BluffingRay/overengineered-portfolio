// FIX-F E2E: /u/[slug] public render — doc-driven theme, server-side tab
// switch, 404-on-miss, never-the-seed, published-only posts (HTML source,
// not just DOM), editor-inert.
//
// LIVE and fully self-contained — spawns its own `next dev` on port 3131
// (route handlers read env at startup; the page is dynamic per request via
// searchParams). Env control is by FILE SWAP, never process-env override:
// `.env.local` is rebuilt per run by filtering lines (secret values are
// never printed). The original file is backed up to `.env.local.fixf-backup`
// BEFORE the first swap and restored in `finally` and in the SIGINT/SIGTERM
// handlers — Ctrl-C cannot leave it swapped.
//
// UNLIKE fix-e, this script KEEPS the Firebase admin trio + KV trio in the
// case file: `/u/[slug]` requires `isHosted()` true. Only the `LOCAL` trio
// and `ADMIN_PASSWORD` are stripped. The KV env vars are also loaded into
// THIS process (parsed from `.env.local`, never printed) so the script can
// seed and clean KV directly via `src/lib/kv.ts` + a local kvDelete.
//
// Preflights (never a silent pass): aborts when `.env.local` lacks the
// hosted keys, and when another `next dev` already runs on this directory —
// this modified Next build enforces ONE dev server per project dir (a
// second prints "Another next dev server is already running" and exits;
// see docs/specs/fix-e.md run notes). Stop the dev server first.
//
// Side effects: writes two temporary KV keys (`portfolio:fixf-test:default`,
// `portfolio:fixf-broken:default`) and deletes them again. Run from the
// repo root:
//   npx tsx scripts/fix-f-verify.ts
import { spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { kvPut } from '../src/lib/kv';

const ENV_FILE = '.env.local';
const BACKUP_FILE = '.env.local.fixf-backup';
const PORT = 3131;
const BASE_URL = `http://localhost:${PORT}`;
const READY_CAP_MS = 90_000; // first-compile can take 20s+ on WSL2
const REQUEST_TIMEOUT_MS = 15_000;
const PAGE_TIMEOUT_MS = 120_000; // the /u/ page compiles 5+ block modules
const TEST_KEY = 'portfolio:fixf-test:default';
const BROKEN_KEY = 'portfolio:fixf-broken:default';

// --- helpers (fix-e style) ---------------------------------------------------
type Json = Record<string, unknown>;
let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log((ok ? '  ok  ' : 'FAIL  ') + name + (ok ? '' : ` — ${detail}`));
  if (!ok) failures++;
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// --- .env.local parsing + line surgery (values never printed) -----------------
function loadEnvIntoProcess(): void {
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
function lineKey(line: string): string | null {
  const t = line.trim();
  if (t.startsWith('#') || !t.includes('=')) return null;
  return t.split('=')[0]!.trim() || null;
}
// Hosted keys the page needs — kept in both the case file and this process.
const REQUIRED_KEYS = [
  'CLOUDFLARE_ACCOUNT_ID',
  'KV_NAMESPACE_ID',
  'CLOUDFLARE_API_TOKEN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];
// Stripped everywhere: LOCAL would force the shell offline; ADMIN_PASSWORD
// is Product-B-only noise for this render.
const STRIP_KEYS = ['LOCAL', 'USE_LOCAL', 'STORAGE_LOCAL', 'ADMIN_PASSWORD'];
function buildCaseFile(base: string[]): string {
  return base
    .filter((line) => {
      const key = lineKey(line);
      return !key || !STRIP_KEYS.includes(key);
    })
    .join('\n');
}

// --- startup guards ------------------------------------------------------------
if (!existsSync(ENV_FILE)) {
  console.error(`ABORT: ${ENV_FILE} not found — run from the repo root.`);
  process.exit(1);
}
loadEnvIntoProcess();
{
  const keys = new Set(readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).map(lineKey));
  const missing = REQUIRED_KEYS.filter((k) => !keys.has(k));
  if (missing.length > 0) {
    console.error(
      `ABORT: ${ENV_FILE} lacks hosted env keys (${missing.join(', ')}) — ` +
      '/u/[slug] needs isHosted() true (Firebase admin + KV). Never a silent pass.',
    );
    process.exit(1);
  }
}
// This Next build runs ONE dev server per project directory — a second one
// exits at boot and the verify would fail with confusing readiness timeouts.
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
    // not Linux / no /proc — can't check; spawn will tell us.
  }
  return null;
}
{
  const blocker = findBlockingDevServer();
  if (blocker) {
    console.error(
      `ABORT: another next dev server is running on this directory (${blocker}). ` +
      'This Next build enforces one dev server per project dir — stop it first, ' +
      'run this script, then restart it.',
    );
    process.exit(1);
  }
}
const ORIGINAL = readFileSync(ENV_FILE, 'utf8');
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
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    restoreOriginal();
    process.exit(130);
  });
}

// --- KV seed/cleanup (direct, same URL shape as src/lib/kv.ts) ------------------
async function kvDelete(key: string): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
  const namespaceId = process.env.KV_NAMESPACE_ID!;
  const url =
    `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
    `/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN!}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`KV DELETE ${key} failed ${res.status}`);
  }
}

// A distinctive minimal doc: hud skin + accent, two tabs with per-tab rich
// text markers, one published + one draft post, footer proof string.
const TEST_DOC = {
  version: 3 as const,
  skin: 'hud',
  theme: { accentColor: '#ff8800' },
  cards: [],
  socials: [],
  posts: [
    {
      id: 'post-fixf-pub',
      title: 'Published Post Alpha',
      content: '<p>alpha body</p>',
      status: 'published' as const,
      publishedAt: '2026-01-02',
    },
    {
      id: 'post-fixf-draft',
      title: 'Draft Secret Beta',
      content: '<p>beta body</p>',
      status: 'draft' as const,
    },
  ],
  footer: {
    enabled: true,
    showSocials: false,
    copyrightText: '© {year} FixF Footer Proof',
  },
  tabs: [
    {
      id: 'tab-work',
      label: 'Studio Work',
      blocks: [
        {
          id: 'b-work-rich',
          type: 'rich_text' as const,
          content: '<p>WORKTAB MARKER PHASE ONE</p>',
          spacing: 'normal' as const,
        },
      ],
    },
    {
      id: 'tab-play',
      label: 'Playground Lab',
      blocks: [
        {
          id: 'b-play-rich',
          type: 'rich_text' as const,
          content: '<p>PLAYTAB MARKER PHASE TWO</p>',
          spacing: 'normal' as const,
        },
        {
          id: 'b-play-blog',
          type: 'blog' as const,
          spacing: 'normal' as const,
        },
      ],
    },
  ],
};

// --- server lifecycle -------------------------------------------------------------
function startServer(port: number): ReturnType<typeof spawn> {
  // inherit THIS process env (already loaded from .env.local) minus the
  // stripped keys — ambient env wins over .env files inside Next, so the
  // strip must happen here too or the case file's deletions are defeated
  const env: typeof process.env = { ...process.env };
  for (const k of Object.keys(env)) {
    if (STRIP_KEYS.includes(k)) delete env[k];
  }
  // detached => own process group; stdio ignored so server stdout (which can
  // echo env values) is never printed
  return spawn('npx', ['next', 'dev', '-p', String(port)], {
    detached: true,
    stdio: 'ignore',
    env,
  });
}
async function killServer(proc: ReturnType<typeof spawn>): Promise<void> {
  const pid = proc.pid;
  if (!pid) return;
  try { process.kill(-pid, 'SIGTERM'); } catch { /* group already gone */ }
  await sleep(400);
  try {
    process.kill(-pid, 0); // still alive?
    try { process.kill(-pid, 'SIGKILL'); } catch { /* gone meanwhile */ }
  } catch { /* ESRCH — already gone */ }
  await sleep(150);
}
async function waitReady(): Promise<boolean> {
  const deadline = Date.now() + READY_CAP_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/status`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as Json;
        // isHosted() must be true on the server — fail fast with a reason
        // if the case file/ambient env left the hosted shell off.
        check('server ready + isHosted() true', json.hosted === true, `hosted=${String(json.hosted)}`);
        return json.hosted === true;
      }
    } catch { /* not up yet — retry */ }
    await sleep(500);
  }
  return false;
}

// --- HTTP helpers -----------------------------------------------------------------
async function getPage(path: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    redirect: 'manual',
  });
  return { status: res.status, body: await res.text() };
}

// --- cases -------------------------------------------------------------------------
async function caseA() { // bare /u/fixf-test: doc-driven render, tab 1
  const { status, body } = await getPage('/u/fixf-test');
  check('A GET /u/fixf-test -> 200', status === 200, `status=${status}`);
  check('A data-skin="hud" on the wrapper', body.includes('data-skin="hud"'), 'missing');
  check('A doc accent applied (--accent:#ff8800)', body.includes('--accent:#ff8800'), 'missing');
  check('A tab 1 nav label present', body.includes('Studio Work'), 'missing');
  check('A tab 2 nav label present', body.includes('Playground Lab'), 'missing');
  check('A tab 1 panel rendered server-side', body.includes('WORKTAB MARKER PHASE ONE'), 'missing');
  check('A tab 2 panel NOT the active one', !body.includes('id="panel-tab-play"'), 'found');
  check('A published post title present', body.includes('Published Post Alpha'), 'missing');
  check('A draft title absent (DOM + flight source)', !body.includes('Draft Secret Beta'), 'LEAKED');
  check('A footer rendered from doc', body.includes('FixF Footer Proof'), 'missing');
}
async function caseB() { // ?t=tab-play: server-rendered tab switch
  const { status, body } = await getPage('/u/fixf-test?t=tab-play');
  check('B GET ?t=tab-play -> 200', status === 200, `status=${status}`);
  check('B tab 2 panel is the active one', body.includes('id="panel-tab-play"'), 'missing');
  check('B tab 1 panel not rendered', !body.includes('id="panel-tab-work"'), 'found');
  check('B tab 2 content present', body.includes('PLAYTAB MARKER PHASE TWO'), 'missing');
}
async function caseC() { // unknown slug -> 404, never a render
  const { status } = await getPage('/u/nonexistent-slug');
  check('C GET /u/nonexistent-slug -> 404', status === 404, `status=${status}`);
}
async function caseD() { // garbage stored doc -> 404, never the seed
  const { status, body } = await getPage('/u/fixf-broken');
  check('D GET /u/fixf-broken (garbage KV doc) -> 404', status === 404, `status=${status}`);
  check('D seed content absent (never-the-seed)', !body.includes('Pixel Forge'), 'seed leaked');
}
async function caseE() { // ?edit=true is inert — no editor markup anywhere
  const { status, body } = await getPage('/u/fixf-test?edit=true');
  check('E GET ?edit=true -> 200 (still renders)', status === 200, `status=${status}`);
  check('E no UtilityBar markup (Undo hint absent)', !body.includes('Undo (Ctrl/Cmd+Z)'), 'found');
  check('E no editor accent controls', !body.includes('Custom accent color hex'), 'found');
}

// --- the run -------------------------------------------------------------------------
async function main() {
  writeFileSync(ENV_FILE, buildCaseFile(ORIGINAL.split(/\r?\n/)));
  const server = startServer(PORT);
  let seeded = false;
  try {
    // Seed KV directly (independent of the server) while it boots.
    await kvPut(TEST_KEY, JSON.stringify(TEST_DOC));
    await kvPut(BROKEN_KEY, 'not-json-at-all {{{');
    seeded = true;

    if (await waitReady()) {
      await caseA();
      await caseB();
      await caseC();
      await caseD();
      await caseE();
    } else {
      check('server ready + isHosted() true', false, `no response from /api/auth/status within ${READY_CAP_MS / 1000}s`);
    }
  } finally {
    await killServer(server);
    if (seeded) {
      try {
        await kvDelete(TEST_KEY);
        await kvDelete(BROKEN_KEY);
        check('cleanup: KV test keys deleted', true);
      } catch (e) {
        check('cleanup: KV test keys deleted', false, (e as Error).message);
      }
    }
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
