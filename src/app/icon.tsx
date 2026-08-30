import { ImageResponse } from 'next/og';
import { initialData } from '@/data/initialData';
import { buildOgCardData } from '@/lib/metadata';
import MonogramIcon, { firstGrapheme } from '@/components/og/MonogramIcon';

// 5g-b (followup) — the SITE favicon, build-time static from the committed
// seed: Product B's root IS the portfolio, so its tab wears the owner's
// letter on the doc accent (the same treatment hosted /u/ pages get per
// request). No gates, no request APIs — must stay statically prerenderable.
// Supersedes the create-next-app favicon.ico (deleted alongside this).
// The /u/[slug] segment overrides with its own gated dynamic icon.
const card = buildOgCardData(initialData);
const letter = firstGrapheme(card.title).toUpperCase();

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <MonogramIcon letter={letter} background={card.accent} />,
    { ...size },
  );
}
