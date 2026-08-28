'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import ManagedImage from '@/components/ui/ManagedImage';
import type {
  FeaturedHeroBlock as FeaturedHeroBlockData,
  HeroMediaFrame,
  HeroMediaRadius,
  HeroMediaRatio,
  HeroMediaSize,
  ImageAlignment,
  HeroLayout,
  StatusColor,
} from '@/types/schema';

/* Atoms shared by hero designs. Each design picks what fits its art
   direction — nothing here assumes a particular look. */

export const MEDIA_RATIO_CLASSES: Record<HeroMediaRatio, string> = {
  circle: 'aspect-square',
  square: 'aspect-square',
  landscape: 'aspect-[16/10]',
  portrait: 'aspect-[4/5]',
};

export const MEDIA_RADIUS_CLASSES: Record<HeroMediaRadius, string> = {
  theme: 'rounded-skin',
  none: 'rounded-none',
  sm: 'rounded-md',
  lg: 'rounded-2xl',
  full: 'rounded-full',
  squircle: 'rounded-[1.75rem]',
};

export const MEDIA_SIZE_CLASSES: Record<HeroMediaSize, string> = {
  xs: 'w-full max-w-48',
  sm: 'w-full max-w-xs',
  md: 'w-full max-w-md',
  lg: 'w-full max-w-xl',
};

export const MEDIA_FRAME_CLASSES: Record<
  Exclude<HeroMediaFrame, 'window'>,
  string
> = {
  none: '',
  subtle: 'border border-[var(--border)] shadow-sm',
  'accent-glow': 'border border-accent shadow-lg shadow-accent/20',
};

export function HeroPlaceholder({
  size = 'md',
  ratio = 'square',
  className,
}: {
  size?: HeroMediaSize;
  ratio?: HeroMediaRatio;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden ${MEDIA_SIZE_CLASSES[size]} ${MEDIA_RATIO_CLASSES[ratio]} rounded-skin ${className ?? ''}`}
    >
      <img
        src="/images/placeholder.svg"
        alt="No image"
        decoding="async"
        loading="lazy"
        className="h-full w-full object-cover opacity-60"
      />
    </div>
  );
}

export function HeroMedia({
  block,
  className,
}: {
  block: FeaturedHeroBlockData;
  className?: string;
}) {
  const ratio = block.mediaRatio ?? 'square';
  const radius = block.mediaRadius ?? 'theme';
  const size = block.mediaSize ?? 'md';
  const frame = block.mediaFrame ?? 'subtle';

  const effectiveRadius =
    ratio === 'circle' ? 'rounded-full' : MEDIA_RADIUS_CLASSES[radius];
  const frameClass =
    frame === 'window' ? '' : MEDIA_FRAME_CLASSES[frame];

  if (block.mediaFrame === 'window') {
    return (
      <div className={`relative flex flex-col overflow-hidden ${MEDIA_SIZE_CLASSES[size]} ${MEDIA_RATIO_CLASSES[ratio]} ${effectiveRadius} ${frameClass} ${className ?? ''}`}>
        <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-[var(--border)] bg-surface px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-green-400" />
        </div>
        <ManagedImage
          src={block.thumbnail}
          sizeClass={MEDIA_SIZE_CLASSES[size]}
          ratioClass={MEDIA_RATIO_CLASSES[ratio]}
          roundedClass={effectiveRadius}
          frameClass=""
          className="flex-1"
          placeholderLabel="No image"
        />
      </div>
    );
  }

  return (
    <ManagedImage
      src={block.thumbnail}
      sizeClass={MEDIA_SIZE_CLASSES[size]}
      ratioClass={MEDIA_RATIO_CLASSES[ratio]}
      roundedClass={effectiveRadius}
      frameClass={frameClass}
      className={className}
      placeholderLabel="No image"
    />
  );
}

export const STATUS_STYLES: Record<
  StatusColor,
  { dot: string; ping: string; pill: string }
> = {
  green: {
    dot: 'bg-green-500',
    ping: 'bg-green-400',
    pill: 'border-green-500/20 bg-green-500/10',
  },
  blue: {
    dot: 'bg-blue-500',
    ping: 'bg-blue-400',
    pill: 'border-blue-500/20 bg-blue-500/10',
  },
  amber: {
    dot: 'bg-amber-500',
    ping: 'bg-amber-400',
    pill: 'border-amber-500/20 bg-amber-500/10',
  },
  purple: {
    dot: 'bg-purple-500',
    ping: 'bg-purple-400',
    pill: 'border-purple-500/20 bg-purple-500/10',
  },
};

export function legacyLayout(align: ImageAlignment): HeroLayout {
  switch (align) {
    case 'left':
    case 'right':
      return 'split';
    case 'top':
      return 'centered';
    case 'backdrop':
      return 'banner';
  }
}

const TYPE_SPEED_MS = 55;
const ERASE_SPEED_MS = 28;
const HOLD_MS = 1900;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function TypewriterRoles({ roles }: { roles: string[] }) {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [erasing, setErasing] = useState(false);

  // Reduced motion: render the first role in full, no cycling.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );

  const staticRole = roles[0] ?? '';

  // Single-timer state machine; every transition fires from the timeout
  // callback so no setState runs synchronously inside the effect body.
  useEffect(() => {
    if (roles.length <= 1 || reducedMotion) return;

    const current = roles[index % roles.length] ?? '';
    const hold = !erasing && length === current.length;

    const tick = window.setTimeout(
      () => {
        if (hold) {
          setErasing(true);
        } else if (erasing) {
          if (length === 0) {
            setErasing(false);
            setIndex((value) => (value + 1) % roles.length);
          } else {
            setLength(length - 1);
          }
        } else {
          setLength(length + 1);
        }
      },
      hold ? HOLD_MS : erasing ? ERASE_SPEED_MS : TYPE_SPEED_MS,
    );
    return () => window.clearTimeout(tick);
  }, [erasing, index, length, reducedMotion, roles]);

  const text =
    reducedMotion || roles.length <= 1
      ? staticRole
      : (roles[index % roles.length] ?? '').slice(0, length);

  return (
    <p
      className="mt-1.5 font-mono text-lg text-accent"
      aria-label={roles.join(', ')}
    >
      {text}
      <span aria-hidden="true" className="animate-pulse">
        ▌
      </span>
    </p>
  );
}

export const NAME_MIN_PX = 26;

/**
 * Shrinks the name until it occupies exactly one line, re-fitting on
 * container resizes. Font-agnostic (serif/geist/whatever the skin uses)
 * because it measures real overflow instead of guessing metrics.
 */
export function useFitOneLine(
  ref: React.RefObject<HTMLHeadingElement | null>,
  text: string,
  enabled: boolean,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !text || !enabled) return;

    const fit = () => {
      el.style.whiteSpace = 'nowrap';
      el.style.fontSize = '';
      let size = parseFloat(window.getComputedStyle(el).fontSize);
      let guard = 40;
      while (
        el.scrollWidth > el.clientWidth &&
        size > NAME_MIN_PX &&
        guard-- > 0
      ) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    if (el.parentElement) observer.observe(el.parentElement);
    return () => {
      observer.disconnect();
      el.style.whiteSpace = '';
      el.style.fontSize = '';
    };
  }, [ref, text, enabled]);
}
