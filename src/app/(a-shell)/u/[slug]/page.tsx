import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionCookieName, verifySessionCookie } from '@/lib/firebase/admin';
import { isHosted } from '@/lib/hosted/isHosted';
import { kvGet, portfolioKeyFor } from '@/lib/kv';
import { resolveSlug } from '@/lib/portfolioIndex';
import { prepareDocument } from '@/lib/storage';
import { sanitizePortfolioDocument } from '@/lib/sanitize-html';
import type { PortfolioData } from '@/types/schema';
import HostedPortfolioView from '@/components/hosted/HostedPortfolioView';

export const runtime = 'nodejs';

/**
 * 5e-h — resolve the visitor's uid from the hosted session cookie, or null.
 * FAILS CLOSED: every failure mode (no cookie, Firebase admin unconfigured,
 * verification throw) reads as "no session", so a private doc below 404s
 * rather than ever rendering to a stranger.
 */
async function getSessionUid(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(getSessionCookieName())?.value;
    if (!value) return null;
    const decoded = await verifySessionCookie(value);
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * FIX-F — the real public render (Product A). The doc comes from KV and
 * nowhere else: a missing or invalid stored document is a missing page
 * (never the seed), and a KV network failure propagates as a 500.
 * Awaiting searchParams keeps every request dynamic, so hosted saves are
 * visible immediately.
 *
 * 5e-b — resolution is registry-first: `portfolios:index` maps the URL slug
 * to its owning uid, then the doc loads under `portfolioKeyFor(uid)`. An
 * index hit makes the registry authoritative — a missing/unreadable doc is
 * a 404 with NO legacy fallthrough. On a registry miss (no slug assigned
 * yet, or the index read failed) the legacy FIX-F uid-slug key
 * `portfolio:<slug>:default` is tried with the RAW param (uids are
 * case-sensitive — never lowercased), so uid links stay compatible until
 * onboarding assigns slugs. Never seeds. Only the registry read degrades
 * softly (a miss); a doc-get KV failure still 500s.
 *
 * 5e-h — visibility gate (private = owner-only): after the doc resolves,
 * `visibility !== 'public'` renders ONLY for the owning uid — the one the
 * registry resolved (legacy path: the raw slug IS the uid) — identified by
 * their hosted session cookie. Everyone else, including signed-in
 * non-owners, gets a 404: never a "private" page, so no existence leak.
 * Absent visibility means private (5e-a schema default). The session
 * resolution fails CLOSED (getSessionUid above), so a Firebase admin hiccup
 * degrades a private doc to a 404 — never to a public render. Public docs
 * skip the gate entirely and render for everyone exactly as before.
 */
export default async function HostedPortfolioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!isHosted()) notFound();
  const { slug } = await params;
  const { t } = await searchParams;
  const requestedTab = typeof t === 'string' ? t : undefined;

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
  if (!raw) notFound();

  let doc: PortfolioData | null = null;
  try {
    const prepared = prepareDocument(JSON.parse(raw));
    if (prepared) {
      // FIX-A: KV may hold pre-sanitization docs — render only the
      // sanitized RETURN, never the input.
      doc = sanitizePortfolioDocument(prepared);
    }
  } catch {
    doc = null; // invalid stored doc — a missing page, not the seed
  }
  if (!doc) notFound();

  // 5e-h — visibility gate: private = owner-only. The owner keeps View
  // access (their hosted session cookie identifies them — the dashboard's
  // View button stays meaningful); everyone else, including signed-in
  // non-owners, 404s. Absent visibility = private (5e-a default). The
  // check runs ONLY for non-public docs: public renders stay byte-
  // identical (no cookie read, no Firebase call), and getSessionUid fails
  // closed so a hiccup degrades to a 404, never a public render.
  if (doc.visibility !== 'public') {
    const sessionUid = await getSessionUid();
    if (sessionUid !== ownerUid) notFound();
  }

  // Unknown ?t= (stale share link) falls back to the first tab — the
  // portfolio exists, the tab reference doesn't.
  const activeTab =
    doc.tabs.find((tab) => tab.id === requestedTab) ?? doc.tabs[0];

  // The wrapper receives the doc as client-component props, and the RSC
  // flight payload serializes props into the HTML source — strip drafts
  // HERE so they never reach a visitor's view-source, not just the DOM.
  const publishedPosts = (doc.posts ?? [])
    .filter((post) => post.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  const publicDoc: PortfolioData = { ...doc, posts: publishedPosts };

  return (
    <HostedPortfolioView
      doc={publicDoc}
      slug={slug}
      activeTabId={activeTab?.id ?? ''}
    />
  );
}
