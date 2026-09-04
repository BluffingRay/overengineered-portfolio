import type { MouseEvent, ReactNode } from 'react';
import Link from 'next/link';
import ManagedImage from '@/components/ui/ManagedImage';
import Reveal from '../../Reveal';
import type { BlogBlock, Post } from '@/types/schema';

/* Atoms shared by blog designs: the published feed + its slicing rule,
   the cover art, and the floating-reader link interception. Nothing
   here assumes an art direction. */

/** Published posts only, newest first. */
export function selectPublished(posts?: Post[]): Post[] {
  return (posts ?? [])
    .filter((post) => post.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}

/** `latest` teases the 3 newest; `all` stacks every published post. */
export function selectVisible(published: Post[], isAll: boolean): Post[] {
  return isAll ? published : published.slice(0, 3);
}

export function Cover({
  post,
  placeholder = '✎',
}: {
  post: Post;
  placeholder?: string;
}) {
  return (
    <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-current/[0.04]">
      {post.coverImage ? (          <ManagedImage
          src={post.coverImage}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex select-none items-center justify-center text-6xl font-semibold opacity-[0.07]"
        >
          {placeholder}
        </span>
      )}
    </div>
  );
}

export function EmptyFeed() {
  return <p className="text-sm opacity-50">Nothing published yet.</p>;
}

/** Hosted shareable href: /u/[slug]?post=ID vs B's /blog?post=ID. */
export function postHref(id: string, slug?: string): string {
  return slug ? `/u/${slug}?post=${encodeURIComponent(id)}` : `/blog?post=${encodeURIComponent(id)}`;
}

/** Link click → floating reader when present; else plain navigation (href already points to correct shell). */
export function openPostHandler(
  id: string,
  onOpenPost?: (id: string) => void,
) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (onOpenPost) {
      event.preventDefault();
      onOpenPost(id);
    }
  };
}

/* Blog primitives — logic-identical parts extracted from the 4 blog
   designs (see docs/specs/design-skeletons.md). Covers, dates, and
   excerpts stay per-design; the feed/branch/reveal/link wiring is
   shared. Additive only. */

/** Untitled fallback — identical in every card and row. */
export function postTitle(post: Post): string {
  return post.title || 'Untitled';
}

/** Published feed + latest/all slice for one block. */
export function useBlogFeed(
  block: BlogBlock,
  posts?: Post[],
): { visible: Post[]; isAll: boolean } {
  const isAll = block.variant === 'all';
  return { visible: selectVisible(selectPublished(posts), isAll), isAll };
}

/** Post link — href + floating-reader interception in one place. */
export function BlogPostLink({
  id,
  slug,
  onOpenPost,
  className,
  children,
}: {
  id: string;
  slug?: string;
  onOpenPost?: (id: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={postHref(id, slug)}
      className={className}
      onClick={openPostHandler(id, onOpenPost)}
    >
      {children}
    </Link>
  );
}

/**
 * The blog skeleton: title + empty state + latest/all branch + Reveal
 * stagger live here. `allTag` picks the list wrapper: 'ul' wraps each
 * row in an `<li>` (default/cutie/editorial), 'div' renders bare
 * Reveals (riso). Row/card fns return inner content only.
 */
export function BlogShell({
  block,
  posts,
  sectionClassName,
  titleClassName,
  allTag = 'ul',
  allClassName,
  allItemClassName,
  latestClassName,
  renderRow,
  renderCard,
}: {
  block: BlogBlock;
  posts?: Post[];
  sectionClassName?: string;
  titleClassName?: string;
  allTag?: 'ul' | 'div';
  allClassName?: string;
  allItemClassName?: string;
  latestClassName?: string;
  renderRow: (post: Post, index: number) => ReactNode;
  renderCard: (post: Post, index: number) => ReactNode;
}) {
  const { visible, isAll } = useBlogFeed(block, posts);
  const AllTag = allTag;
  return (
    <section className={sectionClassName}>
      <h2 className={titleClassName}>{block.title}</h2>

      {visible.length === 0 ? (
        <EmptyFeed />
      ) : isAll ? (
        <AllTag className={allClassName}>
          {visible.map((post, index) =>
            allTag === 'ul' ? (
              <li key={post.id} className={allItemClassName}>
                <Reveal delay={Math.min(index * 40, 200)}>
                  {renderRow(post, index)}
                </Reveal>
              </li>
            ) : (
              <Reveal key={post.id} delay={Math.min(index * 40, 200)}>
                {renderRow(post, index)}
              </Reveal>
            ),
          )}
        </AllTag>
      ) : (
        <div className={latestClassName}>
          {visible.map((post, index) => (
            <Reveal key={post.id} delay={Math.min(index * 60, 300)}>
              {renderCard(post, index)}
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
