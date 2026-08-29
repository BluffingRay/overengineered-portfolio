import { notFound } from 'next/navigation';
import { isHosted } from '@/lib/hosted/isHosted';
import { kvGet } from '@/lib/kv';
import { prepareDocument } from '@/lib/storage';
import { sanitizePortfolioDocument } from '@/lib/sanitize-html';
import type { PortfolioData } from '@/types/schema';
import HostedPortfolioView from '@/components/hosted/HostedPortfolioView';

export const runtime = 'nodejs';

/**
 * FIX-F — the real public render (Product A). The doc comes from KV and
 * nowhere else: a missing or invalid stored document is a missing page
 * (never the seed), and a KV network failure propagates as a 500.
 * Awaiting searchParams keeps every request dynamic, so hosted saves are
 * visible immediately. MVP slugs are bare uids (`portfolio:${slug}:default`);
 * 5e adds the real slug registry on top of this resolution.
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

  const raw = await kvGet(`portfolio:${slug}:default`);
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
