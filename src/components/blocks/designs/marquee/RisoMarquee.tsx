import type { MarqueeDesignProps } from '../types';
import { MarqueeTrack } from './shared';

/**
 * Riso marquee — poster ticker. Heavy black caps between hard ink
 * rules, stars for separators, halftone strip inked along the bottom
 * edge. Static styling only: no transforms on track children.
 */
export default function RisoMarquee({ block }: MarqueeDesignProps) {
  if (block.items.length === 0) return null;

  return (
    <div
      aria-label={block.items.join(', ')}
      className={`marquee relative w-full overflow-hidden border-y-2 border-current py-2 ${
        block.reverse ? 'marquee-reverse' : ''
      }`}
    >
      {/* Halftone edge along the bottom rule */}
      <div
        aria-hidden="true"
        className="riso-halftone pointer-events-none absolute bottom-0 left-0 right-0 h-2"
      />
      <MarqueeTrack
        speed={block.speed ?? 'normal'}
        items={block.items}
        separator={block.separator ?? '★'}
        itemClassName="whitespace-nowrap text-lg font-black uppercase"
        separatorClassName="mx-6 select-none text-accent"
      />
    </div>
  );
}
