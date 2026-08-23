'use client';

import type { Post } from '@/types/schema';

/**
 * Public post reader — mounted by the dedicated /blog route. Reuses
 * `.rich-text` typography for content and the site's motion tokens
 * (.settle-in) for entry.
 */

export function stripHtml(html: string, max = 160): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function PostReader({
  post,
  onBack,
}: {
  post: Post;
  onBack: () => void;
}) {
  return (
    <article className={`settle-in mx-auto max-w-prose py-4`}>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 font-mono text-xs opacity-50 hover:text-accent hover:opacity-100"
      >
        ← Back to site
      </button>

      <h1 className="text-balance text-4xl font-semibold tracking-tight">
        {post.title || 'Untitled'}
      </h1>
      <p className="mt-2 font-mono text-xs opacity-40">
        {post.publishedAt ?? 'Unpublished'}
      </p>

      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt=""
          decoding="async"
          fetchPriority="high"
          className="mt-6 aspect-video w-full rounded-skin object-cover"
        />
      )}

      {/* Authored through TipTap; serialized inline styles (image size /
          wraps) carry their own layout — see ResizableImage. */}
      <div
        className="rich-text mt-8"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
