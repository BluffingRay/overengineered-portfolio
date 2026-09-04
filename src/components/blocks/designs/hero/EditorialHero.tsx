import ManagedImage from '@/components/ui/ManagedImage';
import {
  MEDIA_FRAME_CLASSES,
  MEDIA_RATIO_CLASSES,
  MEDIA_RADIUS_CLASSES,
  MEDIA_SIZE_CLASSES,
  STATUS_STYLES,
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
function EditorialMedia({
  block,
  className,
}: {
  block: HeroDesignProps['block'];
  className?: string;
}) {
  const ratio = block.mediaRatio ?? 'portrait';
  const radius = block.mediaRadius ?? 'none';
  const size = block.mediaSize ?? 'md';
  const frame = block.mediaFrame ?? 'subtle';

  const effectiveRadius = MEDIA_RADIUS_CLASSES[radius] ?? 'rounded-none';
  const frameClass =
    frame === 'window' ? '' : (MEDIA_FRAME_CLASSES[frame as Exclude<typeof frame, 'window'>] ?? '');

  return (
    <div
      className={`${MEDIA_SIZE_CLASSES[size]} ${MEDIA_RATIO_CLASSES[ratio]} ${effectiveRadius} ${frameClass} relative flex flex-col overflow-hidden border border-current/15 bg-surface ${className ?? ''}`}
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
  );
}

/**
 * Editorial hero — magazine masthead with full layout parity.
 * Centered stacks the figure, split pins it left/right, banner
 * puts the image behind a paper veil. Size/ratio/radius/frame
 * all flow through the media.
 */
export default function EditorialHero({
  block,
  socials,
  onNavigate,
  showMediaPlaceholder,
}: HeroDesignProps) {
  const { effectiveLayout, mobileMediaAtTop, splitLeft, badge, roles, secondary } =
    useHeroLayout(block);
  const showSocials = shouldShowSocials(block.showSocials, socials);
  const statusDot = STATUS_STYLES[badge?.color ?? 'green'].dot;
  const placementClass = heroMediaPlacementClass(effectiveLayout, mobileMediaAtTop, splitLeft);

  const media = heroMediaNode({
    block,
    isBanner: effectiveLayout === 'banner',
    placementClass,
    showPlaceholder: showMediaPlaceholder,
    renderMedia: (placement) => <EditorialMedia block={block} className={placement} />,
    placeholderSize: block.mediaSize ?? 'md',
    placeholderRatio: block.mediaRatio ?? 'portrait',
  });

  const isSplit = effectiveLayout === 'split';
  const isBanner = effectiveLayout === 'banner';

  if (isBanner) {
    return (
      <section className="dsn-editorial relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-skin">
        {media}
        <div className="absolute inset-0 -z-10 bg-background/75 backdrop-blur-[2px]" aria-hidden="true" />
        <header className="w-full border-t-2 border-current bg-background/90 p-8 backdrop-blur-sm">
          {(block.eyebrow || badge) && (
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              {block.eyebrow && (
                <p className="text-[11px] uppercase tracking-[0.3em] opacity-50">
                  {block.eyebrow}
                </p>
              )}
              {badge && (
                <span className="border border-current/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] opacity-60">
                  <span
                    aria-hidden="true"
                    className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${statusDot}`}
                  />
                  {badge.text}
                </span>
              )}
            </div>
          )}
          {block.name ? (
            <>
              <h1 className="ed-serif mt-4 text-4xl leading-[1.04] tracking-tight sm:text-5xl">
                {block.name}
              </h1>
              {roles.length > 0 && (
                <p className="mt-2 text-xs uppercase tracking-[0.25em] opacity-50" aria-label={roles.join(', ')}>
                  {roles.join(' · ')}
                </p>
              )}
              <p className="ed-serif mt-4 max-w-xl text-xl italic leading-snug opacity-80">{block.heading}</p>
            </>
          ) : (
            <h1 className="ed-serif mt-4 max-w-2xl text-balance text-3xl leading-[1.08] tracking-tight sm:text-4xl">
              {block.heading}
            </h1>
          )}
          <p className="mt-4 max-w-lg border-l-2 border-current/15 pl-4 text-sm leading-relaxed opacity-60">
            {block.subheading}
          </p>
          <nav className="mt-6 flex flex-wrap items-center gap-5" aria-label="Primary">
            <HeroPrimaryCta
              href={block.ctaHref}
              onNavigate={onNavigate}
              className="ed-serif inline-flex items-baseline gap-1.5 border-b border-accent pb-0.5 text-base italic hover:opacity-70"
            >
              {block.ctaLabel}
              <span aria-hidden="true">→</span>
            </HeroPrimaryCta>
            <HeroSecondaryCta
              action={secondary ?? undefined}
              onNavigate={onNavigate}
              className="text-sm underline decoration-current/30 underline-offset-4 hover:text-accent"
            />
          </nav>
          {showSocials && (
            <HeroSocials
              socials={socials!}
              ulClassName="mt-6 flex flex-wrap gap-4 text-[11px] uppercase tracking-[0.2em]"
              linkClassName="opacity-50 hover:text-accent hover:opacity-100"
              renderContent={(link) => link.label ?? link.platform}
            />
          )}
        </header>
      </section>
    );
  }

  if (isSplit) {
    return (
      <section
        className={`dsn-editorial grid gap-10 ${splitGridClass(splitLeft)} md:items-end`}
      >
        {/* copy */}
        <header className={`border-t-2 border-current pt-6 ${splitLeft ? 'md:order-1' : ''}`}>
          {(block.eyebrow || badge) && (
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              {block.eyebrow && (
                <p className="text-[11px] uppercase tracking-[0.3em] opacity-50">{block.eyebrow}</p>
              )}
              {badge && (
                <span className="border border-current/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] opacity-60">
                  <span aria-hidden="true" className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${statusDot}`} />
                  {badge.text}
                </span>
              )}
            </div>
          )}
          {block.name ? (
            <>
              <h1 className="ed-serif mt-4 text-5xl leading-[1.04] tracking-tight sm:text-6xl">{block.name}</h1>
              {roles.length > 0 && (
                <p className="mt-2 text-xs uppercase tracking-[0.25em] opacity-50" aria-label={roles.join(', ')}>
                  {roles.join(' · ')}
                </p>
              )}
              <p className="ed-serif mt-5 max-w-xl text-xl italic leading-snug opacity-80">{block.heading}</p>
            </>
          ) : (
            <h1 className="ed-serif mt-4 max-w-2xl text-balance text-4xl leading-[1.08] tracking-tight sm:text-5xl">
              {block.heading}
            </h1>
          )}
          <p className="mt-4 max-w-lg border-l-2 border-current/15 pl-4 text-sm leading-relaxed opacity-60">
            {block.subheading}
          </p>
          <nav className="mt-7 flex flex-wrap items-center gap-5" aria-label="Primary">
            <HeroPrimaryCta
              href={block.ctaHref}
              onNavigate={onNavigate}
              className="ed-serif inline-flex items-baseline gap-1.5 border-b border-accent pb-0.5 text-base italic hover:opacity-70"
            >
              {block.ctaLabel}
              <span aria-hidden="true">→</span>
            </HeroPrimaryCta>
            <HeroSecondaryCta
              action={secondary ?? undefined}
              onNavigate={onNavigate}
              className="text-sm underline decoration-current/30 underline-offset-4 hover:text-accent"
            />
          </nav>
          {showSocials && (
            <HeroSocials
              socials={socials!}
              ulClassName="mt-6 flex flex-wrap gap-4 text-[11px] uppercase tracking-[0.2em]"
              linkClassName="opacity-50 hover:text-accent hover:opacity-100"
              renderContent={(link) => link.label ?? link.platform}
            />
          )}
        </header>
        {media}
      </section>
    );
  }

  // centered
  return (
    <section className="dsn-editorial flex flex-col items-center gap-6 text-center">
      <header className="w-full max-w-2xl border-t-2 border-current pt-6">
        {(block.eyebrow || badge) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {block.eyebrow && (
              <p className="text-[11px] uppercase tracking-[0.3em] opacity-50">{block.eyebrow}</p>
            )}
            {badge && (
              <span className="border border-current/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] opacity-60">
                <span aria-hidden="true" className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${statusDot}`} />
                {badge.text}
              </span>
            )}
          </div>
        )}
        {block.name ? (
          <>
            <h1 className="ed-serif mt-4 text-5xl leading-[1.04] tracking-tight sm:text-6xl">{block.name}</h1>
            {roles.length > 0 && (
              <p className="mt-2 text-xs uppercase tracking-[0.25em] opacity-50" aria-label={roles.join(', ')}>
                {roles.join(' · ')}
              </p>
            )}
            <p className="ed-serif mt-5 text-xl italic leading-snug opacity-80">{block.heading}</p>
          </>
        ) : (
          <h1 className="ed-serif mt-4 text-balance text-4xl leading-[1.08] tracking-tight sm:text-5xl">
            {block.heading}
          </h1>
        )}
        <p className="mx-auto mt-4 max-w-lg border-l-2 border-current/15 pl-4 text-left text-sm leading-relaxed opacity-60 sm:text-center sm:border-l-0 sm:border-t-2 sm:pl-0 sm:pt-3">
          {block.subheading}
        </p>
        <nav className="mt-7 flex flex-wrap items-center justify-center gap-5" aria-label="Primary">
          <HeroPrimaryCta
            href={block.ctaHref}
            onNavigate={onNavigate}
            className="ed-serif inline-flex items-baseline gap-1.5 border-b border-accent pb-0.5 text-base italic hover:opacity-70"
          >
            {block.ctaLabel}
            <span aria-hidden="true">→</span>
          </HeroPrimaryCta>
          <HeroSecondaryCta
            action={secondary ?? undefined}
            onNavigate={onNavigate}
            className="text-sm underline decoration-current/30 underline-offset-4 hover:text-accent"
          />
        </nav>
        {showSocials && (
          <HeroSocials
            socials={socials!}
            ulClassName="mt-6 flex flex-wrap justify-center gap-4 text-[11px] uppercase tracking-[0.2em]"
            linkClassName="opacity-50 hover:text-accent hover:opacity-100"
            renderContent={(link) => link.label ?? link.platform}
          />
        )}
      </header>
      {media}
    </section>
  );
}
