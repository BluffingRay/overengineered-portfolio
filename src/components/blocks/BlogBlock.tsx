import type { BlogBlock as BlogBlockData, Post } from '@/types/schema';
import Link from 'next/link';
import { stripHtml } from '@/components/blog/BlogViews';
import Reveal from './Reveal';

interface Props {
  block: BlogBlockData;
  posts?: Post[];
  /** Floating reader; absent = plain /blog links. */
  onOpenPost?: (id: string) => void;
}

function Cover({ post }: { post: Post }) {
  return (
    <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-current/[0.04]">
      {post.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
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
          ✎
        </span>
      )}
    </div>
  );
}

export default function BlogBlock({ block, posts, onOpenPost }: Props) {
  const published = (posts ?? [])
    .filter((post) => post.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));

  // `latest` teases the 3 newest as a card grid; `all` stacks every
  // published post as horizontal rows. Absent variant = latest.
  const isAll = block.variant === 'all';
  const visible = isAll ? published : published.slice(0, 3);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">{block.title}</h2>

      {visible.length === 0 ? (
        <p className="text-sm opacity-50">Nothing published yet.</p>
      ) : isAll ? (
        <ul className="divide-y divide-current/10">
          {visible.map((post, index) => (
            <li key={post.id}>
              <Reveal delay={Math.min(index * 40, 200)}>
                <Link
                  href={`/blog?post=${post.id}`}
                  className="lift group flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:gap-6"
                  onClick={(event) => {
                    if (onOpenPost) {
                      event.preventDefault();
                      onOpenPost(post.id);
                    }
                  }}
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
                      onClick={(event) => {
                        if (onOpenPost) {
                          event.preventDefault();
                          onOpenPost(post.id);
                        }
                      }}
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
