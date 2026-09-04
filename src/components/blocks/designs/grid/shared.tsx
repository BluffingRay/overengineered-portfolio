import Link from 'next/link';
import { Fragment } from 'react';
import type { ReactNode } from 'react';
import ManagedImage from '@/components/ui/ManagedImage';
import type { AppCardItem, Post } from '@/types/schema';
import { postHref } from '../blog/shared';

/* Atoms shared by grid designs: link resolution is identical everywhere
   (the designs only disagree about how it *looks*), plus the stagger
   curve every design's Reveal wrappers share. */

export interface CardLinks {
  primaryHref: string;
  /** Resolvable blog reference; wins over customUrl. */
  linkedPost?: Post;
}

export function resolveCardLinks(
  app: AppCardItem,
  posts?: Post[],
): CardLinks {
  const primaryHref =
    { demo: app.demoUrl, github: app.githubUrl, href: app.href }[
      app.primaryAction ?? 'href'
    ] ?? app.href;

  // Custom link: a resolvable post reference wins over the external
  // URL; label alone renders nothing.
  const linkedPost = app.customPostId
    ? (posts ?? []).find((post) => post.id === app.customPostId)
    : undefined;

  return { primaryHref, linkedPost };
}

/** True when a footer-links row has anything to show. */
export function hasExtraLinks(app: AppCardItem, linkedPost?: Post): boolean {
  return Boolean(app.demoUrl || app.githubUrl || linkedPost || app.customUrl);
}

/** Card cascade — index*60ms capped at 300, shared by every design. */
export function staggerDelay(index: number): number {
  return Math.min(index * 60, 300);
}

/* Card primitives — logic-identical parts extracted from the 4 grid
   designs (see docs/specs/design-skeletons.md). Classes/markup stay
   per-design; these own ONLY the shared behavior. Additive only. */

/** Lazy cover image — centralized in ManagedImage (lazy + fallback). */
export function CardCoverImage({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <ManagedImage
      src={src}
      className={className ?? 'h-full w-full object-cover'}
    />
  );
}

/** Stretched title link — the whole card is one link via the overlay. */
export function CardTitleLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}

/** Tag row — empty-safe; per-design shapes ride the renderTag slot. */
export function CardTagList({
  tags,
  listClassName,
  tagClassName,
  renderTag,
}: {
  tags?: string[];
  listClassName?: string;
  tagClassName?: string;
  renderTag?: (tag: string, index: number) => ReactNode;
}) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className={listClassName}>
      {tags.map((tag, index) =>
        renderTag ? (
          <Fragment key={tag}>{renderTag(tag, index)}</Fragment>
        ) : (
          <span key={tag} className={tagClassName}>
            {tag}
          </span>
        ),
      )}
    </div>
  );
}

/**
 * Demo / GitHub / linked-post / custom footer — resolution order at
 * render (resolvable post > customUrl > nothing) is identical
 * everywhere; only classes + link glyphs differ per design.
 */
export function CardExtraLinks({
  app,
  linkedPost,
  slug,
  onOpenPost,
  className,
  linkClassName,
  demoSuffix = ' ↗',
  githubSuffix = ' ↗',
  readSuffix = ' →',
  openSuffix = ' ↗',
}: {
  app: AppCardItem;
  linkedPost?: Post;
  slug?: string;
  onOpenPost?: (id: string) => void;
  className?: string;
  linkClassName?: string;
  demoSuffix?: string;
  githubSuffix?: string;
  readSuffix?: string;
  openSuffix?: string;
}) {
  if (!hasExtraLinks(app, linkedPost)) return null;
  return (
    <div className={className}>
      {app.demoUrl && (
        <a href={app.demoUrl} target="_blank" rel="noreferrer" className={linkClassName}>
          Demo{demoSuffix}
        </a>
      )}
      {app.githubUrl && (
        <a href={app.githubUrl} target="_blank" rel="noreferrer" className={linkClassName}>
          GitHub{githubSuffix}
        </a>
      )}
      {linkedPost ? (
        <Link
          href={postHref(linkedPost.id, slug)}
          className={linkClassName}
          onClick={(event) => {
            if (onOpenPost) {
              event.preventDefault();
              onOpenPost(linkedPost.id);
            }
          }}
        >
          {app.customLabel ?? 'Read'}
          {readSuffix}
        </Link>
      ) : app.customUrl ? (
        <a href={app.customUrl} target="_blank" rel="noreferrer" className={linkClassName}>
          {app.customLabel || 'Open'}
          {openSuffix}
        </a>
      ) : null}
    </div>
  );
}
