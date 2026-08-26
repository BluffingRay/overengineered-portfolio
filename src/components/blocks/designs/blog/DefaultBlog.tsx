import Link from 'next/link';
import { stripHtml } from '@/components/blog/BlogViews';
import Reveal from '../../Reveal';
import {
  Cover,
  EmptyFeed,
  openPostHandler,
  selectPublished,
  selectVisible,
} from './shared';
import type { BlogDesignProps } from '../types';

/** The original blog rendering, moved verbatim out of BlogBlock. */
export default function CoderBlog({ block, posts, onOpenPost }: BlogDesignProps) {
  const published = selectPublished(posts);

  const isAll = block.variant === 'all';
  const visible = selectVisible(published, isAll);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">{block.title}</h2>

      {visible.length === 0 ? (
        <EmptyFeed />
      ) : isAll ? (
        <ul className="divide-y divide-current/10">
          {visible.map((post, index) => (
            <li key={post.id}>
              <Reveal delay={Math.min(index * 40, 200)}>
                <Link
                  href={`/blog?post=${post.id}`}
                  className="lift group flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:gap-6"
                  onClick={openPostHandler(post.id, onOpenPost)}
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
                      {post.title || 'Untitled'}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm opacity-60">
                      {stripHtml(post.content)}
                    </p>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((post, index) => (
            <Reveal key={post.id} delay={Math.min(index * 60, 300)}>
              <article className="lift relative flex h-full flex-col overflow-hidden rounded-skin border border-current/15 hover:border-current/40">
                <Cover post={post} />

                <div className="flex flex-1 flex-col p-5 pt-4">
                  {post.publishedAt && (
                    <time className="font-mono text-[11px] opacity-40">
                      {post.publishedAt}
                    </time>
                  )}

                  <h3 className="mt-1 font-medium leading-snug">
                    <Link
                      href={`/blog?post=${post.id}`}
                      className="text-accent after:absolute after:inset-0 after:rounded-skin"
                      onClick={openPostHandler(post.id, onOpenPost)}
                    >
                      {post.title || 'Untitled'}
                    </Link>
                  </h3>
                  <p className="mt-1 line-clamp-3 text-sm opacity-60">
                    {stripHtml(post.content)}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
