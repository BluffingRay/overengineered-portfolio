import { kvGet, kvPut } from '@/lib/kv';
import type { PortfolioData, PortfolioVisibility } from '@/types/schema';

/**
 * 5e-a — the hosted portfolio registry. KV is exact-key get/put, so "list
 * all portfolios" (showcase, slug availability) is served by ONE maintained
 * index key: a complete per-uid registry. Completeness is required for
 * slug-uniqueness enforcement; the showcase filters on read.
 *
 * ⚠️ Concurrency model: read-modify-write on a single key. Two users saving
 * at the same instant can lose one index update (the doc itself is never
 * lost — each doc lives under its own key). Accepted MVP limit for
 * classmate-scale traffic, same family as last-save-wins; move to a real
 * transactional store (Turso, the 5a fallback) if this ever matters.
 */

export const PORTFOLIO_INDEX_KEY = 'portfolios:index';

export interface PortfolioIndexEntry {
  slug: string | null;
  visibility: PortfolioVisibility;
  showcase: boolean;
  updatedAt: number;
}

export type PortfolioIndex = Record<string, PortfolioIndexEntry>;

/** Derive the registry entry for a doc — the doc is the source of truth. */
export function deriveIndexEntry(
  uid: string,
  doc: PortfolioData,
  now: number = Date.now(),
): PortfolioIndexEntry {
  return {
    slug: doc.slug ?? null,
    visibility: doc.visibility ?? 'private',
    showcase: doc.showcase === true,
    updatedAt: now,
  };
}

/** Parse raw index JSON, dropping anything malformed — never trust KV blindly. */
export function parseIndex(raw: string | null): PortfolioIndex {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {};
  }
  const index: PortfolioIndex = {};
  for (const [uid, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof uid !== 'string' || uid === '') continue;
    if (typeof value !== 'object' || value === null) continue;
    const v = value as Record<string, unknown>;
    const visibility =
      v.visibility === 'public' || v.visibility === 'private' ? v.visibility : 'private';
    index[uid] = {
      slug: typeof v.slug === 'string' && v.slug !== '' ? v.slug : null,
      visibility,
      showcase: v.showcase === true,
      updatedAt: typeof v.updatedAt === 'number' && Number.isFinite(v.updatedAt) ? v.updatedAt : 0,
    };
  }
  return index;
}

/** Pure merge — returns a NEW registry with the uid's entry replaced. */
export function mergeIndexEntry(
  index: PortfolioIndex,
  uid: string,
  entry: PortfolioIndexEntry,
): PortfolioIndex {
  return { ...index, [uid]: entry };
}

export async function readIndex(): Promise<PortfolioIndex> {
  return parseIndex(await kvGet(PORTFOLIO_INDEX_KEY));
}

export async function writeIndex(index: PortfolioIndex): Promise<void> {
  await kvPut(PORTFOLIO_INDEX_KEY, JSON.stringify(index));
}

/**
 * Read-merge-write the registry entry for this doc. Failures NEVER fail the
 * save (the doc lives under its own key and is the truth) — the next save
 * heals the index; callers may surface a soft warning.
 */
export async function updateIndexForDoc(
  uid: string,
  doc: PortfolioData,
): Promise<boolean> {
  try {
    const index = await readIndex();
    await writeIndex(
      mergeIndexEntry(index, uid, deriveIndexEntry(uid, doc)),
    );
    return true;
  } catch {
    return false;
  }
}
