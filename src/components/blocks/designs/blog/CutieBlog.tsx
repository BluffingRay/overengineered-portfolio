import Link from 'next/link';
import { stripHtml } from '@/components/blog/BlogViews';
import Reveal from '../../Reveal';
import {
  Cover,
  EmptyFeed,
  openPostHandler,
  postHref,
  selectPublished,
  selectVisible,
} from './shared';
import type { BlogDesignProps } from '../types';

/**
 * Cutie blog — scrapbook. Latest posts become polaroids (fat bottom
 * margin, caption tilted like handwriting that straightens when you
 * look at it), dates become sticker pills, rows are separated by
 * dashed washi lines and the empty-cover glyph blooms.
 */
export default function CutieBlog({ block, posts, onOpenPost, slug }: BlogDesignProps) {
  const published = selectPublished(posts);

  const isAll = block.variant === 'all';
  const visible = selectVisible(published, isAll);

  return (
    <section className="space-y-6">
      <h2 className="-rotate-1 text-2xl font-bold tracking-tight">
        {block.title}
      </h2>

      {visible.length === 0 ? (
        <EmptyFeed />
      ) : isAll ? (
        <ul className="space-y-4">
          {visible.map((post, index) => (
            <li
              key={post.id}
              className="border-b-2 border-dashed border-current/10 pb-4 last:border-b-0"
            >
              <Reveal delay={Math.min(index * 40, 200)}>
                <Link
                  href={postHref(post.id, slug)}
                  className="group flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
                  onClick={openPostHandler(post.id, onOpenPost)}
                >
                  <div className="w-full overflow-hidden rounded-md shadow-sm sm:w-48">
                    <Cover post={post} placeholder="✿" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold leading-snug group-hover:text-accent">
                      {post.title || 'Untitled'}
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
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
          {visible.map((post, index) => (
            <Reveal key={post.id} delay={Math.min(index * 60, 300)}>
              <article className="group relative flex h-full flex-col rounded-md bg-surface p-3 pb-12 shadow">
                <Cover post={post} placeholder="✿" />

                {/* Handwritten caption: tilted per card, straightens on hover. */}
                <h3
                  className={`mt-3 text-lg font-bold leading-snug transition-transform group-hover:rotate-0 ${
                    index % 2 ? 'rotate-1' : '-rotate-1'
                  }`}
                >
                  <Link
                    href={postHref(post.id, slug)}
                    className="after:absolute after:inset-0 after:rounded-md"
                    onClick={openPostHandler(post.id, onOpenPost)}
                  >
                    {post.title || 'Untitled'}
                  </Link>
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
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
