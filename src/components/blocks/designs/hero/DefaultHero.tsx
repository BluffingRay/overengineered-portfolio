'use client';

import { useRef } from 'react';
import SocialIcon from '@/components/ui/SocialIcon';
import {
  STATUS_STYLES,
  HeroMedia,
  HeroPlaceholder,
  TypewriterRoles,
  legacyLayout,
  useFitOneLine,
} from './shared';
import type { HeroDesignProps } from '../types';

/** The original hero rendering — now the neutral default, layout-driven. */
export default function DefaultHero({
  block,
  socials,
  onNavigate,
  showMediaPlaceholder,
}: HeroDesignProps) {
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
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : null
    ) : block.thumbnail ? (
      <HeroMedia
        block={block}
        className={
          layout === 'centered'
            ? block.mediaPosition === 'top'
              ? 'order-first mx-auto'
              : 'mx-auto'
            : layout === 'split'
              ? splitLeft
                  ? 'order-first justify-self-start'
                  : 'order-first justify-self-end md:order-none'
              : undefined
        }
      />
    ) : showMediaPlaceholder ? (
      <HeroPlaceholder
        size={block.mediaSize ?? 'md'}
        ratio={block.mediaRatio ?? 'square'}
        className={
          layout === 'centered'
            ? block.mediaPosition === 'top'
              ? 'order-first mx-auto'
              : 'mx-auto'
            : layout === 'split'
              ? splitLeft
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
          ? // Edge-anchored two-column row: media always `auto` (hugs its size), copy always `1fr` (fills).
            // Left swaps cols so media stays `auto` even when it visually leads.
            `grid items-center gap-6 ${splitLeft ? 'md:grid-cols-[auto_minmax(0,1fr)]' : 'md:grid-cols-[minmax(0,1fr)_auto]'} md:gap-10`
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
