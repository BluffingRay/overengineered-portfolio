import type { StatusColor } from '@/types/schema';
import SocialIcon from '@/components/ui/SocialIcon';
import {
  MEDIA_FRAME_CLASSES,
  MEDIA_RATIO_CLASSES,
  MEDIA_RADIUS_CLASSES,
  MEDIA_SIZE_CLASSES,
  HeroPlaceholder,
  legacyLayout,
} from './shared';
import type { HeroDesignProps } from '../types';

const STAMP_STYLES: Record<StatusColor, string> = {
  green: 'border-green-500 text-green-500',
  blue: 'border-sky-500 text-sky-500',
  amber: 'border-amber-500 text-amber-500',
  purple: 'border-purple-500 text-purple-500',
};

function CropMark({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const classes = {
    tl: '-left-1.5 -top-1.5 border-l-2 border-t-2',
    tr: '-right-1.5 -top-1.5 border-r-2 border-t-2',
    bl: '-bottom-1.5 -left-1.5 border-b-2 border-l-2',
    br: '-bottom-1.5 -right-1.5 border-b-2 border-r-2',
  } as const;
  return <span aria-hidden="true" className={`absolute h-4 w-4 border-current ${classes[position]}`} />;
}

function RisoMedia({
  block,
  className,
}: {
  block: HeroDesignProps['block'];
  className?: string;
}) {
  const ratio = block.mediaRatio ?? 'landscape';
  const radius = block.mediaRadius ?? 'none';
  const size = block.mediaSize ?? 'md';
  const frame = block.mediaFrame ?? 'none';

  const effectiveRadius = MEDIA_RADIUS_CLASSES[radius] ?? 'rounded-none';
  const frameClass =
    frame === 'window' ? '' : (MEDIA_FRAME_CLASSES[frame as Exclude<typeof frame, 'window'>] ?? '');

  return (
    <figure
      className={`relative border-2 border-current bg-background p-2 ${MEDIA_SIZE_CLASSES[size]} ${effectiveRadius} ${frameClass} ${className ?? ''}`}
    >
      <CropMark position="tl" />
      <CropMark position="tr" />
      <CropMark position="bl" />
      <CropMark position="br" />
      {frame === 'window' && (
        <div
          aria-hidden="true"
          className="mb-2 flex items-center gap-1.5 border-b-2 border-current bg-surface px-3 py-1.5"
        >
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-green-400" />
        </div>
      )}
      <div className={`relative overflow-hidden ${MEDIA_RATIO_CLASSES[ratio]} ${effectiveRadius}`}>
        <img
          src={block.thumbnail}
          alt=""
          decoding="async"
          fetchPriority="high"
          className="riso-duotone h-full w-full object-cover"
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-accent opacity-40 mix-blend-color" />
      </div>
      <figcaption className="mt-2 flex items-baseline justify-between border-t-2 border-current pt-1 font-mono text-[10px] uppercase tracking-widest">
        <span>Fig. 01</span>
        <span className="truncate pl-4 opacity-70">{block.name || block.heading}</span>
      </figcaption>
    </figure>
  );
}

/**
 * Riso hero — screen-printed poster with full layout parity.
 * Centered/split/banner all wear the misprint + halftone + grain,
 * but the media plate moves: centered under the copy, split pinned
 * to a side, banner as a veil behind the ink.
 */
export default function RisoHero({ block, socials, onNavigate }: HeroDesignProps) {
  const layout = block.layout ?? legacyLayout(block.imageAlign ?? 'right');
  const splitLeft = layout === 'split' && block.mediaSide === 'left';
  const badge = block.statusBadge?.enabled ? block.statusBadge : null;
  const roles = block.roles && block.roles.length > 0 ? block.roles : [];
  const secondary = block.secondaryAction;
  const showSocials = block.showSocials === true && (socials?.length ?? 0) > 0;

  const isBanner = layout === 'banner';
  const isSplit = layout === 'split';
  const isCentered = layout === 'centered';

  const media =
    isBanner ? (
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
      <RisoMedia
        block={block}
        className={
          isCentered
            ? 'mx-auto'
            : splitLeft
              ? 'order-first justify-self-start'
              : 'order-first justify-self-end md:order-none'
        }
      />
    ) : (
      <HeroPlaceholder
        size={block.mediaSize ?? 'md'}
        ratio={block.mediaRatio ?? 'landscape'}
        className={
          isCentered
            ? 'mx-auto'
            : splitLeft
              ? 'order-first justify-self-start'
              : 'order-first justify-self-end md:order-none'
        }
      />
    );

  const copy = (
    <div className={isBanner ? 'relative z-10' : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        {block.eyebrow && (
          <p className="inline-block -rotate-2 border-2 border-current px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest">
            {block.eyebrow}
          </p>
        )}
        {badge && (
          <span
            className={`ml-auto inline-flex h-16 w-16 rotate-6 items-center justify-center rounded-full border-2 p-2 text-center font-mono text-[9px] font-bold uppercase leading-tight ${STAMP_STYLES[badge.color ?? 'green']}`}
          >
            ★<br />
            {badge.text}
          </span>
        )}
      </div>

      {block.name ? (
        <>
          <h1 className="riso-misprint mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
            {block.name}
          </h1>
          {roles.length > 0 && (
            <p className="mt-3 font-mono text-xs uppercase tracking-widest opacity-70 sm:text-sm" aria-label={roles.join(', ')}>
              {roles.join(' // ')}
            </p>
          )}
          <p className="riso-highlight mt-5 inline-block max-w-xl pb-0.5 text-xl font-extrabold uppercase leading-snug">{block.heading}</p>
        </>
      ) : (
        <h1 className="riso-misprint mt-4 max-w-2xl text-balance text-3xl font-black uppercase leading-[1.02] sm:text-4xl">
          {block.heading}
        </h1>
      )}

      <p className="mt-3 max-w-lg font-mono text-sm leading-relaxed opacity-70">{block.subheading}</p>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <a
          href={block.ctaHref}
          onClick={(e) => {
            if (onNavigate?.(block.ctaHref)) e.preventDefault();
          }}
          className="border-2 border-current bg-accent px-5 py-2 font-mono text-sm font-bold uppercase text-background shadow-[4px_4px_0_0_currentColor] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_currentColor] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          {block.ctaLabel} →
        </a>
        {secondary && secondary.label && (
          <a
            href={secondary.url}
            target={secondary.target === '_blank' ? '_blank' : undefined}
            rel={secondary.target === '_blank' ? 'noreferrer noopener' : undefined}
            onClick={(e) => {
              if (secondary.target !== '_blank' && onNavigate?.(secondary.url)) e.preventDefault();
            }}
            className="border-2 border-current px-4 py-[6px] font-mono text-sm font-bold uppercase shadow-[3px_3px_0_0_currentColor] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_currentColor] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            {secondary.label}
          </a>
        )}
      </div>

      {showSocials && (
        <ul className="mt-6 flex flex-wrap items-center gap-2" aria-label="Social links">
          {socials!.map((link) => (
            <li key={link.id}>
              <a
                href={link.url}
                title={link.label ?? link.platform}
                aria-label={link.label ?? link.platform}
                target={link.url.startsWith('mailto:') ? undefined : '_blank'}
                rel="noreferrer noopener"
                className="flex h-8 w-8 items-center justify-center border-2 border-current bg-background p-1.5 shadow-[2px_2px_0_0_currentColor] hover:bg-accent hover:text-background active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <SocialIcon link={link} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (isBanner) {
    return (
      <section className="dsn-riso relative isolate overflow-hidden border-2 border-current p-6 sm:p-10">
        {media}
        <div aria-hidden="true" className="riso-halftone absolute -right-12 -top-12 h-64 w-64" />
        <div aria-hidden="true" className="riso-grain pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-background/60 backdrop-blur-[1px]" />
        <div className="relative z-10 rounded-skin border-2 border-current bg-background/90 p-6 backdrop-blur-sm">{copy}</div>
      </section>
    );
  }

  if (isSplit) {
    return (
      <section
        className={`dsn-riso relative isolate grid items-center gap-6 border-2 border-current p-6 sm:p-8 ${splitLeft ? 'md:grid-cols-[auto_minmax(0,1fr)]' : 'md:grid-cols-[minmax(0,1fr)_auto]'} md:gap-10`}
      >
        <div aria-hidden="true" className="riso-halftone pointer-events-none absolute -right-12 -top-12 h-64 w-64" />
        <div aria-hidden="true" className="riso-grain pointer-events-none absolute inset-0" />
        <div className={`relative z-10 ${splitLeft ? 'md:order-1' : ''}`}>{copy}</div>
        {media}
      </section>
    );
  }

  // centered (default poster)
  return (
    <section className="dsn-riso relative isolate overflow-hidden border-2 border-current p-6 sm:p-10">
      <div aria-hidden="true" className="riso-halftone absolute -right-12 -top-12 h-64 w-64" />
      <div aria-hidden="true" className="riso-grain pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        {block.mediaPosition === 'top' ? (
          <>
            {media}
            <div className="mt-8">{copy}</div>
          </>
        ) : (
          copy
        )}
      </div>
    </section>
  );
}
