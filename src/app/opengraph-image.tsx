import { ImageResponse } from 'next/og';
import { initialData } from '@/data/initialData';
import { buildOgCardData } from '@/lib/metadata';
import OgCard from '@/components/og/OgCard';

// 5d-b — the ROOT site card, build-time static from the committed seed:
// initialData is baked at build (content/portfolio.json), so this route
// touches no request APIs, no KV, and no gates — the seed is committed,
// public content and the route must stay statically prerenderable. The file
// convention attaches it to every segment without its own image (/blog,
// /write, hosted admin pages — all harmless); /u/[slug] defines its own and
// overrides. Card data + alt derive from the SAME buildOgCardData call, so
// the alt always matches what the image paints.
const card = buildOgCardData(initialData);

export const alt = `${card.title} · portfolio`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(<OgCard {...card} />, { ...size });
}
