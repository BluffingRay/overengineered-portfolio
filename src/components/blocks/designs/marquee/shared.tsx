import type { MarqueeSpeed } from '@/types/schema';

/* Atoms shared by marquee designs: the speed table plus the two-half
   loop core. Designs own ONLY typography/separator styling — the loop
   mechanics stay identical everywhere (and transform-free children:
   .marquee-track owns the animation). */

export const SPEED_DURATION: Record<MarqueeSpeed, string> = {
  slow: '60s',
  normal: '36s',
  fast: '20s',
};

interface MarqueeHalvesProps {
  items: string[];
  separator: string;
  /** Styling only — never transition utilities or transforms. */
  itemClassName: string;
  separatorClassName: string;
}

/** Two identical halves + translateX(-50%) = seamless infinite loop. */
export function MarqueeHalves({
  items,
  separator,
  itemClassName,
  separatorClassName,
}: MarqueeHalvesProps) {
  const half = (hidden: boolean) => (
    <div
      aria-hidden={hidden || undefined}
      className="flex w-max shrink-0 items-center"
    >
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="flex items-center">
          <span className={itemClassName}>{item}</span>
          <span aria-hidden="true" className={separatorClassName}>
            {separator}
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <>
      {half(false)}
      {half(true)}
    </>
  );
}
