import type { MarqueeBlock as MarqueeBlockData, MarqueeSpeed } from '@/types/schema';

const SPEED_DURATION: Record<MarqueeSpeed, string> = {
  slow: '60s',
  normal: '36s',
  fast: '20s',
};

interface Props {
  block: MarqueeBlockData;
}

export default function MarqueeBlock({ block }: Props) {
  if (block.items.length === 0) return null;

  const separator = block.separator ?? '·';
  // Two identical halves + translateX(-50%) = seamless infinite loop.
  const half = (hidden: boolean) => (
    <div
      aria-hidden={hidden || undefined}
      className="flex w-max shrink-0 items-center"
    >
      {block.items.map((item, index) => (
        <span key={`${item}-${index}`} className="flex items-center">
          <span className="whitespace-nowrap text-sm font-medium uppercase tracking-widest opacity-70">
            {item}
          </span>
          <span
            aria-hidden="true"
            className="mx-6 select-none text-accent opacity-60"
          >
            {separator}
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      aria-label={block.items.join(', ')}
      className={`marquee relative w-full overflow-hidden py-1 ${
        block.reverse ? 'marquee-reverse' : ''
      }`}
      style={
        {
          '--marquee-duration': SPEED_DURATION[block.speed ?? 'normal'],
        } as React.CSSProperties
      }
    >
      <div className="marquee-track flex w-max">{half(false)}{half(true)}</div>
    </div>
  );
}
