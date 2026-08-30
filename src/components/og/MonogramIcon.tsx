// 5g-b (followup) — shared satori monogram: the rounded accent square +
// first-grapheme letter treatment used by the root and hub favicons. Pure
// presentational (no hooks, no 'use client') — renders inside
// ImageResponse only. Satori rules apply: explicit flex, literal hex, no
// CSS variables or classes.
export function firstGrapheme(text: string): string {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    for (const part of new Intl.Segmenter('en', {
      granularity: 'grapheme',
    }).segment(text)) {
      return part.segment;
    }
  }
  return text.charAt(0);
}

export default function MonogramIcon({
  letter,
  background,
  foreground = '#ffffff',
}: {
  letter: string;
  background: string;
  foreground?: string;
}) {
  return (
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
  );
}
