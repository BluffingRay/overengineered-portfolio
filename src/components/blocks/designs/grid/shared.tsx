import type { AppCardItem, Post } from '@/types/schema';

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
