'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { PostStatus } from '@/types/schema';
import { POST_STATUSES } from '@/types/schema';
import { usePosts } from '@/hooks/usePosts';

/**
 * Sidebar launcher — authoring happens full-screen at /write. This view
 * creates, opens, quick-flips status, and deletes; no inline editing.
 */

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  published: 'Published',
};

export default function PostAdmin({
  onOpenPost,
}: {
  /** Overlay mode: open the writer as a floating sheet in-place. */
  onOpenPost?: (id: string) => void;
} = {}) {
  const router = useRouter();
  const { posts, createPost, setPostStatus, deletePost } = usePosts();

  const open = (id: string) =>
    onOpenPost ? onOpenPost(id) : router.push(`/write?post=${id}`);

  return (
    <section aria-label="Blog posts" className="space-y-2">
      <p className="text-xs opacity-50">
        Posts open in the full-screen writer at /write.
      </p>

      <button
        type="button"
        onClick={() => open(createPost())}
        className="flex w-full items-center justify-center gap-1.5 rounded-skin border border-dashed border-[var(--border)] px-2.5 py-1 text-xs opacity-70 hover:border-accent hover:text-accent hover:opacity-100"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        New post
      </button>

      {posts.length === 0 && (
        <p className="text-xs opacity-50">
          No posts yet — write the first one.
        </p>
      )}

      {[...posts]
        .sort((a, b) => b.id.localeCompare(a.id))
        .map((post) => (
          // Flex row of SIBLING buttons (no nesting): title opens /write,
          // pills flip status, 🗑 deletes in place.
          <div
            key={post.id}
            className="flex items-center gap-1.5 rounded-skin border border-dashed border-[var(--border)] p-1.5"
          >
            <button
              type="button"
              title={`Open "${post.title || 'Untitled'}" in the writer`}
              onClick={() => open(post.id)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm font-medium">
                {post.title || 'Untitled'}
                {post.status === 'draft' && (
                  <span className="ml-2 rounded-full border border-current/25 px-1.5 py-px text-[9px] uppercase tracking-wide opacity-60">
                    draft
                  </span>
                )}
              </span>
            </button>

            {POST_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={post.status === status}
                onClick={() => setPostStatus(post.id, status)}
                className={`shrink-0 rounded-skin border px-1.5 py-0.5 text-[10px] ${
                  post.status === status
                    ? 'border-accent bg-accent text-background'
                    : 'border-[var(--border)] opacity-60 hover:opacity-100'
                }`}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}

            <button
              type="button"
              title="Delete post"
              aria-label={`Delete post ${post.title}`}
              onClick={() => {
                if (window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
                  deletePost(post.id);
                }
              }}
              className="shrink-0 rounded-skin px-1.5 py-0.5 text-xs opacity-60 hover:text-red-500 hover:opacity-100"
            >
              🗑
            </button>
          </div>
        ))}
    </section>
  );
}
