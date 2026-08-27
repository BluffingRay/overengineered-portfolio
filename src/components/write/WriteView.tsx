'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { PostStatus } from '@/types/schema';
import { POST_STATUSES } from '@/types/schema';
import { usePosts } from '@/hooks/usePosts';
import { goBackOrHome } from '@/lib/navigation';
import RichTextEditor from '@/components/rich/RichTextEditor';
import MediaPicker from '@/components/editor/MediaPicker';
import { useTrimmedCommit } from '../editor/editor-shared';
import { useAuth } from '@/hooks/useAuth';
import LoginCard from '@/components/auth/LoginCard';

/**
 * Medium-style writer, dual-mode: standalone route at /write?post=<id>
 * (bare /write = chooser; StrictMode-safe — no auto-create) OR floating
 * overlay via FloatingPage, where `postId` + `onClose` props drive it
 * and closing just unmasks the page underneath — zero navigation.
 * Skin/accent/font arrive via the layout's pre-paint script on <html>.
 */

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  published: 'Published',
};

export default function WriteView({
  postId: postIdProp,
  onClose,
}: {
  /** Overlay mode: which post to edit (prop wins over ?post=). */
  postId?: string;
  /** Overlay mode: close the floating sheet. Absent = standalone. */
  onClose?: () => void;
} = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Direct visits to /write must respect the auth gate (the overlay path is
  // already reached through the gated Posts UI). This is a guardrail, not
  // a boundary — same as the main view.
  const auth = useAuth();
  const { posts, createPost, updatePost, setPostStatus, deletePost } =
    usePosts();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const exit = () => (onClose ? onClose() : goBackOrHome(router));
  const activeId = postIdProp ?? createdId ?? searchParams.get('post');
  const post = activeId ? posts.find((p) => p.id === activeId) : undefined;
  const sorted = [...posts].sort((a, b) => b.id.localeCompare(a.id));

  // Title draft buffer: the store keeps titles verbatim now, but the
  // hook still owns trim-on-blur — free typing (spaces, clearing)
  // without sanitizer echo fights.
  const title = useTrimmedCommit(post?.title ?? '', (next) => {
    if (post) updatePost(post.id, { title: next });
  });

  function handleNew() {
    const id = createPost();
    if (onClose) {
      setCreatedId(id);
    } else {
      // replace(): Back from a fresh draft leaves /write entirely
      // instead of bouncing through the chooser.
      router.replace(`/write?post=${id}`);
    }
  }

  if (auth.enabled && !auth.authenticated) {
    return <LoginCard onLogin={auth.login} />;
  }

  return (
    <main className="min-h-dvh">
      {/* Chooser: no post targeted */}
      {!activeId && (
        <section className="mx-auto w-full max-w-md px-6 py-24">
          <h1 className="text-3xl font-semibold tracking-tight">Write</h1>
          <p className="mt-1 text-sm opacity-60">
            Stories, essays, build logs. Drafts stay invisible to visitors
            until you publish.
          </p>

          <button
            type="button"
            onClick={handleNew}
            className="mt-8 flex w-full items-center justify-center gap-1.5 rounded-skin border border-dashed border-[var(--border)] px-2.5 py-2 text-sm opacity-70 hover:border-accent hover:text-accent hover:opacity-100"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New post
          </button>

          {sorted.length > 0 ? (
            <ul className="mt-10 divide-y divide-current/10">
              {sorted.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/write?post=${p.id}`)}
                    className="w-full px-1 py-3 text-left"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-base font-medium">
                        {p.title || 'Untitled'}
                      </span>
                      {p.status === 'draft' ? (
                        <span className="shrink-0 rounded-full border border-current/25 px-1.5 py-px text-[9px] uppercase tracking-wide opacity-60">
                          draft
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full border border-accent/40 px-1.5 py-px text-[9px] uppercase tracking-wide text-accent">
                          published
                        </span>
                      )}
                    </span>
                    <time className="mt-1 block font-mono text-[11px] opacity-40">
                      {p.publishedAt ?? '—'}
                    </time>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 text-sm opacity-50">
              Nothing yet — start your first story.
            </p>
          )}

          <button
            type="button"
            onClick={exit}
            className="mt-12 inline-block font-mono text-xs opacity-50 hover:text-accent hover:opacity-100"
          >
            ← Back
          </button>
        </section>
      )}

      {/* Unknown id */}
      {activeId && !post && (
        <section className="mx-auto w-full max-w-md px-6 py-24">
          <h1 className="text-2xl font-semibold tracking-tight">
            That post doesn&apos;t exist.
          </h1>
          <p className="mt-2 text-sm opacity-60">It may have been deleted.</p>
          <button
            type="button"
            onClick={handleNew}
            className="mt-8 flex w-full items-center justify-center gap-1.5 rounded-skin border border-dashed border-[var(--border)] px-2.5 py-2 text-sm opacity-70 hover:border-accent hover:text-accent hover:opacity-100"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New post
          </button>
          <button
            type="button"
            onClick={exit}
            className="mt-10 inline-block font-mono text-xs opacity-50 hover:text-accent hover:opacity-100"
          >
            ← Back
          </button>
        </section>
      )}

      {/* Editor */}
      {post && (
        <section aria-label="Post editor" className="settle-in">
          <header className="sticky top-0 z-20 border-b border-current/15 bg-background/80 backdrop-blur">
            <div className="flex items-center justify-between gap-2 px-4 py-2 md:px-6">
              <button
                type="button"
                onClick={exit}
                className="font-mono text-xs opacity-60 hover:text-accent hover:opacity-100"
              >
                ← Back
              </button>

              <div className="flex items-center gap-2">
                {POST_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={post.status === status}
                    onClick={() => setPostStatus(post.id, status)}
                    className={`rounded-skin border px-2 py-0.5 text-xs ${
                      post.status === status
                        ? 'border-accent bg-accent text-background'
                        : 'border-current/25 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  title="Set cover image"
                  className="flex items-center gap-1.5 rounded-skin border border-current/25 px-2 py-1 text-xs opacity-70 hover:border-accent hover:text-accent hover:opacity-100"
                >
                  {post.coverImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.coverImage}
                      alt=""
                      decoding="async"
                      className="h-7 w-7 rounded-skin object-cover"
                    />
                  )}
                  Cover
                </button>
                {post.coverImage && (
                  <button
                    type="button"
                    onClick={() =>
                      updatePost(post.id, { coverImage: undefined })
                    }
                    title="Remove cover image"
                    aria-label="Remove cover image"
                    className="rounded-skin px-1 py-0.5 text-xs opacity-50 hover:text-red-500 hover:opacity-100"
                  >
                    ✕
                  </button>
                )}

                <button
                  type="button"
                  title="Delete post"
                  aria-label={`Delete post ${post.title}`}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete "${post.title}"? This cannot be undone.`,
                      )
                    ) {
                      deletePost(post.id);
                      exit();
                    }
                  }}
                  className="rounded-skin px-1.5 py-0.5 text-xs opacity-60 hover:text-red-500 hover:opacity-100"
                >
                  🗑
                </button>

                <button
                  type="button"
                  onClick={exit}
                  className="rounded-skin border border-accent bg-accent px-3 py-1 text-xs font-semibold text-background hover:opacity-90"
                >
                  Done
                </button>
              </div>
            </div>
          </header>

          <article className="mx-auto w-full max-w-[44rem] px-6 pt-10 pb-24">
            <input
              value={title.draft}
              onChange={(e) => title.onChange(e.target.value)}
              onBlur={title.onBlur}
              maxLength={160}
              aria-label="Post title"
              placeholder="Title"
              className="w-full border-none bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-current/30 md:text-[2.5rem]"
            />

            <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs opacity-60">
              {post.status === 'published' ? (
                <label className="flex items-center gap-1.5">
                  <span className="opacity-70">Published</span>
                  <input
                    type="date"
                    value={post.publishedAt ?? ''}
                    onChange={(e) =>
                      updatePost(post.id, {
                        publishedAt: e.target.value || undefined,
                      })
                    }
                    aria-label="Publish date"
                    title="Publish date"
                    className="rounded-skin border border-current/20 bg-transparent px-1.5 py-0.5 font-mono text-xs opacity-90 hover:border-accent"
                  />
                </label>
              ) : (
                <p>Draft — invisible to visitors</p>
              )}
            </div>

            {post.coverImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={post.coverImage}
                alt=""
                decoding="async"
                className="mt-6 aspect-video w-full rounded-skin object-cover"
              />
            )}

            <div className="mt-8">
              <RichTextEditor
                content={post.content}
                onChange={(html) => updatePost(post.id, { content: html })}
                minHeight="55vh"
                placeholder="Tell your story…"
              />
            </div>
          </article>

          <MediaPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(url) => updatePost(post.id, { coverImage: url })}
          />
        </section>
      )}
    </main>
  );
}
