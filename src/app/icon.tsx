import { ImageResponse } from 'next/og';
import MonogramIcon from '@/components/og/MonogramIcon';
import { OG_ACCENT } from '@/lib/metadata';

// 5g-b (followup) — neutral product favicon: the brand tilde mark on
// the chrome accent (the same treatment the (a-shell) hub wears, e.g.
// `~/overengineered-portfolio▌`). Decoupled from the committed B seed
// so neither Product A's hosted editor nor Product B's fresh-clone
// root wears the demo portfolio's first-letter monogram. No gates, no
// request APIs — must stay statically prerenderable. The /u/[slug]
// segment overrides with its own gated dynamic icon.
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <MonogramIcon letter="~" background={OG_ACCENT} foreground="#a3a3a3" />,
    { ...size },
  );
}
