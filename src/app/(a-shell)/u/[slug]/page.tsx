import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import type { Metadata } from 'next';
import { getSessionCookieName, verifySessionCookie } from '@/lib/firebase/admin';
import { isHosted } from '@/lib/hosted/isHosted';
import { buildPortfolioMetadata, isPubliclyIndexable } from '@/lib/metadata';
import type { PortfolioData } from '@/types/schema';
import HostedPortfolioView from '@/components/hosted/HostedPortfolioView';
// 5d-b — the loader moved to @/lib/loadHostedDoc (5f-a) so API consumers
// (export route) share the same cached resolution as the sibling image
// routes.
import { resolveHostedDoc, stripDrafts } from '@/lib/loadHostedDoc';

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
 * 5d-a — share the public doc with search engines. A miss or a NON-public
 * doc returns {} (generic — a private doc's name/description must never
 * leak into tags, including on the owner's own render; the root layout's
 * fallback applies instead). For a public doc: absolute title, description
 * and OG/twitter from the doc, with metadataBase derived from the request
 * headers so OG URLs resolve absolutely per deploy.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // In Product B this route always 404s (the page's isHosted gate below) —
  // skip the doc load so a KV-less deploy can't turn that 404 into a
  // metadata error: generateMetadata resolves BEFORE the page body runs.
  if (!isHosted()) return {};

  const { slug } = await params;
  const loaded = await resolveHostedDoc(slug);
  if (!loaded || !isPubliclyIndexable(loaded.doc)) return {};

  // Host headers are client-controlled — a value that won't parse means no
  // metadataBase (the root layout's fallback applies) and no absolute OG
  // image, never a thrown 500.
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  let baseUrl: string | undefined;
  if (host) {
    try {
      baseUrl = new URL(
        `${headerList.get('x-forwarded-proto') ?? 'http'}://${host}`,
      ).origin;
    } catch {
      baseUrl = undefined;
    }
  }

  const meta = buildPortfolioMetadata(loaded.doc, { baseUrl });
  return {
    title: { absolute: meta.title },
    ...(meta.description !== undefined ? { description: meta.description } : {}),
    ...(baseUrl !== undefined ? { metadataBase: new URL(baseUrl) } : {}),
    openGraph: {
      ...meta.openGraph,
      // This render's canonical URL, not the site root the helper assumed.
      ...(baseUrl !== undefined ? { url: `/u/${slug}` } : {}),
    },
    twitter: meta.twitter,
  };
}

/**
 * FIX-F — the real public render (Product A). The doc comes from KV and
 * nowhere else: a missing or invalid stored document is a missing page
 * (never the seed), and a KV network failure propagates as a 500.
 * Awaiting searchParams keeps every request dynamic, so hosted saves are
 * visible immediately.
 *
 * 5e-b/5e-h — resolution and the owner identity live in resolveHostedDoc
 * (@/lib/loadHostedDoc since 5f-a: registry-first, legacy RAW-param
 * fallthrough, never seeds, only the registry read degrades softly); this
 * body keeps the notFound() decisions and the gate.
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

  // 5d-a — the shared cached load (see resolveHostedDoc): with
  // generateMetadata resolving on the same request, the pipeline still
  // runs at most once.
  const loaded = await resolveHostedDoc(slug);
  if (!loaded) notFound();
  const { doc, ownerUid } = loaded;

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
  // 5f-a — the inline copy moved to stripDrafts (shared with the export
  // route + GET /api/portfolio); same filter + sort + spread.
  const publicDoc: PortfolioData = stripDrafts(doc);

  return (
    <HostedPortfolioView
      doc={publicDoc}
      slug={slug}
      activeTabId={activeTab?.id ?? ''}
    />
  );
}
