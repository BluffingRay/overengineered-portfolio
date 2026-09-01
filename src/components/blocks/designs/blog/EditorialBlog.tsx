import Link from 'next/link';
import ManagedImage from '@/components/ui/ManagedImage';
import { stripHtml } from '@/components/blog/BlogViews';
import Reveal from '../../Reveal';
import {
  EmptyFeed,
  openPostHandler,
  postHref,
  selectPublished,
  selectVisible,
} from './shared';
import type { BlogDesignProps } from '../types';

/**
 * Editorial blog — newsprint. No card boxes anywhere: latest runs as
 * three ruled columns, all as a numbered print index. Typography does
 * the layout; covers shrink to bordered thumbnails or vanish entirely.
 */
export default function EditorialBlog({ block, posts, onOpenPost, slug }: BlogDesignProps) {
  const published = selectPublished(posts);

  const isAll = block.variant === 'all';
  const visible = selectVisible(published, isAll);

  return (
    <section className="dsn-editorial space-y-6">
      <h2 className="ed-serif text-3xl leading-tight tracking-tight">
        {block.title}
      </h2>

      {visible.length === 0 ? (
        <EmptyFeed />
      ) : isAll ? (
        <ul className="divide-y divide-current/10">
          {visible.map((post, index) => (
            <li key={post.id}>
              <Reveal delay={Math.min(index * 40, 200)}>
                {/* Whole row is the anchor — a print index line, not a card. */}
                <Link
                  href={postHref(post.id, slug)}
                  className="group flex items-baseline gap-4 py-3 sm:gap-6"
                  onClick={openPostHandler(post.id, onOpenPost)}
                >
                  <span
                    aria-hidden="true"
                    className="ed-serif shrink-0 text-sm opacity-40"
                  >
                    {String(index + 1).padStart(2, '0')}.
                  </span>
                  <h3 className="ed-serif min-w-0 flex-1 text-lg italic leading-snug group-hover:text-accent">
                    {post.title || 'Untitled'}
                  </h3>
                  {post.publishedAt && (
                    <time className="shrink-0 text-[10px] uppercase tracking-widest opacity-50">
                      {post.publishedAt}
                    </time>
                  )}
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      ) : (
        // Columns share one hairline; cells pad off it. Padding targets
        // the grid's direct children (Reveal roots) — first/last must be
        // resolved among real siblings, not inside each Reveal wrapper.
        <div className="grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-current/10 md:[&>*]:px-8 md:[&>*:first-child]:pl-0 md:[&>*:last-child]:pr-0">
          {visible.map((post, index) => (
            <Reveal key={post.id} delay={Math.min(index * 60, 300)}>
              <article className="group relative flex h-full flex-col">
                {post.coverImage && (
                  <div className="mb-4 aspect-video w-full overflow-hidden border border-current/15">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.coverImage}
                      alt=""
                      loading="lazy"
                      decoding="async"
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
                  <Link
                    href={postHref(post.id, slug)}
                    className="after:absolute after:inset-0"
                    onClick={openPostHandler(post.id, onOpenPost)}
                  >
                    {post.title || 'Untitled'}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-3 text-sm opacity-60">
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
