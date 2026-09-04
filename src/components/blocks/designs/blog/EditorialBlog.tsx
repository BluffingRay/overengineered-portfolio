import ManagedImage from '@/components/ui/ManagedImage';
import { stripHtml } from '@/components/blog/BlogViews';
import {
  BlogPostLink,
  BlogShell,
  postTitle,
} from './shared';
import type { BlogDesignProps } from '../types';

/**
 * Editorial blog — newsprint. No card boxes anywhere: latest runs as
 * three ruled columns, all as a numbered print index. Typography does
 * the layout; covers shrink to bordered thumbnails or vanish entirely.
 */
export default function EditorialBlog({ block, posts, onOpenPost, slug }: BlogDesignProps) {
  return (
    <BlogShell
      block={block}
      posts={posts}
      sectionClassName="dsn-editorial space-y-6"
      titleClassName="ed-serif text-3xl leading-tight tracking-tight"
      allTag="ul"
      allClassName="divide-y divide-current/10"
      // Columns share one hairline; cells pad off it. Padding targets
      // the grid's direct children (Reveal roots) — first/last must be
      // resolved among real siblings, not inside each Reveal wrapper.
      latestClassName="grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-current/10 md:[&>*]:px-8 md:[&>*:first-child]:pl-0 md:[&>*:last-child]:pr-0"
      renderRow={(post, index) => (
        /* Whole row is the anchor — a print index line, not a card. */
        <BlogPostLink
          id={post.id}
          slug={slug}
          onOpenPost={onOpenPost}
          className="group flex items-baseline gap-4 py-3 sm:gap-6"
        >
          <span
            aria-hidden="true"
            className="ed-serif shrink-0 text-sm opacity-40"
          >
            {String(index + 1).padStart(2, '0')}.
          </span>
          <h3 className="ed-serif min-w-0 flex-1 text-lg italic leading-snug group-hover:text-accent">
            {postTitle(post)}
          </h3>
          {post.publishedAt && (
            <time className="shrink-0 text-[10px] uppercase tracking-widest opacity-50">
              {post.publishedAt}
            </time>
          )}
        </BlogPostLink>
      )}
      renderCard={(post) => (
        <article className="group relative flex h-full flex-col">
          {post.coverImage && (
            <div className="mb-4 aspect-video w-full overflow-hidden border border-current/15">
              <ManagedImage
                src={post.coverImage}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {post.publishedAt && (
            <time className="text-[10px] uppercase tracking-widest opacity-50">
              {post.publishedAt}
            </time>
          )}
          <h3 className="ed-serif mt-1 text-2xl leading-tight">
            <BlogPostLink
              id={post.id}
              slug={slug}
              onOpenPost={onOpenPost}
              className="after:absolute after:inset-0"
            >
              {postTitle(post)}
            </BlogPostLink>
          </h3>
          <p className="mt-2 line-clamp-3 text-sm opacity-60">
            {stripHtml(post.content)}
          </p>
        </article>
      )}
    />
  );
}
