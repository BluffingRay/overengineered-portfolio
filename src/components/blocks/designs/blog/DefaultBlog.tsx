import { stripHtml } from '@/components/blog/BlogViews';
import {
  BlogPostLink,
  BlogShell,
  Cover,
  postTitle,
} from './shared';
import type { BlogDesignProps } from '../types';

/** The original blog rendering, moved verbatim out of BlogBlock. */
export default function CoderBlog({ block, posts, onOpenPost, slug }: BlogDesignProps) {
  return (
    <BlogShell
      block={block}
      posts={posts}
      sectionClassName="space-y-6"
      titleClassName="text-2xl font-semibold tracking-tight"
      allTag="ul"
      allClassName="divide-y divide-current/10"
      latestClassName="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6"
      renderRow={(post) => (
        <BlogPostLink
          id={post.id}
          slug={slug}
          onOpenPost={onOpenPost}
          className="lift group flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:gap-6"
        >
          <div className="w-full rounded-skin border border-current/10 sm:w-48">
            <Cover post={post} />
          </div>
          <div className="min-w-0 flex-1">
            {post.publishedAt && (
              <time className="font-mono text-[11px] opacity-40">
                {post.publishedAt}
              </time>
            )}
            <h3 className="mt-0.5 font-medium leading-snug group-hover:text-accent">
              {postTitle(post)}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm opacity-60">
              {stripHtml(post.content)}
            </p>
          </div>
        </BlogPostLink>
      )}
      renderCard={(post) => (
        <article className="lift relative flex h-full flex-col overflow-hidden rounded-skin border border-current/15 hover:border-current/40">
          <Cover post={post} />

          <div className="flex flex-1 flex-col p-5 pt-4">
            {post.publishedAt && (
              <time className="font-mono text-[11px] opacity-40">
                {post.publishedAt}
              </time>
            )}

            <h3 className="mt-1 font-medium leading-snug">
              <BlogPostLink
                id={post.id}
                slug={slug}
                onOpenPost={onOpenPost}
                className="text-accent after:absolute after:inset-0 after:rounded-skin"
              >
                {postTitle(post)}
              </BlogPostLink>
            </h3>
            <p className="mt-1 line-clamp-3 text-sm opacity-60">
              {stripHtml(post.content)}
            </p>
          </div>
        </article>
      )}
    />
  );
}
