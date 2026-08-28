import { notFound } from 'next/navigation';
import { isHosted } from '@/lib/hosted/isHosted';
import { kvGet } from '@/lib/kv';
import { prepareDocument } from '@/lib/storage';
import { sanitizePortfolioDocument } from '@/lib/sanitize-html';
import { initialData } from '@/data/initialData';
import BlockRenderer from '@/components/blocks/BlockRenderer';

export const runtime = 'nodejs';

export default async function HostedPortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isHosted()) notFound();
  const { slug } = await params;

  // MVP: single-tenant slug is uid:default, slug maps to portfolio:${slug}:default
  // For now resolve slug as uid if Firebase disabled, else fallback to initialData.
  const key = `portfolio:${slug}:default`;
  let doc = initialData;
  try {
    const raw = await kvGet(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const prepared = prepareDocument(parsed);
      if (prepared) {
        // FIX-A: KV may hold pre-sanitization docs — never render raw.
        sanitizePortfolioDocument(prepared);
        doc = prepared;
      }
    }
  } catch {}

  const publishedPosts = (doc.posts ?? []).filter((p) => p.status === 'published');

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <p className="text-xs opacity-60">/u/{slug} — public render (Hosted shell, LOCAL=true hides)</p>
      {doc.tabs[0]?.blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} socials={doc.socials} cards={doc.cards} posts={publishedPosts} />
      ))}
    </main>
  );
}
