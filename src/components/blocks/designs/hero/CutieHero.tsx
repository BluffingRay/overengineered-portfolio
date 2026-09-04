import type { StatusColor } from '@/types/schema';
import ManagedImage from '@/components/ui/ManagedImage';
import {
  MEDIA_FRAME_CLASSES,
  MEDIA_RATIO_CLASSES,
  MEDIA_RADIUS_CLASSES,
  MEDIA_SIZE_CLASSES,
  useHeroLayout,
  heroMediaPlacementClass,
  BrowserDots,
  HeroPrimaryCta,
  HeroSecondaryCta,
  HeroSocials,
  shouldShowSocials,
  heroMediaNode,
  splitGridClass,
} from './shared';
import type { HeroDesignProps } from '../types';

const STAMP_STYLES: Record<StatusColor, string> = {
  green: 'bg-green-400',
  blue: 'bg-sky-400',
  amber: 'bg-amber-400',
  purple: 'bg-purple-400',
};

function Squiggle() {
  return (
    <svg
      viewBox="0 0 220 12"
      aria-hidden="true"
      className="mt-1.5 h-3 w-44 text-accent sm:w-52"
    >
      <path
        d="M3 8 Q 15 2 27 7 T 51 7 T 75 7 T 99 7 T 123 7 T 147 7 T 171 7 T 195 7 T 217 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CutieMedia({
  block,
  className,
}: {
  block: HeroDesignProps['block'];
  className?: string;
}) {
  const ratio = block.mediaRatio ?? 'square';
  const radius = block.mediaRadius ?? 'theme';
  const size = block.mediaSize ?? 'md';
  const frame = block.mediaFrame ?? 'subtle';

  const effectiveRadius =
    ratio === 'circle'
      ? 'rounded-full'
      : radius === 'theme'
        ? 'cutie-blob'
        : (MEDIA_RADIUS_CLASSES[radius] ?? 'cutie-blob');
  const frameClass =
    frame === 'window' ? '' : MEDIA_FRAME_CLASSES[frame as Exclude<typeof frame, 'window'>] ?? '';

  return (
    <div className={`relative ${className ?? ''}`}>
      {/* washi tape */}
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-1/2 z-10 h-5 w-20 -translate-x-1/2 -rotate-3 border-x border-accent/20 bg-accent/25 backdrop-blur-[1px]"
      />
      <div
        className={`${MEDIA_SIZE_CLASSES[size]} ${MEDIA_RATIO_CLASSES[ratio]} ${effectiveRadius} ${frameClass} relative flex flex-col overflow-hidden shadow-lg shadow-accent/10`}
      >
        {frame === 'window' && (
          <div
            aria-hidden="true"
            className="flex items-center gap-1.5 border-b border-[var(--border)] bg-surface px-3 py-1.5"
          >
            <BrowserDots />
          </div>
        )}
        <ManagedImage
          src={block.thumbnail}
          loading="eager"
          fetchPriority="high"
          className="min-h-0 w-full flex-1 object-cover"
        />
      </div>
    </div>
  );
}

/**
 * Cutie hero — overengineered cuteness with full layout parity.
 * Supports centered / split (side) / banner reinterpreted in the
 * sticker-blob vocabulary. Size/ratio/radius/frame all flow through.
 */
export default function CutieHero({
  block,
  socials,
  onNavigate,
  showMediaPlaceholder,
}: HeroDesignProps) {
  const { effectiveLayout, mobileMediaAtTop, splitLeft, badge, roles, secondary } =
    useHeroLayout(block);
  const showSocials = shouldShowSocials(block.showSocials, socials);
  const placementClass = heroMediaPlacementClass(effectiveLayout, mobileMediaAtTop, splitLeft);
  const media = heroMediaNode({
    block,
    isBanner: effectiveLayout === 'banner',
    placementClass,
    showPlaceholder: showMediaPlaceholder,
    renderMedia: (placement) => <CutieMedia block={block} className={placement} />,
    placeholderSize: block.mediaSize ?? 'md',
    placeholderRatio: block.mediaRatio ?? 'square',
  });

  const isCentered = effectiveLayout === 'centered';
  const isSplit = effectiveLayout === 'split';
  const isBanner = effectiveLayout === 'banner';

  return (
    <section
      className={`dsn-cutie relative isolate ${
        isSplit
          ? `grid items-center gap-6 ${splitGridClass(splitLeft)} md:gap-10`
          : isBanner
            ? 'relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-skin'
            : 'mx-auto flex max-w-2xl flex-col items-center py-8 text-center'
      }`}
    >
      {/* doodles — only in centered to avoid grid overflow, banner hides them too */}
      {isCentered && (
        <>
          <span
            aria-hidden="true"
            className="cutie-float pointer-events-none absolute -left-1 top-12 select-none text-3xl opacity-20"
          >
            ✿
          </span>
          <span
            aria-hidden="true"
            className="cutie-float-slow pointer-events-none absolute -right-2 top-32 select-none text-2xl opacity-20"
          >
            ♡
          </span>
          <span
            aria-hidden="true"
            className="cutie-float pointer-events-none absolute bottom-14 left-6 select-none text-xl opacity-20"
          >
            ✧
          </span>
        </>
      )}

      {isBanner && media}

      <div
        className={
          isBanner
            ? 'w-full rounded-skin border border-accent/20 bg-background/85 p-8 backdrop-blur-sm'
            : isSplit
              ? 'max-w-xl space-y-4 text-left'
              : 'w-full space-y-4'
        }
      >
        {(block.eyebrow || badge) && (
          <div
            className={`flex flex-wrap items-center gap-2 ${isCentered ? 'justify-center' : isBanner ? '' : ''} ${isSplit ? '' : isCentered ? 'justify-center' : ''}`}
          >
            {badge && (
              <span
                className={`cutie-star inline-flex h-14 w-14 -rotate-6 items-center justify-center p-2 text-center text-[9px] font-bold uppercase leading-tight text-white ${
                  STAMP_STYLES[badge.color ?? 'green']
                }`}
              >
                {badge.text}
              </span>
            )}
            {block.eyebrow && (
              <p className="rounded-full bg-current/10 px-3 py-1 text-xs font-medium opacity-60">
                {block.eyebrow}
              </p>
            )}
          </div>
        )}

        {block.name ? (
          <>
            <h1
              className={`text-4xl font-extrabold tracking-tight sm:text-5xl ${isCentered ? 'mx-auto' : ''}`}
            >
              {block.name}
            </h1>
            <div className={isCentered || isBanner ? 'flex justify-center' : ''}>
              <Squiggle />
            </div>
            {roles.length > 0 && (
              <ul
                className={`mt-3 flex flex-wrap gap-2 ${isCentered || isBanner ? 'justify-center' : ''}`}
                aria-label={roles.join(', ')}
              >
                {roles.map((role, index) => (
                  <li
                    key={role}
                    className={`rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent ${
                      index % 2 ? 'rotate-[1.5deg]' : '-rotate-[1.5deg]'
                    }`}
                  >
                    {role}
                  </li>
                ))}
              </ul>
            )}
            <p
              className={`text-lg font-medium opacity-80 ${isCentered ? 'mx-auto max-w-md text-center' : isBanner ? 'max-w-xl' : ''}`}
            >
              {block.heading}
            </p>
          </>
        ) : (
          <h1
            className={`text-balance text-3xl font-extrabold tracking-tight sm:text-4xl ${isCentered ? 'mx-auto text-center' : ''}`}
          >
            {block.heading}
          </h1>
        )}

        <p
          className={`text-sm leading-relaxed opacity-60 ${isCentered ? 'mx-auto max-w-md text-center' : isBanner ? 'max-w-xl' : 'max-w-xl'}`}
        >
          {block.subheading}
        </p>

        <div
          className={`flex flex-wrap items-center gap-3 ${isCentered || isBanner ? 'justify-center' : ''} ${isSplit ? 'justify-start' : ''} pt-2`}
        >
          <HeroPrimaryCta
            href={block.ctaHref}
            onNavigate={onNavigate}
            className="cutie-btn rounded-full bg-accent px-6 py-2 text-sm font-bold text-background"
          >
            {block.ctaLabel} ♡
          </HeroPrimaryCta>
          <HeroSecondaryCta
            action={secondary ?? undefined}
            onNavigate={onNavigate}
            className="cutie-btn rounded-full border-2 border-accent/40 px-5 py-1.5 text-sm font-semibold text-accent"
          />
        </div>

        {showSocials && (
          <HeroSocials
            socials={socials!}
            ulClassName={`flex flex-wrap items-center gap-2 pt-2 ${isCentered || isBanner ? 'justify-center' : ''}`}
            linkClassName="cutie-btn flex h-9 w-9 items-center justify-center rounded-full border border-current/15 bg-surface p-2 text-current opacity-70 hover:text-accent hover:opacity-100"
          />
        )}
      </div>

      {(isCentered || isSplit) && media}
    </section>
  );
}
