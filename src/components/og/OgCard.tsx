// 5d-b — shared satori-safe OG card (1200×630) painted by the root site
// card and the /u/[slug] share card. Satori is not a browser: EVERY element
// with children declares display 'flex' (+ flexDirection where the axis
// matters), colors are literal hex — CSS variables (`var(--accent)`) never
// resolve here — and there are no CSS classes, no grid, no auto margins.
// Pure presentational: no hooks, no 'use client' — it renders inside
// ImageResponse only, so it must never import anything server- or
// client-side.

export interface OgCardProps {
  title: string;
  subtitle?: string;
  accent: string;
}

export default function OgCard({ title, subtitle, accent }: OgCardProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#0a0a0a',
      }}
    >
      {/* Left-edge accent bar. Generic (non-public) renders pass the neutral
          OG_ACCENT so a private doc never colors its share card. */}
      <div style={{ width: 16, flexShrink: 0, backgroundColor: accent }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flexGrow: 1,
          paddingTop: 80,
          paddingBottom: 80,
          paddingLeft: 96,
          paddingRight: 96,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 96,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: '1.15em',
          }}
        >
          {title}
        </div>
        {/* Muted row renders ONLY when the description chain yielded text —
            the caller omits the subtitle key entirely otherwise. */}
        {subtitle ? (
          <div
            style={{
              display: 'flex',
              fontSize: 40,
              color: '#a3a3a3',
              marginTop: 40,
              lineHeight: '1.3em',
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
