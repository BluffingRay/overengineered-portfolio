import { stripHtml } from '@/components/blog/BlogViews';
import {
  BlogPostLink,
  BlogShell,
  Cover,
  postTitle,
} from './shared';
import type { BlogDesignProps } from '../types';

/**
 * Cutie blog — scrapbook. Latest posts become polaroids (fat bottom
 * margin, caption tilted like handwriting that straightens when you
 * look at it), dates become sticker pills, rows are separated by
 * dashed washi lines and the empty-cover glyph blooms.
 */
export default function CutieBlog({ block, posts, onOpenPost, slug }: BlogDesignProps) {
  return (
    <BlogShell
      block={block}
      posts={posts}
      sectionClassName="space-y-6"
      titleClassName="-rotate-1 text-2xl font-bold tracking-tight"
      allTag="ul"
      allClassName="space-y-4"
      allItemClassName="border-b-2 border-dashed border-current/10 pb-4 last:border-b-0"
      latestClassName="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6"
      renderRow={(post) => (
        <BlogPostLink
          id={post.id}
          slug={slug}
          onOpenPost={onOpenPost}
          className="group flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
        >
          <div className="w-full overflow-hidden rounded-md shadow-sm sm:w-48">
            <Cover post={post} placeholder="✿" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold leading-snug group-hover:text-accent">
              {postTitle(post)}
            </h3>
            {post.publishedAt && (
              <time className="mt-1.5 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px]">
                {post.publishedAt}
              </time>
            )}
            <p className="mt-1 line-clamp-2 text-xs opacity-60">
              {stripHtml(post.content)}
            </p>
          </div>
        </BlogPostLink>
      )}
      renderCard={(post, index) => (
        <article className="group relative flex h-full flex-col rounded-md bg-surface p-3 pb-12 shadow">
          <Cover post={post} placeholder="✿" />

          {/* Handwritten caption: tilted per card, straightens on hover. */}
          <h3
            className={`mt-3 text-lg font-bold leading-snug transition-transform group-hover:rotate-0 ${
              index % 2 ? 'rotate-1' : '-rotate-1'
            }`}
          >
            <BlogPostLink
              id={post.id}
              slug={slug}
              onOpenPost={onOpenPost}
              className="after:absolute after:inset-0 after:rounded-md"
            >
              {postTitle(post)}
            </BlogPostLink>
          </h3>
          {post.publishedAt && (
            <time className="mt-2 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px]">
              {post.publishedAt}
            </time>
          )}
          <p className="mt-1 line-clamp-2 text-xs opacity-60">
            {stripHtml(post.content)}
          </p>
        </article>
      )}
    />
  );
}
