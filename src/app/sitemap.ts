import type { MetadataRoute } from 'next';
import {
  publicSitemapEntries,
  readIndex,
  type PublicSitemapEntry,
} from '@/lib/portfolioIndex';

// 5g-b — the hosted sitemap: the hub root + one /u/<slug> entry per PUBLIC
// portfolio (showcase opt-in NOT required — every public portfolio is
// sitemap-worthy). `revalidate` keeps the KV index read to once per hour
// instead of per crawler request.

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Same base fallback as the root layout's metadataBase: NEXT_PUBLIC_SITE_URL
  // wins when set — `||` (not `??`) so a set-but-empty value falls back
  // instead of crashing `new URL('')`.
  const base = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  );

  // ANY index-read failure (Product B — no KV config; a hosted KV outage at
  // revalidate time) degrades to a root-only sitemap: a B deploy must BUILD
  // clean and this route must never 500.
  let entries: PublicSitemapEntry[] = [];
  try {
    entries = publicSitemapEntries(await readIndex());
  } catch {
    entries = [];
  }

  return [
    { url: new URL('/', base).toString() },
    ...entries.map((entry) => ({
      url: new URL(`/u/${entry.slug}`, base).toString(),
      lastModified: new Date(entry.lastModified),
    })),
  ];
}
