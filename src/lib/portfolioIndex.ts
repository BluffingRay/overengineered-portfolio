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
  /**
   * 5e-c: display name for showcase cards — the doc's first featured_hero
   * block's `name`, else its `heading`, else null. Optional for backwards
   * compatibility: entries written before 5e-c carry no title (parseIndex
   * leaves it absent, which consumers treat as null via `?? null`).
   */
  title?: string | null;
}

export type PortfolioIndex = Record<string, PortfolioIndexEntry>;

/**
 * 5e-c: the doc's display title — the FIRST featured_hero block decides
 * (`name` wins over `heading`; a hero with neither, or no hero at all,
 * yields null). Refreshed on every save; the doc is the truth.
 */
function deriveDocTitle(doc: PortfolioData): string | null {
  for (const tab of doc.tabs) {
    for (const block of tab.blocks) {
      if (block.type !== 'featured_hero') continue;
      if (block.name !== undefined && block.name.trim() !== '') return block.name;
      if (block.heading.trim() !== '') return block.heading;
      return null;
    }
  }
  return null;
}

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
    title: deriveDocTitle(doc),
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
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const v = value as Record<string, unknown>;
    const visibility =
      v.visibility === 'public' || v.visibility === 'private' ? v.visibility : 'private';
    index[uid] = {
      slug: typeof v.slug === 'string' && v.slug !== '' ? v.slug : null,
      visibility,
      showcase: v.showcase === true,
      updatedAt: typeof v.updatedAt === 'number' && Number.isFinite(v.updatedAt) ? v.updatedAt : 0,
      // 5e-c: a non-empty string title is kept as-is; anything else is
      // dropped (absent — consumers read it as null via `?? null`). The key
      // stays OFF for coerced entries so pre-5e-c parse output remains
      // byte-identical (5e-a verify deep-equals the coerced shape).
      ...(typeof v.title === 'string' && v.title.trim() !== '' ? { title: v.title } : {}),
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

/**
 * 5e-i — pure removal — returns a NEW registry without the uid's entry.
 * Every other uid is untouched (same references); a uid that was never
 * present yields an unchanged-equivalent index (still a fresh object, so
 * callers can always treat the result as their own copy). Never mutates
 * the input.
 */
export function removeIndexEntry(
  index: PortfolioIndex,
  uid: string,
): PortfolioIndex {
  const next = { ...index };
  delete next[uid];
  return next;
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

/**
 * 5e-i — read-remove-write the registry entry for a deleted portfolio.
 * Same never-fail-the-request contract as updateIndexForDoc: the doc is
 * already gone (the registry is a derived index), so a failure only means
 * a stale entry (its `/u/<slug>` 404s, the showcase filters on read) until
 * the next write heals the key. Callers surface a soft warning.
 */
export async function removeFromIndex(uid: string): Promise<boolean> {
  try {
    const index = await readIndex();
    await writeIndex(removeIndexEntry(index, uid));
    return true;
  } catch {
    return false;
  }
}

/**
 * Scan the registry for the uid owning `slug`. PURE — reads `index`,
 * never mutates it.
 *
 * Case handling: stored slugs are already lowercase (`normalizeSlug` at
 * write time), so only the REQUESTED slug is lowercased here and stored
 * slugs are compared as-is (a corrupt uppercase stored slug surfaces as a
 * miss + legacy fallback, never a silent match). Entries with
 * `slug === null` (no slug assigned yet) never match.
 *
 * Corruption policy: two uids holding one slug is registry corruption
 * (PUT's 409 conflict check prevents it). If it happens anyway, the FIRST
 * match in `Object.entries` order wins — deterministic for a given index.
 */
export function matchSlugInIndex(
  index: PortfolioIndex,
  slug: string,
): string | null {
  const needle = slug.toLowerCase();
  for (const [uid, entry] of Object.entries(index)) {
    if (entry.slug !== null && entry.slug === needle) return uid;
  }
  return null;
}

/** A showcase card — the route strips `uid` before responding (never leak internal ids). */
export interface ShowcaseEntry {
  uid: string;
  slug: string;
  title: string | null;
  updatedAt: number;
}

/**
 * 5e-c — THE showcase filter (callers must not re-filter): opted-in
 * (`showcase === true`) AND public AND slug-assigned AND not the caller,
 * newest save first. PURE — reads `index`, never mutates it; returns a
 * fresh sorted array.
 */
export function filterShowcase(
  index: PortfolioIndex,
  excludeUid: string,
): ShowcaseEntry[] {
  const showcase: ShowcaseEntry[] = [];
  for (const [uid, entry] of Object.entries(index)) {
    if (uid === excludeUid) continue;
    if (entry.slug === null) continue;
    if (entry.visibility !== 'public') continue;
    if (entry.showcase !== true) continue;
    showcase.push({
      uid,
      slug: entry.slug,
      title: entry.title ?? null,
      updatedAt: entry.updatedAt,
    });
  }
  showcase.sort((a, b) => b.updatedAt - a.updatedAt);
  return showcase;
}

/**
 * Registry lookup for the /u/<slug> page: resolve a URL slug to its owning
 * uid, threaded out as `{ uid }` (5e-h — the visibility gate needs the OWNER
 * identity, not just "someone owns this slug"). Delegates to
 * `matchSlugInIndex`, so the case/null/corruption semantics above hold here
 * unchanged. Miss semantics are also unchanged: an unreadable index (KV
 * failure) is a registry MISS, not an error — the legacy uid-slug fallback
 * still applies, so availability degrades to FIX-F behavior and this step
 * never 500s the render.
 */
export async function resolveSlug(
  slug: string,
): Promise<{ uid: string } | null> {
  try {
    const uid = matchSlugInIndex(await readIndex(), slug);
    return uid === null ? null : { uid };
  } catch {
    return null;
  }
}

/** uid-only view of resolveSlug — kept for consumers that need just the string. */
export async function findUidBySlug(slug: string): Promise<string | null> {
  return (await resolveSlug(slug))?.uid ?? null;
}
