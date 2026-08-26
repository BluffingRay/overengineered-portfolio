import type { CSSProperties } from 'react';
import type { MarqueeDesignProps } from '../types';
import { MarqueeHalves, SPEED_DURATION } from './shared';

/**
 * Editorial marquee — a whispered ticker between hairline rules.
 * Tiny tracked-out caps at half voice; em-dash separators stay quiet.
 * Typography does all the work, as ever in this design.
 */
export default function EditorialMarquee({ block }: MarqueeDesignProps) {
  if (block.items.length === 0) return null;

  return (
    <div
      aria-label={block.items.join(', ')}
      className={`marquee relative w-full overflow-hidden border-y border-current/10 py-2 ${
        block.reverse ? 'marquee-reverse' : ''
      }`}
      style={
        {
          '--marquee-duration': SPEED_DURATION[block.speed ?? 'normal'],
        } as CSSProperties
      }
    >
      <div className="marquee-track flex w-max">
        <MarqueeHalves
          items={block.items}
          separator={block.separator ?? '—'}
          itemClassName="whitespace-nowrap text-[11px] uppercase tracking-[0.35em] opacity-50"
          separatorClassName="mx-6 select-none opacity-30"
        />
      </div>
    </div>
  );
}
