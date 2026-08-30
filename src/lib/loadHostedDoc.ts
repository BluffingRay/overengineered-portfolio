// 5f-a — resolveHostedDoc moved here VERBATIM from
// src/app/(a-shell)/u/[slug]/docLoader.ts (same cache() wrap, same
// comments — the 5d-b note below predates this move): the export route is
// the second consumer of the slug->doc resolution, and a lib module keeps
// the server boundary clean ((a-shell) is page territory; shared server
// helpers live in src/lib). stripDrafts at the bottom is the ONE
// draft-stripping helper — it replaces the /u/ page's inline copy and
// api/portfolio/route.ts's filterPublicDoc.
// 5d-b — resolveHostedDoc moved here verbatim from page.tsx (same cache()
// wrap, same comments): the /u/[slug] opengraph-image and icon routes need
// the same doc load as the page, and React cache() is request-scoped but
// MODULE-shared — importing this module from the page and both image routes
// keeps the per-request dedupe spanning every consumer. Plain server module;
// it deliberately exposes NO cookie access — the image routes' leak gate is
// isPubliclyIndexable, never the session.
import { cache } from 'react';
import { kvGet, portfolioKeyFor } from '@/lib/kv';
import { resolveSlug } from '@/lib/portfolioIndex';
import { prepareDocument } from '@/lib/storage';
import { sanitizePortfolioDocument } from '@/lib/sanitize-html';
import type { PortfolioData } from '@/types/schema';

/**
 * 5d-a — the resolution pipeline (5e-b registry-first `resolveSlug` →
 * `kvGet` → `prepareDocument` → `sanitizePortfolioDocument`) wrapped in
 * React cache(): generateMetadata and the page body both call it with the
 * same slug, and the per-request memo means the pipeline — and its KV/index
 * reads — run ONCE per request instead of twice.
 *
 * Returns the sanitized doc threaded with its owner uid (the 5e-h gate in
 * the page body needs the OWNER identity — same reason resolveSlug threads
 * `{ uid }`), or null on a miss. notFound() decisions stay with the
 * CALLERS: metadata never calls it, so a miss degrades to generic tags
 * there and to a 404 in the page. A doc-get KV failure still throws
 * (propagates as a 500), exactly as before the extraction.
 */
export const resolveHostedDoc = cache(
  async (
    slug: string,
  ): Promise<{ doc: PortfolioData; ownerUid: string } | null> => {
    // 5e-b — registry-first resolution: slug -> uid via portfolios:index.
    // 5e-h — the resolution threads out the doc's owner uid: a registry hit
    // means the index's uid owns the doc; on the legacy uid-slug path the RAW
    // param IS the uid (uids are case-sensitive — never lowercased).
    const resolved = await resolveSlug(slug);
    let raw: string | null;
    let ownerUid: string;
    if (resolved) {
      // Index hit: the registry is authoritative for this identity — a
      // missing/unreadable doc is a missing page, NO legacy fallthrough.
      ownerUid = resolved.uid;
      raw = await kvGet(portfolioKeyFor(resolved.uid));
    } else {
      // Registry miss (or unreadable index): legacy FIX-F uid-slug compat,
      // keyed with the RAW param — uids are case-sensitive.
      ownerUid = slug;
      raw = await kvGet(`portfolio:${slug}:default`);
    }
    if (!raw) return null;

    try {
      const prepared = prepareDocument(JSON.parse(raw));
      if (prepared) {
        // FIX-A: KV may hold pre-sanitization docs — render only the
        // sanitized RETURN, never the input.
        return { doc: sanitizePortfolioDocument(prepared), ownerUid };
      }
    } catch {
      // invalid stored doc — a missing page, not the seed
    }
    return null;
  },
);

/**
 * 5f-a — the ONE draft-stripping helper: `{ ...doc, posts }` with posts
 * filtered to published-only and sorted by publishedAt desc — exactly the
 * /u/ page's former inline shape (filter + sort + spread), now shared with
 * the export route and GET /api/portfolio (whose filterPublicDoc lacked
 * the sort). filter() returns a fresh array, so the in-place sort never
 * mutates the stored doc's posts.
 */
export function stripDrafts(doc: PortfolioData): PortfolioData {
  const publishedPosts = (doc.posts ?? [])
    .filter((post) => post.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  return { ...doc, posts: publishedPosts };
}
