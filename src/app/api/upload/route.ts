import { mkdir, writeFile, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

/**
 * Asset vault — triad `HOSTED (throwaway R2) / GOOGLE DRIVE BYO / CUSTOM API BYO`.
 * Documents only ever keep the returned URL. This file is the only swap seam.
 * `LOCAL=true`    -> force local `public/uploads/` (dev / zero-config)
 * `LOCAL=false`   -> force R2 (hosted) — fails loudly if R2 env missing
 * `LOCAL=hybrid`  -> auto coexist: R2 if configured else local, shows both (same as unset)
 * unset           -> auto (hybrid)
 * Per-user: `uploads/<uid>/...` — uid from Firebase ID token, else `dev` for now.
 * Accepts multiple env aliases so `R2_ACCOUNT_ID`/`R2_BUCKET_NAME`/`R2_PUBLIC_BASE_URL` just work.
 */
function pickEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}
function isLocalMode(): boolean | null {
  const raw = pickEnv('LOCAL', 'USE_LOCAL', 'STORAGE_LOCAL');
  if (raw == null) return null;
  const v = raw.toLowerCase().trim();
  if (['true', '1', 'yes', 'local'].includes(v)) return true;
  if (['false', '0', 'no', 'r2', 'remote'].includes(v)) return false;
  if (['hybrid', 'auto', 'both', 'coexist', 'mixed'].includes(v)) return null;
  return null;
}
function getUserPrefix(request: Request): string {
  const auth = request.headers.get('authorization') ?? '';
  const m = auth.match(/^Bearer\s+(.+)$/);
  if (m) {
    try {
      const payload = JSON.parse(Buffer.from(m[1].split('.')[1] ?? '', 'base64').toString());
      if (payload?.uid) return String(payload.uid).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
      if (payload?.user_id) return String(payload.user_id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    } catch {}
  }
  return pickEnv('R2_USER_PREFIX', 'UPLOADS_PREFIX') ?? 'dev';
}
function getR2Endpoint(): string | undefined {
  const direct = pickEnv('R2_ENDPOINT');
  if (direct) return direct;
  const accountId = pickEnv('R2_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID');
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  return undefined;
}
function getR2Bucket(): string {
  return pickEnv('R2_BUCKET', 'R2_BUCKET_NAME', 'CLOUDFLARE_R2_BUCKET') ?? 'overengineered-portfolio';
}
function getR2PublicBase(): string | undefined {
  return pickEnv('R2_PUBLIC_URL', 'R2_PUBLIC_BASE_URL', 'R2_PUBLIC_DOMAIN', 'CLOUDFLARE_R2_PUBLIC_URL');
}
function getR2Client(): S3Client | null {
  const endpoint = getR2Endpoint();
  const accessKeyId = pickEnv('R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID');
  const secretAccessKey = pickEnv('R2_SECRET_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_SECRET_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY');
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
}
function getR2PublicUrl(key: string): string {
  const pub = getR2PublicBase();
  if (pub && !pub.includes('.r2.dev')) return `${pub.replace(/\/$/, '')}/${key}`;
  return `/api/r2/${key}`;
}
function r2Configured(): { endpoint: boolean; accessKey: boolean; secretKey: boolean; bucket: string; publicBase: string | null; client: boolean } {
  const endpoint = !!getR2Endpoint();
  const accessKey = !!pickEnv('R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID');
  const secretKey = !!pickEnv('R2_SECRET_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_SECRET_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY');
  return { endpoint, accessKey, secretKey, bucket: getR2Bucket(), publicBase: getR2PublicBase() ?? null, client: !!getR2Client() };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has('list')) {
    const prefix = url.searchParams.get('prefix') ?? `uploads/${getUserPrefix(request)}/`;
    // also list dev fallback so old uploads/dev still show in hybrid
    const prefixes = prefix === 'uploads/dev/' ? [prefix] : [prefix, 'uploads/dev/'];
    const out: { url: string; key: string; source: 'r2' | 'local' }[] = [];
    // local public/uploads/<prefix>
    try {
      for (const p of prefixes) {
        const dir = path.join(process.cwd(), 'public', p);
        const files = await readdir(dir).catch(() => [] as string[]);
        for (const f of files) if (/\.(png|jpg|jpeg|webp|gif|avif)$/i.test(f)) out.push({ url: `/${p}${f}`, key: `${p}${f}`, source: 'local' });
      }
      // legacy flat public/uploads (no user folder) for migration
      const flat = await readdir(path.join(process.cwd(), 'public', 'uploads')).catch(() => [] as string[]);
      for (const f of flat) if (/\.(png|jpg|jpeg|webp|gif|avif)$/i.test(f) && !f.includes('.')) {} // handled above; keep flat only if not already
      // actually include flat files that are not dirs
      for (const f of flat) {
        if (f.includes('.') && /\.(png|jpg|jpeg|webp|gif|avif)$/i.test(f)) {
          const key = `uploads/${f}`;
          if (!out.some((x) => x.key === key)) out.push({ url: `/${key}`, key, source: 'local' });
        }
      }
    } catch {}
    const r2 = isLocalMode() === true ? null : getR2Client();
    if (r2) {
      try {
        const bucket = getR2Bucket();
        for (const p of prefixes) {
          const res = await r2.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: p, MaxKeys: 100 }));
          for (const o of res.Contents ?? []) if (o.Key) out.push({ url: getR2PublicUrl(o.Key), key: o.Key, source: 'r2' });
        }
        // also list legacy flat uploads/ for migration
        if (prefix !== 'uploads/') {
          const res = await r2.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'uploads/', MaxKeys: 100 }));
          for (const o of res.Contents ?? []) if (o.Key && !out.some((x) => x.key === o.Key)) out.push({ url: getR2PublicUrl(o.Key!), key: o.Key!, source: 'r2' });
        }
      } catch {}
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
  let file: File | null = null;
  try {
    const form = await request.formData();
    const candidate = form.get('file');
    if (candidate instanceof File) file = candidate;
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: `Unsupported type: ${file.type || 'unknown'}` }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image is larger than 8MB' }, { status: 413 });

  const prefix = `uploads/${getUserPrefix(request)}/`;
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
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') ?? (() => {
    const url = searchParams.get('url');
    if (!url) return null;
    try {
      const u = new URL(url, 'http://dummy');
      const m = u.pathname.match(/\/?(uploads\/.+)$/);
      return m ? m[1] : null;
    } catch { return null; }
  })();
  if (!key || !key.startsWith('uploads/')) return NextResponse.json({ error: 'Missing ?key=uploads/... or ?url=.../uploads/...' }, { status: 400 });
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
