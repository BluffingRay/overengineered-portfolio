import type { CSSProperties } from 'react';
import type { MarqueeDesignProps } from '../types';
import { MarqueeHalves, SPEED_DURATION } from './shared';

/**
 * Cutie marquee — a gentle heart-ticker. Sentence-case semibold items
 * instead of the default whisper; hearts bob via cutie-float, which
 * animates `translate` and never fights the track's transform.
 */
export default function CutieMarquee({ block }: MarqueeDesignProps) {
  if (block.items.length === 0) return null;

  return (
    <div
      aria-label={block.items.join(', ')}
      className={`marquee relative w-full overflow-hidden py-2 ${
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
          separator={block.separator ?? '♡'}
          itemClassName="whitespace-nowrap text-base font-semibold normal-case"
          separatorClassName="cutie-float mx-6 select-none text-accent opacity-70"
        />
      </div>
    </div>
  );
}
