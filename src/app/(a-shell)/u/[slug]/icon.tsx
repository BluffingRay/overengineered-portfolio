import { ImageResponse } from 'next/og';
import { isHosted } from '@/lib/hosted/isHosted';
import { buildOgCardData, isPubliclyIndexable, OG_ACCENT } from '@/lib/metadata';
import { resolveHostedDoc } from '@/lib/loadHostedDoc';

// 5d-b — the doc-derived favicon for hosted portfolios. Same leak rule as
// the sibling opengraph-image: this URL is publicly fetchable even when the
// page 404s strangers, so the gate is enforced HERE — no session cookie is
// ever read; a registry miss, a non-hosted deploy, or a non-public doc
// renders the neutral 'P' monogram for everyone, owner included.

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/**
 * First grapheme of the title — Intl.Segmenter when the runtime has it so
 * astral graphemes (emoji etc.) survive as one character, charAt(0)
 * otherwise. The title from buildOgCardData is never empty (5d-a's chain
 * ends in a fallback), so this always yields a paintable character.
 */
function firstGrapheme(text: string): string {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    for (const part of new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text)) {
      return part.segment;
    }
  }
  return text.charAt(0);
}

export default async function Icon({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Neutral monogram by default; the doc accent + initial ONLY behind
  // isHosted + isPubliclyIndexable. The gray pair stays in the OG_ACCENT
  // (neutral) family so the generic mark reads as chrome, not content.
  let letter = 'P';
  let background = OG_ACCENT;
  let foreground = '#a3a3a3';
  if (isHosted()) {
    const loaded = await resolveHostedDoc(slug);
    if (loaded && isPubliclyIndexable(loaded.doc)) {
      const card = buildOgCardData(loaded.doc);
      letter = firstGrapheme(card.title).toUpperCase();
      background = card.accent;
      foreground = '#ffffff';
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background,
          borderRadius: 14,
          color: foreground,
          fontSize: 36,
          fontWeight: 700,
        }}
      >
        {letter}
      </div>
    ),
    { ...size },
  );
}
