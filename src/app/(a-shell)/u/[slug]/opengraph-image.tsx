import { ImageResponse } from 'next/og';
import { isHosted } from '@/lib/hosted/isHosted';
import { buildOgCardData, isPubliclyIndexable, OG_ACCENT } from '@/lib/metadata';
import OgCard, { type OgCardProps } from '@/components/og/OgCard';
import { resolveHostedDoc } from '@/lib/loadHostedDoc';

// 5d-b — the doc-derived share card for hosted portfolios. LEAK RULE: this
// URL is a publicly fetchable GET handler even when the page 404s strangers
// (the image URL is separate from the page's 404), so the gate is enforced
// HERE: no session cookie is ever read — a registry miss, a non-hosted
// deploy, or a non-public doc renders the GENERIC card (no doc data, no doc
// accent) for everyone, owner included. The owner's page render is what
// they look at; a generic share-card is the safe cost.

// Static by convention (the file convention reads exported values, not the
// doc): the per-doc title can't be expressed here, so the alt names the
// artifact, mirroring the "<title> · portfolio" shape as closely as a
// static string allows.
export const alt = 'Portfolio · share card';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Generic by default; doc data ONLY behind isHosted + isPubliclyIndexable.
  // The title mirrors 5d-a's TITLE_FALLBACK so the generic card matches what
  // the page's tags would degrade to.
  let card: OgCardProps = { title: 'Portfolio', accent: OG_ACCENT };
  if (isHosted()) {
    const loaded = await resolveHostedDoc(slug);
    if (loaded && isPubliclyIndexable(loaded.doc)) {
      card = buildOgCardData(loaded.doc);
    }
  }

  return new ImageResponse(<OgCard {...card} />, { ...size });
}
