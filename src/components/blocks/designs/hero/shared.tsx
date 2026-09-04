'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import ManagedImage from '@/components/ui/ManagedImage';
import SocialIcon from '@/components/ui/SocialIcon';
import { useIsDesktopWidth } from '@/hooks/useIsDesktopWidth';
import type {
  FeaturedHeroBlock as FeaturedHeroBlockData,
  HeroMediaFrame,
  HeroMediaRadius,
  HeroMediaRatio,
  HeroMediaSize,
  HeroSecondaryAction,
  ImageAlignment,
  HeroLayout,
  SocialLink,
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
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
      loading="eager"
      fetchPriority="high"
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

export function useHeroLayout(block: FeaturedHeroBlockData) {
  const isDesktop = useIsDesktopWidth();
  const layout = block.layout ?? legacyLayout(block.imageAlign ?? 'right');
  // On mobile, `split` collapses to `centered` (the two-col grid doesn't
  // narrow well); `centered` and `banner` pass through unchanged so banner
  // keeps its full-bleed backdrop on mobile. Paired with the HeroForm
  // clearing `mediaPosition` on layout change, a stale "bottom" never
  // silently overrides the mobile default.
  const effectiveLayout = !isDesktop && layout === 'split' ? 'centered' : layout;
  const mobileMediaAtTop = block.mediaPosition !== 'bottom';
  const splitLeft = layout === 'split' && block.mediaSide === 'left';
  const isBanner = effectiveLayout === 'banner';
  const isSplit = effectiveLayout === 'split';
  const isCentered = effectiveLayout === 'centered';
  const badge = block.statusBadge?.enabled ? block.statusBadge : null;
  const roles = block.roles && block.roles.length > 0 ? block.roles : [];
  const secondary = block.secondaryAction;
  return {
    isDesktop,
    layout,
    effectiveLayout,
    mobileMediaAtTop,
    splitLeft,
    isBanner,
    isSplit,
    isCentered,
    badge,
    roles,
    secondary,
  };
}

export function heroMediaPlacementClass(
  effectiveLayout: HeroLayout,
  mobileMediaAtTop: boolean,
  splitLeft: boolean,
): string | undefined {
  if (effectiveLayout === 'centered') {
    return mobileMediaAtTop ? 'order-first mx-auto' : 'mx-auto';
  }
  if (effectiveLayout === 'split') {
    return splitLeft ? 'order-first justify-self-start' : 'order-first justify-self-end md:order-none';
  }
  return undefined;
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

/* Hero primitives — logic-identical parts extracted from the 4 designs
   (see docs/specs/hero-skeleton.md). Classes/markup stay per-design;
   these own ONLY the shared behavior so a new hero gets it for free.
   Additive only — every existing export above is untouched. */

/** Banner backdrop image. Default hides on error; others don't (preserved via prop). */
export function HeroBannerBackdrop({
  src,
  hideOnError,
}: {
  src: string;
  hideOnError?: boolean;
}) {
  return (
    // Raw img: custom error-hide behavior (ManagedImage shows a
    // fallback instead) + eager LCP. next/image can't take over:
    // CMS thumbnails are arbitrary remote URLs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      decoding="async"
      fetchPriority="high"
      className="absolute inset-0 -z-10 h-full w-full object-cover"
      onError={
        hideOnError
          ? (e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }
          : undefined
      }
    />
  );
}

/** Primary CTA — tab-navigation intercept is identical in all 4 heroes. */
export function HeroPrimaryCta({
  href,
  onNavigate,
  className,
  children,
}: {
  href: string;
  onNavigate?: (href: string) => boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={(event) => {
        if (onNavigate?.(href)) event.preventDefault();
      }}
      className={className}
    >
      {children}
    </a>
  );
}

/** Secondary action — renders nothing without a label; `_blank` never intercepts. */
export function HeroSecondaryCta({
  action,
  onNavigate,
  className,
  children,
}: {
  action?: HeroSecondaryAction;
  onNavigate?: (href: string) => boolean;
  className?: string;
  children?: ReactNode;
}) {
  if (!action?.label) return null;
  return (
    <a
      href={action.url}
      target={action.target === '_blank' ? '_blank' : undefined}
      rel={action.target === '_blank' ? 'noreferrer noopener' : undefined}
      onClick={(event) => {
        if (action.target !== '_blank' && onNavigate?.(action.url)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {children ?? action.label}
    </a>
  );
}

export function shouldShowSocials(
  showSocials: boolean | undefined,
  socials?: SocialLink[],
): boolean {
  return showSocials === true && (socials?.length ?? 0) > 0;
}

/**
 * Socials row — mailto/target/rel/title wiring identical everywhere.
 * Content differs by design: icon (default/cutie/riso) vs text (editorial).
 */
export function HeroSocials({
  socials,
  ulClassName,
  linkClassName,
  renderContent,
}: {
  socials: SocialLink[];
  ulClassName?: string;
  linkClassName?: string;
  renderContent?: (link: SocialLink) => ReactNode;
}) {
  return (
    <ul className={ulClassName} aria-label="Social links">
      {socials.map((link) => (
        <li key={link.id}>
          <a
            href={link.url}
            title={link.label ?? link.platform}
            aria-label={link.label ?? link.platform}
            target={link.url.startsWith('mailto:') ? undefined : '_blank'}
            rel="noreferrer noopener"
            className={linkClassName}
          >
            {renderContent ? renderContent(link) : <SocialIcon link={link} />}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The 3-dot window-chrome dots; callers keep their own bar wrapper. */
export function BrowserDots() {
  return (
    <>
      <span className="h-2 w-2 rounded-full bg-red-400" />
      <span className="h-2 w-2 rounded-full bg-amber-400" />
      <span className="h-2 w-2 rounded-full bg-green-400" />
    </>
  );
}

/** Split-grid column pair — same strings in all 4 heroes. */
export function splitGridClass(splitLeft: boolean): string {
  return splitLeft
    ? 'md:grid-cols-[auto_minmax(0,1fr)]'
    : 'md:grid-cols-[minmax(0,1fr)_auto]';
}

/**
 * The media branch shape shared by all heroes:
 * banner ? backdrop : thumbnail ? DesignMedia : placeholder ? slot : null.
 * Per-design media defaults ride along as args (they intentionally differ).
 */
export function heroMediaNode({
  block,
  isBanner,
  placementClass,
  showPlaceholder,
  renderMedia,
  placeholderSize = 'md',
  placeholderRatio = 'square',
  bannerHideOnError,
}: {
  block: FeaturedHeroBlockData;
  isBanner: boolean;
  placementClass?: string;
  showPlaceholder?: boolean;
  renderMedia: (placement?: string) => ReactNode;
  placeholderSize?: HeroMediaSize;
  placeholderRatio?: HeroMediaRatio;
  bannerHideOnError?: boolean;
}): ReactNode {
  if (isBanner) {
    return block.thumbnail ? (
      <HeroBannerBackdrop src={block.thumbnail} hideOnError={bannerHideOnError} />
    ) : null;
  }
  if (block.thumbnail) return <>{renderMedia(placementClass)}</>;
  if (showPlaceholder) {
    return (
      <HeroPlaceholder
        size={placeholderSize}
        ratio={placeholderRatio}
        className={placementClass}
      />
    );
  }
  return null;
}
