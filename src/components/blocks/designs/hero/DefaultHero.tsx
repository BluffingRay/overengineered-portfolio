'use client';

import { useRef } from 'react';
import {
  STATUS_STYLES,
  HeroMedia,
  TypewriterRoles,
  useFitOneLine,
  useHeroLayout,
  heroMediaPlacementClass,
  HeroPrimaryCta,
  HeroSecondaryCta,
  HeroSocials,
  shouldShowSocials,
  heroMediaNode,
  splitGridClass,
} from './shared';
import type { HeroDesignProps } from '../types';

/** The original hero rendering — now the neutral default, layout-driven. */
export default function DefaultHero({
  block,
  socials,
  onNavigate,
  showMediaPlaceholder,
}: HeroDesignProps) {
  const { effectiveLayout, mobileMediaAtTop, splitLeft, badge, roles: identityRoles, secondary } =
    useHeroLayout(block);
  const nameRef = useRef<HTMLHeadingElement>(null);
  // `free` (default) auto-fits the font to one line; `compact` wraps naturally.
  useFitOneLine(nameRef, block.name ?? '', (block.nameFit ?? 'free') === 'free');
  const status = STATUS_STYLES[badge?.color ?? 'green'];
  const showSocials = shouldShowSocials(block.showSocials, socials);

  const placementClass = heroMediaPlacementClass(effectiveLayout, mobileMediaAtTop, splitLeft);

  const media = heroMediaNode({
    block,
    isBanner: effectiveLayout === 'banner',
    placementClass,
    showPlaceholder: showMediaPlaceholder,
    renderMedia: (placement) => <HeroMedia block={block} className={placement} />,
    placeholderSize: block.mediaSize ?? 'md',
    placeholderRatio: block.mediaRatio ?? 'square',
    bannerHideOnError: true,
  });
  return (
    <section
      className={`isolate ${
        effectiveLayout === 'split'
          ? // Edge-anchored two-column row: media always `auto` (hugs its size), copy always `1fr` (fills).
            // Left swaps cols so media stays `auto` even when it visually leads.
            `grid items-center gap-6 ${splitGridClass(splitLeft)} md:gap-10`
          : effectiveLayout === 'banner'
            ? 'relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-skin'
            : 'flex flex-col items-center gap-6 text-center'
      }`}
    >
      {/* Banner background only — split media follows the copy so it trails on md+ */}
      {effectiveLayout === 'banner' && media}

      <div
        className={
          effectiveLayout === 'banner'
            ? 'w-full rounded-skin bg-black/50 p-10 text-white backdrop-blur-sm'
            : effectiveLayout === 'split'
              ? 'max-w-xl space-y-4'
              : 'w-full'
        }
      >
        {(block.eyebrow || badge) && (
          <div
            className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${effectiveLayout === 'centered' ? 'justify-center' : ''}`}
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
            effectiveLayout === 'centered' ? 'mx-auto' : ''
          }`}
        >
          {block.subheading}
        </p>

        <div
          className={`mt-7 flex flex-wrap items-center gap-3 ${
            effectiveLayout === 'centered' ? 'justify-center' : ''
          }`}
        >
          <HeroPrimaryCta
            href={block.ctaHref}
            onNavigate={onNavigate}
            className="inline-block rounded-skin border border-accent/60 px-5 py-2 text-sm font-medium text-accent hover:bg-accent hover:text-background"
          >
            {block.ctaLabel} →
          </HeroPrimaryCta>
          <HeroSecondaryCta
            action={secondary ?? undefined}
            onNavigate={onNavigate}
            className="inline-block rounded-skin border border-current/25 px-5 py-2 text-sm font-medium hover:border-accent hover:text-accent"
          />
        </div>

        {showSocials && (
          <HeroSocials
            socials={socials!}
            ulClassName={`mt-4 flex flex-wrap items-center gap-1.5 ${
              effectiveLayout === 'centered' ? 'justify-center' : ''
            }`}
            linkClassName="flex h-8 w-8 items-center justify-center rounded-skin border border-[var(--border)] p-1.5 text-current opacity-60 hover:scale-110 hover:border-accent hover:text-accent hover:opacity-100"
          />
        )}
      </div>

      {/* Centered stacks media under the copy; split places it after the copy on md+ */}
      {(effectiveLayout === 'centered' || effectiveLayout === 'split') && media}
    </section>
  );
}
