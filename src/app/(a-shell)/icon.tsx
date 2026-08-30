import { ImageResponse } from 'next/og';
import MonogramIcon from '@/components/og/MonogramIcon';
import { OG_ACCENT } from '@/lib/metadata';

// 5g-b (followup) — the ADMIN hub mark for /dashboard + /onboarding (the
// (a-shell) group; /u/[slug] overrides with its own gated dynamic icon).
// Neutral platform chrome, deliberately NOT doc-derived: the hub is the
// product's face, not any portfolio's. The tilde nods to the seed
// eyebrow ("~/name"). /write and /blog keep the site favicon.
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <MonogramIcon letter="~" background={OG_ACCENT} foreground="#a3a3a3" />,
    { ...size },
  );
}
