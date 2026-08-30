/**
 * 5e-i — shared asset-store helpers (R2 + local `public/uploads/`),
 * extracted from src/app/api/upload/route.ts so the portfolio delete purge
 * (DELETE /api/portfolio) drives the EXACT same client construction, env
 * aliases, and per-user prefix derivation as uploads do — one source of
 * truth, no drift between upload and delete. The upload route's `?list=1`
 * consumes `listAssetKeys` (single page, MaxKeys 100 — the long-standing
 * media-library shape); `purgeAssetPrefix` adds the paginated list +
 * batched-delete loop for real data deletion.
 *
 * LOCAL semantics (FIX-E, unchanged — mirrors the upload route):
 *   `LOCAL=true`    -> force local `public/uploads/` (never touches R2)
 *   `LOCAL=false`   -> force R2 (hosted) — purge reports a warning if R2 fails
 *   `LOCAL=hybrid`  -> auto coexist (same as unset)
 *   unset           -> auto (hybrid)
 * Aliases: `USE_LOCAL`/`STORAGE_LOCAL` act exactly like `LOCAL`; the R2 env
 * family (R2_ENDPOINT / R2_ACCOUNT_ID / R2_BUCKET / key aliases) matches the
 * upload route's accepted set.
 * Per-user: `uploads/<uid>/...` — uid from the Firebase session cookie
 * ONLY (FIX-B/FIX-H: never a client-supplied token — that was an
 * unverified prefix spoof). No admin config (Product B local) => the
 * shared `dev` prefix, by design.
 */
import path from 'node:path';
import { readdir, rm, stat } from 'node:fs/promises';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { getUserIdFromSessionCookie, isAdminConfigured } from '@/lib/firebase/admin';

function pickEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export function isLocalMode(): boolean | null {
  const raw = pickEnv('LOCAL', 'USE_LOCAL', 'STORAGE_LOCAL');
  // FIX-E restores 5b: unset = auto/hybrid — R2 if configured, else local.
  if (raw == null) return null;
  const v = raw.toLowerCase().trim();
  if (['true', '1', 'yes', 'local', 'offline'].includes(v)) return true;
  if (['false', '0', 'no', 'r2', 'remote'].includes(v)) return false;
  if (['hybrid', 'auto', 'both', 'coexist', 'mixed'].includes(v)) return null;
  return null; // FIX-E: unrecognized values degrade to auto, never silently-local
}

/**
 * The per-user folder name for a verified uid — shared by the upload
 * prefix derivation and the delete purge so both always target the same
 * `uploads/<sanitized-uid>/` folder. Hostile characters collapse to `_`
 * and the result is capped at 64 chars (identical to the original inline
 * expression in the upload route).
 */
export function assetPrefixForUid(uid: string): string {
  return uid.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

export async function getUserPrefix(request: Request): Promise<string> {
  // FIX-B/FIX-H: the session cookie is the ONLY identity source. The old
  // Bearer-token branch decoded an UNVERIFIED base64 payload to pick the
  // prefix — an unauthenticated prefix spoof (only reachable when admin
  // was unconfigured, but it undermines ownership checks). Removed.
  if (isAdminConfigured()) {
    const uid = await getUserIdFromSessionCookie(request);
    if (uid) return assetPrefixForUid(uid);
  }
  return pickEnv("R2_USER_PREFIX", "UPLOADS_PREFIX") ?? "dev";
}

function getR2Endpoint(): string | undefined {
  const direct = pickEnv('R2_ENDPOINT');
  if (direct) return direct;
  const accountId = pickEnv('R2_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID');
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  return undefined;
}

export function getR2Bucket(): string {
  return pickEnv('R2_BUCKET', 'R2_BUCKET_NAME', 'CLOUDFLARE_R2_BUCKET') ?? 'overengineered-portfolio';
}

function getR2PublicBase(): string | undefined {
  return pickEnv('R2_PUBLIC_URL', 'R2_PUBLIC_BASE_URL', 'R2_PUBLIC_DOMAIN', 'CLOUDFLARE_R2_PUBLIC_URL');
}

export function getR2Client(): S3Client | null {
  const endpoint = getR2Endpoint();
  const accessKeyId = pickEnv('R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID');
  const secretAccessKey = pickEnv('R2_SECRET_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_SECRET_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY');
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
}

export function getR2PublicUrl(key: string): string {
  const pub = getR2PublicBase();
  if (pub && !pub.includes('.r2.dev')) return `${pub.replace(/\/$/, '')}/${key}`;
  return `/api/r2/${key}`;
}

export function r2Configured(): { endpoint: boolean; accessKey: boolean; secretKey: boolean; bucket: string; publicBase: string | null; client: boolean } {
  const endpoint = !!getR2Endpoint();
  const accessKey = !!pickEnv('R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID');
  const secretKey = !!pickEnv('R2_SECRET_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_SECRET_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY');
  return { endpoint, accessKey, secretKey, bucket: getR2Bucket(), publicBase: getR2PublicBase() ?? null, client: !!getR2Client() };
}

/**
 * Single R2 list page (MaxKeys 100) under `prefix` — the media-library
 * listing contract: `?list=1` has always shown ONE page, and it keeps
 * doing exactly that. The delete purge paginates separately (see
 * purgeAssetPrefix). Swallowing failures matches the upload route's
 * original try/catch: an R2 hiccup yields an empty (local-only) library,
 * never a 500.
 */
export async function listAssetKeys(prefix: string): Promise<string[]> {
  const r2 = isLocalMode() === true ? null : getR2Client();
  if (!r2) return [];
  try {
    const bucket = getR2Bucket();
    // Caller's own folder only — never a bare uploads/ scan.
    const res = await r2.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 100 }));
    const keys: string[] = [];
    for (const o of res.Contents ?? []) if (o.Key) keys.push(o.Key);
    return keys;
  } catch {
    return [];
  }
}

export interface AssetPurgeResult {
  /**
   * R2 mode: the number of objects deleted. Local mode: 'local' (the
   * folder was removed; per-file counts are not tracked). Nothing to
   * purge (R2 unconfigured + no local folder) or the layer failed:
   * 'skipped'.
   */
  assets: number | 'local' | 'skipped';
  /** Human-readable warning when the layer partially/fully failed — null when clean. */
  warning: string | null;
}

/**
 * 5e-i — best-effort purge of EVERY object under `prefix` (the caller's
 * own `uploads/<uid>/`). Mirrors the upload route's mode selection:
 * forced-local never touches R2; otherwise R2 when configured (single
 * DeleteObjects batch per <=100-key page, paginated via ContinuationToken
 * until the prefix is empty). Failures are logged via console.warn and
 * reported in the result's warning — NEVER thrown, so a failed asset
 * purge cannot abort the doc/registry deletion that follows it.
 */
export async function purgeAssetPrefix(prefix: string): Promise<AssetPurgeResult> {
  const forced = isLocalMode();
  const r2 = forced === true ? null : getR2Client();
  if (r2) {
    try {
      const bucket = getR2Bucket();
      let deleted = 0;
      let failedTotal = 0;
      let token: string | undefined;
      do {
        const res = await r2.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: 100,
            ...(token ? { ContinuationToken: token } : {}),
          }),
        );
        // Defense-in-depth: only ever delete keys under the caller's own
        // prefix, whatever the store returns.
        const keys = (res.Contents ?? [])
          .map((o) => o.Key)
          .filter((k): k is string => typeof k === 'string' && k.startsWith(prefix));
        if (keys.length > 0) {
          const del = await r2.send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: { Objects: keys.map((k) => ({ Key: k })), Quiet: true },
            }),
          );
          const failed = del.Errors?.length ?? 0;
          deleted += keys.length - failed;
          failedTotal += failed;
          if (failed > 0) {
            console.warn(`[r2Assets] purge ${prefix}: ${failed} delete(s) failed`, del.Errors);
          }
        }
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (token);
      return {
        assets: deleted,
        warning: failedTotal > 0 ? `${failedTotal} uploaded file(s) could not be deleted.` : null,
      };
    } catch (e) {
      const message = (e as Error).message ?? 'unknown error';
      console.warn(`[r2Assets] R2 purge failed for ${prefix}:`, message);
      return { assets: 'skipped', warning: `Uploaded files could not be deleted (${message}).` };
    }
  }
  // Local mode: remove the uid's folder under public/ recursively. A
  // missing folder is fine (nothing to purge), not a failure.
  const dir = path.join(process.cwd(), 'public', prefix);
  try {
    await rm(dir, { recursive: true });
    return { assets: 'local', warning: null };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return { assets: 'skipped', warning: null };
    }
    const message = (e as Error).message ?? 'unknown error';
    console.warn(`[r2Assets] local purge failed for ${prefix}:`, message);
    return { assets: 'skipped', warning: `Uploaded files could not be deleted (${message}).` };
  }
}

// ---------------------------------------------------------------------------
// 5b upload quota — 50MB per user, enforced at upload time. The speced cap
// was deferred until per-user uids existed (5c); this closes it. The
// shared `dev` prefix (Product B local / anonymous) stays uncapped — it is
// single-tenant by design.
// ---------------------------------------------------------------------------

export const UPLOAD_QUOTA_BYTES = 50 * 1024 * 1024;

/** Bytes currently stored under `prefix` (R2 Content-Length sum with
 * pagination, or a local recursive walk). Failures read as 0 — the quota
 * check must never hard-block uploads on a listing hiccup. */
export async function getUsedBytes(prefix: string): Promise<number> {
  const r2 = isLocalMode() === true ? null : getR2Client();
  if (r2) {
    try {
      const bucket = getR2Bucket();
      let token: string | undefined;
      let total = 0;
      do {
        const res = await r2.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: 1000,
            ContinuationToken: token,
          }),
        );
        for (const o of res.Contents ?? []) total += o.Size ?? 0;
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (token);
      return total;
    } catch {
      return 0;
    }
  }
  try {
    const root = path.join(process.cwd(), 'public', prefix);
    let total = 0;
    const walk = async (dir: string, depth: number): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && depth < 4) await walk(full, depth + 1);
        else if (entry.isFile()) {
          const st = await stat(full).catch(() => null);
          total += st?.size ?? 0;
        }
      }
    };
    await walk(root, 0);
    return total;
  } catch {
    return 0;
  }
}
