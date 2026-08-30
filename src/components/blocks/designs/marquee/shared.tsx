'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { MarqueeSpeed } from '@/types/schema';

/* Atoms shared by marquee designs: the speed table, the repeat-to-fill
   math, and the loop core (MarqueeTrack). Designs own ONLY
   typography/separator styling — the loop mechanics stay identical
   everywhere (and transform-free children: .marquee-track owns the
   animation; its two halves loop via the fixed translateX(-50%)). */

export const SPEED_SECONDS: Record<MarqueeSpeed, number> = {
  slow: 60,
  normal: 36,
  fast: 20,
};

/** SSR/no-JS default — also the floor: count only ever grows. */
const MIN_REPEAT = 4;

/**
 * Repetitions per half that keep the loop seamless: `-50%` of the track
 * travels one half, so each half must span at least the container.
 * Degenerate inputs (non-finite or <= 0 widths) fall back to minCount.
 */
export function marqueeRepeatCount(
  containerWidth: number,
  runWidth: number,
  minCount = MIN_REPEAT,
): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return minCount;
  if (!Number.isFinite(runWidth) || runWidth <= 0) return minCount;
  return Math.max(minCount, Math.ceil(containerWidth / runWidth));
}

interface MarqueeTrackProps {
  speed: MarqueeSpeed;
  items: string[];
  separator: string;
  /** Styling only — never transition utilities or transforms. */
  itemClassName: string;
  separatorClassName: string;
}

/**
 * The loop core: `.marquee-track` plus its two identical halves, each
 * repeating the items-run `count` times. Count grows until a half spans
 * the container, so few-item marquees never run into an empty gap;
 * the duration scales with count so per-item speed stays content-constant
 * (travel per cycle = one half = count × runWidth over base × count s).
 */
export function MarqueeTrack({
  speed,
  items,
  separator,
  itemClassName,
  separatorClassName,
}: MarqueeTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(MIN_REPEAT);

  // Measurement happens in the ResizeObserver callback — both its initial
  // observation (mount) and container resizes — never synchronously inside
  // the effect body (house lint). Grow-only: a smaller container never
  // sheds runs, it just scrolls a wider track.
  useEffect(() => {
    const track = trackRef.current;
    const container = track?.parentElement;
    if (!track || !container || items.length === 0) return;

    const measure = () => {
      // First half's first run — its width defines one items-run.
      const run = track.firstElementChild?.firstElementChild;
      if (!run) return;
      setCount((current) =>
        Math.max(
          current,
          marqueeRepeatCount(
            container.clientWidth,
            run.getBoundingClientRect().width,
          ),
        ),
      );
    };

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [items]);

  return (
    <div
      ref={trackRef}
      className="marquee-track flex w-max"
      style={
        {
          '--marquee-duration': `${SPEED_SECONDS[speed] * count}s`,
        } as CSSProperties
      }
    >
      <MarqueeHalves
        count={count}
        items={items}
        separator={separator}
        itemClassName={itemClassName}
        separatorClassName={separatorClassName}
      />
    </div>
  );
}

interface MarqueeHalvesProps {
  count: number;
  items: string[];
  separator: string;
  /** Styling only — never transition utilities or transforms. */
  itemClassName: string;
  separatorClassName: string;
}

/** Two identical halves + translateX(-50%) = seamless infinite loop.
    Runs after the first (per half) stay out of the accessibility tree
    so screen readers hear the list exactly once. */
function MarqueeHalves({
  count,
  items,
  separator,
  itemClassName,
  separatorClassName,
}: MarqueeHalvesProps) {
  const run = (rep: number, hidden: boolean) => (
    <div
      key={rep}
      aria-hidden={hidden || undefined}
      className="flex w-max shrink-0 items-center"
    >
      {items.map((item, index) => (
        <span key={`${rep}-${item}-${index}`} className="flex items-center">
          <span className={itemClassName}>{item}</span>
          <span aria-hidden="true" className={separatorClassName}>
            {separator}
          </span>
        </span>
      ))}
    </div>
  );

  const half = (hidden: boolean) => (
    <div className="flex w-max shrink-0 items-center">
      {Array.from({ length: count }, (_, rep) => run(rep, hidden || rep > 0))}
    </div>
  );

  return (
    <>
      {half(false)}
      {half(true)}
    </>
  );
}
