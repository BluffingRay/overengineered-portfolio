import type { CSSProperties } from 'react';
import type { MarqueeDesignProps } from '../types';
import { MarqueeHalves, SPEED_DURATION } from './shared';

/**
 * Coder marquee — the original: quiet uppercase whisper between accent
 * dots. Loop mechanics live in shared/MarqueeHalves.
 */
export default function CoderMarquee({ block }: MarqueeDesignProps) {
  if (block.items.length === 0) return null;

  return (
    <div
      aria-label={block.items.join(', ')}
      className={`marquee relative w-full overflow-hidden py-1 ${
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
          separator={block.separator ?? '·'}
          itemClassName="whitespace-nowrap text-sm font-medium uppercase tracking-widest opacity-70"
          separatorClassName="mx-6 select-none text-accent opacity-60"
        />
      </div>
    </div>
  );
}
