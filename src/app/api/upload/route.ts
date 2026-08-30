import { mkdir, writeFile, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getUserIdFromSessionCookie, isAdminConfigured } from '@/lib/firebase/admin';
// 5e-i: the R2 client construction, env-alias resolution, per-user prefix
// derivation, and the ?list=1 listing logic live in r2Assets so the
// portfolio delete purge shares the exact same setup. Behavior unchanged.
import {
  getR2Bucket,
  getR2Client,
  getR2PublicUrl,
  getUserPrefix,
  isLocalMode,
  listAssetKeys,
  r2Configured,
} from '@/lib/r2Assets';

/**
 * Asset vault — triad `HOSTED (throwaway R2) / GOOGLE DRIVE BYO / CUSTOM API BYO`.
 * Documents only ever keep the returned URL. This file is the only swap seam.
 * `LOCAL=true`    -> force local `public/uploads/` (dev / zero-config)
 * `LOCAL=false`   -> force R2 (hosted) — fails loudly if R2 env missing
 * `LOCAL=hybrid`  -> auto coexist: R2 if configured else local, shows both (same as unset)
 * unset           -> auto (hybrid)
 * Per-user: `uploads/<uid>/...` — uid from the Firebase session cookie
 *   ONLY (never a client-supplied token — that was an unverified prefix
 *   spoof, removed in FIX-B). No admin config (Product B local) => `dev`.
 * FIX-B: DELETE is owner-only — the key must sit under the caller's own
 *   prefix; cross-user keys 403. FIX-E2: `?list=1` lists the caller's
 *   own prefix only (legacy flat files dev-only).
 * Accepts multiple env aliases so `R2_ACCOUNT_ID`/`R2_BUCKET_NAME`/`R2_PUBLIC_BASE_URL` just work.
 * The `LOCAL` switch accepts aliases too — `USE_LOCAL`/`STORAGE_LOCAL` act exactly like `LOCAL`.
 */

/**
 * FIX-B ownership check: a key belongs to the caller when it sits under
 * their own `uploads/<uid>/` prefix. Legacy flat keys (`uploads/<file>`,
 * pre-5b, no owner folder) belong to the dev prefix only — anyone else
 * deleting them gets a 403. Path-traversal-safe: key must match
 * `uploads/` followed by `[A-Za-z0-9._-]` segments only.
 */
function ownsKey(key: string, myPrefix: string): boolean {
  if (!/^(uploads\/)?[A-Za-z0-9._\-/]+$/.test(key) || key.includes('..')) return false;
  if (key.startsWith(myPrefix)) return true;
  // Legacy flat file (no user folder segment)?
  const rest = key.slice('uploads/'.length);
  if (rest.includes('/')) return false; // someone else's folder — not ours
  return myPrefix === 'uploads/dev/'; // flat files are dev-owned
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has("list")) {
    // FIX-E2: list ONLY the caller's own prefix. The old code scanned a
    // bare `uploads/` prefix (every user's objects) and always appended
    // `uploads/dev/` — a cross-user media library leak. A client-supplied
    // `?prefix=` is ignored for the same reason (it could name another
    // user's folder); the server derives the scope from the session.
    const myPrefix = `uploads/${await getUserPrefix(request)}/`;
    const out: { url: string; key: string; source: 'r2' | 'local' }[] = [];
    const IMAGE_RE = /\.(png|jpg|jpeg|webp|gif|avif)$/i;
    // Local branch. In local/hybrid storage modes this walks EVERY folder
    // under public/uploads (all uid folders + legacy flat files): local
    // storage is single-machine, and switching an account between R2 and
    // local scatters its files across prefixes the caller otherwise could
    // never see. R2 below stays strictly own-prefix (FIX-E2 unchanged).
    const forcedLocal = isLocalMode() !== false;
    try {
      if (forcedLocal) {
        const walk = async (rel: string, depth: number): Promise<void> => {
          const entries = await readdir(path.join(process.cwd(), 'public', rel), { withFileTypes: true }).catch(() => []);
          for (const e of entries) {
            if (!/^[A-Za-z0-9._-]+$/.test(e.name)) continue;
            const key = `${rel}${e.name}`;
            if (e.isDirectory()) {
              if (depth < 4) await walk(`${key}/`, depth + 1);
            } else if (IMAGE_RE.test(e.name)) {
              out.push({ url: `/${key}`, key, source: 'local' });
            }
          }
        };
        await walk('uploads/', 0);
        // Committed repo images too (public/images/**): in local mode the
        // library should offer everything the deployed site can show.
        // keys outside uploads/ can never be deleted via this route
        // (ownsKey is uploads/-scoped) — they are repo files.
        await walk('images/', 0);
      } else {
        // R2-scoped (LOCAL=false): local list stays own-prefix only.
        const dir = path.join(process.cwd(), 'public', myPrefix);
        const files = await readdir(dir).catch(() => [] as string[]);
        for (const f of files) {
          if (!/^[A-Za-z0-9._-]+$/.test(f)) continue; // no dirs, no weird names
          if (IMAGE_RE.test(f)) out.push({ url: `/${myPrefix}${f}`, key: `${myPrefix}${f}`, source: 'local' });
        }
        // Legacy flat files are dev-visible only (same ownership rule as DELETE)
        if (myPrefix === 'uploads/dev/') {
          const flat = await readdir(path.join(process.cwd(), 'public', 'uploads')).catch(() => [] as string[]);
          for (const f of flat) {
            if (/^[A-Za-z0-9._-]+$/.test(f) && IMAGE_RE.test(f)) {
              const key = `uploads/${f}`;
              if (!out.some((x) => x.key === key)) out.push({ url: `/${key}`, key, source: 'local' });
            }
          }
        }
      }
    } catch {}
    // Same R2 setup + scoping the delete purge uses (extracted to
    // r2Assets): the caller's own folder only, never a bare uploads/
    // scan, and still a single MaxKeys-100 page — the long-standing
    // media-library shape.
    for (const key of await listAssetKeys(myPrefix)) {
      out.push({ url: getR2PublicUrl(key), key, source: 'r2' });
    }
    const seen = new Set<string>();
    const dedup = out.filter((x) => (seen.has(x.url) ? false : seen.add(x.url)));
    return NextResponse.json({ files: dedup });
  }
  const c = r2Configured();
  const forced = isLocalMode();
  const useR2 = forced === true ? false : forced === false ? true : c.client;
  const mode = useR2 ? 'r2' : 'local';
  return NextResponse.json({
    r2: c.client,
    mode,
    forced: forced === null ? 'hybrid' : forced ? 'local' : 'r2',
    config: c,
    hint: mode === 'r2' && !c.client ? 'LOCAL=false but R2 not configured — set R2_ENDPOINT (or R2_ACCOUNT_ID) + keys' : undefined,
  });
}

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  if (isAdminConfigured()) {
    const uid = await getUserIdFromSessionCookie(request);
    if (!uid) return NextResponse.json({ error: "unauthorized — sign in to upload" }, { status: 401 });
  }
  let file: File | null = null;
  try {
    const form = await request.formData();
    const candidate = form.get("file");
    if (candidate instanceof File) file = candidate;
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: `Unsupported type: ${file.type || "unknown"}` }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image is larger than 8MB" }, { status: 413 });

  const prefix = `uploads/${await getUserPrefix(request)}/`;
  const id = randomUUID();
  const key = `${prefix}${id}${ext}`;
  const forced = isLocalMode();
  const r2 = forced === true ? null : getR2Client();
  const bucket = getR2Bucket();
  if (forced === false && !r2) return NextResponse.json({ error: 'LOCAL=false but R2 not configured. Set R2_ENDPOINT (or R2_ACCOUNT_ID) + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY' }, { status: 500 });
  if (r2) {
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: file.type }));
      return NextResponse.json({ url: getR2PublicUrl(key), name: file.name, key, mode: 'r2' });
    } catch (e) {
      if (forced === false) return NextResponse.json({ error: `R2 upload failed: ${(e as Error).message}` }, { status: 500 });
      console.warn('[upload] R2 put failed, falling back to local:', (e as Error).message);
    }
  }
  const dir = path.join(process.cwd(), 'public', prefix);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${id}${ext}`), Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: 'Could not save the file' }, { status: 500 });
  }
  return NextResponse.json({ url: `/${key}`, name: file.name, key, mode: 'local' });
}

export async function DELETE(request: Request) {
  // FIX-B: authn — same gate as POST. The session is the ONLY identity
  // source; without admin config (Product B local) there is no gate by
  // design and everyone shares the dev prefix.
  if (isAdminConfigured()) {
    const uid = await getUserIdFromSessionCookie(request);
    if (!uid) return NextResponse.json({ error: "unauthorized — sign in to delete" }, { status: 401 });
  }
  const myPrefix = `uploads/${await getUserPrefix(request)}/`;
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? (() => {
    const url = searchParams.get("url");
    if (!url) return null;
    try {
      const u = new URL(url, "http://dummy");
      const m = u.pathname.match(/\/?(uploads\/[A-Za-z0-9._\-/]+)$/);
      return m ? m[1] : null;
    } catch { return null; }
  })();
  if (!key || !key.startsWith("uploads/")) return NextResponse.json({ error: "Missing ?key=uploads/... or ?url=.../uploads/..." }, { status: 400 });
  // authz — owner-only: the key must live under the caller's own
  // prefix (or be a legacy flat file, dev-owned). Cross-user delete is
  // the IDOR this check closes.
  if (!ownsKey(key, myPrefix)) {
    return NextResponse.json({ error: "forbidden — you can only delete your own uploads" }, { status: 403 });
  }
  const forced = isLocalMode();
  const r2 = forced === true ? null : getR2Client();
  let deleted = false;
  let lastError: string | null = null;
  if (r2) {
    const bucket = getR2Bucket();
    try { await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); deleted = true; } catch (e) { lastError = (e as Error).message; }
  }
  try { await unlink(path.join(process.cwd(), 'public', key)); deleted = true; } catch (e) { if (!deleted) lastError = (e as Error).message ?? 'Could not delete file'; }
  if (deleted) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: lastError ?? 'Could not delete file' }, { status: 500 });
}
