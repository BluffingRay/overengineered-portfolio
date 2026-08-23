'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type {
  FeaturedHeroBlock as FeaturedHeroBlockData,
  HeroLayout,
  HeroMediaFrame,
  HeroMediaRadius,
  HeroMediaRatio,
  HeroMediaSize,
  ImageAlignment,
  SocialLink,
  StatusColor,
} from '@/types/schema';
import SocialIcon from '@/components/ui/SocialIcon';

const MEDIA_RATIO_CLASSES: Record<HeroMediaRatio, string> = {
  circle: 'aspect-square',
  square: 'aspect-square',
  landscape: 'aspect-[16/10]',
  portrait: 'aspect-[4/5]',
};

const MEDIA_RADIUS_CLASSES: Record<HeroMediaRadius, string> = {
  theme: 'rounded-skin',
  none: 'rounded-none',
  sm: 'rounded-md',
  lg: 'rounded-2xl',
  full: 'rounded-full',
  squircle: 'rounded-[1.75rem]',
};

const MEDIA_SIZE_CLASSES: Record<HeroMediaSize, string> = {
  xs: 'max-w-48',
  sm: 'max-w-xs',
  md: 'max-w-md',
  lg: 'w-full max-w-xl',
};

const MEDIA_FRAME_CLASSES: Record<Exclude<HeroMediaFrame, 'window'>, string> = {
  none: '',
  subtle: 'border border-[var(--border)] shadow-sm',
  'accent-glow': 'border border-accent shadow-lg shadow-accent/20',
};

function HeroMedia({
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

  return (
    <div
      className={`relative flex flex-col overflow-hidden ${
        MEDIA_SIZE_CLASSES[size]
      } ${MEDIA_RATIO_CLASSES[ratio]} ${effectiveRadius} ${frameClass} ${
        className ?? ''
      }`}
    >
      {frame === 'window' && (
        <div
          aria-hidden="true"
          className="flex items-center gap-1.5 border-b border-[var(--border)] bg-surface px-3 py-1.5"
        >
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-green-400" />
        </div>
      )}
      <img
        src={block.thumbnail}
        alt=""
        decoding="async"
        fetchPriority="high"
        className="min-h-0 w-full flex-1 object-cover"
      />
    </div>
  );
}

const STATUS_STYLES: Record<StatusColor, { dot: string; ping: string; pill: string }> =
  {
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

function legacyLayout(align: ImageAlignment): HeroLayout {
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

function TypewriterRoles({ roles }: { roles: string[] }) {
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

const NAME_MIN_PX = 26;

/**
 * Shrinks the name until it occupies exactly one line, re-fitting on
 * container resizes. Font-agnostic (serif/geist/whatever the skin uses)
 * because it measures real overflow instead of guessing metrics.
 */
function useFitOneLine(
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

interface Props {
  block: FeaturedHeroBlockData;
  socials?: SocialLink[];
  /**
   * Resolves an href to an internal tab navigation; returning true means
   * handled, so the anchor's default browser navigation is suppressed.
   */
  onNavigate?: (href: string) => boolean;
}

export default function FeaturedHeroBlock({
  block,
  socials,
  onNavigate,
}: Props) {
  const layout = block.layout ?? legacyLayout(block.imageAlign ?? 'right');
  const splitLeft = layout === 'split' && block.mediaSide === 'left';

  const identityRoles =
    block.roles && block.roles.length > 0 ? block.roles : [];
  const nameRef = useRef<HTMLHeadingElement>(null);
  // `free` (default) auto-fits the font to one line; `compact` wraps naturally.
  useFitOneLine(nameRef, block.name ?? '', (block.nameFit ?? 'free') === 'free');
  const badge = block.statusBadge?.enabled ? block.statusBadge : null;
  const status = STATUS_STYLES[badge?.color ?? 'green'];
  const secondary = block.secondaryAction;
  const showSocials = block.showSocials === true && (socials?.length ?? 0) > 0;

  const media =
    layout === 'banner' ? (
      block.thumbnail ? (
        <img
          src={block.thumbnail}
          alt=""
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      ) : null
    ) : block.thumbnail ? (
      <HeroMedia
        block={block}
        className={
          layout === 'centered'
            ? block.mediaPosition === 'top'
              ? // Lift the media above the copy within the flex column.
                'order-first mx-auto'
              : 'mx-auto'
            : layout === 'split'
              ? // Mobile stacks in one column: image always leads AND hugs
                // its outer edge (small images must never drift inward).
                // On md+, right side restores DOM order for column 2;
                // left side keeps order-first so it takes column 1.
                // justify-self pins each column to its container edge —
                // never flex self-alignment, this is a grid row.
                splitLeft
                  ? 'order-first justify-self-start'
                  : 'order-first justify-self-end md:order-none'
              : undefined
        }
      />
    ) : null;

  return (
    <section
      className={`isolate ${
        layout === 'split'
          ? // Edge-anchored two-column row: copy takes the leftover space,
            // media hugs its chosen size at its container edge (justify-self
            // does the pinning). Tightened gap keeps words near the image.
            'grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10'
          : layout === 'banner'
            ? 'relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-skin'
            : 'flex flex-col items-center gap-6 text-center'
      }`}
    >
      {/* Banner background only — split media follows the copy so it trails on md+ */}
      {layout === 'banner' && media}

      <div
        className={
          layout === 'banner'
            ? 'w-full rounded-skin bg-black/50 p-10 text-white backdrop-blur-sm'
            : layout === 'split'
              ? 'max-w-xl space-y-4'
              : 'w-full'
        }
      >
        {(block.eyebrow || badge) && (
          <div
            className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${layout === 'centered' ? 'justify-center' : ''}`}
          >
            {block.eyebrow && (
              <p
                className="text-xs font-medium uppercase tracking-widest opacity-50"
                title="Eyebrow — edit under the Hero form"
              >
                {block.eyebrow}
              </p>
            )}

            {badge && (
              <span
                className={`inline-flex items-center gap-2 rounded-skin border px-3 py-0.5 text-[11px] font-medium uppercase tracking-widest ${status.pill}`}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    aria-hidden="true"
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${status.ping}`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${status.dot}`}
                  />
                </span>
                {badge.text}
              </span>
            )}
          </div>
        )}

        {block.name ? (
          <>
            <h1
              ref={nameRef}
              className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl md:leading-tight"
            >
              {block.name}
            </h1>
            {identityRoles.length > 0 && (
              <TypewriterRoles roles={identityRoles} />
            )}
            <p className="mt-6 text-balance text-xl font-medium opacity-90">
              {block.heading}
            </p>
          </>
        ) : (
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-[2.5rem] md:leading-tight">
            {block.heading}
          </h1>
        )}
        <p
          className={`mt-2 max-w-xl text-lg opacity-60 ${
            layout === 'centered' ? 'mx-auto' : ''
          }`}
        >
          {block.subheading}
        </p>

        <div
          className={`mt-7 flex flex-wrap items-center gap-3 ${
            layout === 'centered' ? 'justify-center' : ''
          }`}
        >
          <a
            href={block.ctaHref}
            onClick={(event) => {
              if (onNavigate?.(block.ctaHref)) event.preventDefault();
            }}
            className="inline-block rounded-skin border border-accent/60 px-5 py-2 text-sm font-medium text-accent hover:bg-accent hover:text-background"
          >
            {block.ctaLabel} →
          </a>
          {secondary && secondary.label && (
            <a
              href={secondary.url}
              target={secondary.target === '_blank' ? '_blank' : undefined}
              rel={secondary.target === '_blank' ? 'noreferrer noopener' : undefined}
              onClick={(event) => {
                if (
                  secondary.target !== '_blank' &&
                  onNavigate?.(secondary.url)
                ) {
                  event.preventDefault();
                }
              }}
              className="inline-block rounded-skin border border-current/25 px-5 py-2 text-sm font-medium hover:border-accent hover:text-accent"
            >
              {secondary.label}
            </a>
          )}
        </div>

        {showSocials && (
          <ul
            className={`mt-4 flex flex-wrap items-center gap-1.5 ${
              layout === 'centered' ? 'justify-center' : ''
            }`}
            aria-label="Social links"
          >
            {socials!.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  title={link.label ?? link.platform}
                  aria-label={link.label ?? link.platform}
                  target={
                    link.url.startsWith('mailto:') ? undefined : '_blank'
                  }
                  rel="noreferrer noopener"
                  className="flex h-8 w-8 items-center justify-center rounded-skin border border-[var(--border)] p-1.5 text-current opacity-60 hover:scale-110 hover:border-accent hover:text-accent hover:opacity-100"
                >
                  <SocialIcon link={link} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Centered stacks media under the copy; split places it after the copy on md+ */}
      {(layout === 'centered' || layout === 'split') && media}
    </section>
  );
}
