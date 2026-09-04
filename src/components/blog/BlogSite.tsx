'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Post } from '@/types/schema';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { goBackOrHome } from '@/lib/navigation';
import { PostReader } from './BlogViews';

/**
 * Dedicated post viewer, dual-mode: standalone route /blog?post=<id>
 * (bare /blog is not a destination — it bounces home) OR floating
 * overlay via FloatingPage with `postId` + `onClose` props. Skin,
 * accent and font arrive via the layout's pre-paint script on <html>.
 */
export default function BlogSite({
  postId: postIdProp,
  onClose,
  posts: postsProp,
}: {
  /** Overlay mode: which post to read (prop wins over ?post=). */
  postId?: string;
  /** Overlay mode: close the floating sheet. Absent = standalone. */
  onClose?: () => void;
  /** Overlay data override: the hosted public render passes the doc's
      published posts — the B localStorage store is the wrong source there.
      B modes pass nothing and read the store as before. */
  posts?: Post[];
} = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data } = usePortfolioData();

  // Hydration-safe mount gate (same pattern as PortfolioView).
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const activeId = postIdProp ?? searchParams.get('post');

  useEffect(() => {
    if (ready && !activeId && !onClose) router.replace('/');
  }, [ready, activeId, onClose, router]);

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="animate-pulse font-mono text-sm opacity-40">
          ~/loading…
        </p>
      </main>
    );
  }

  if (!activeId) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="animate-pulse font-mono text-sm opacity-40">~/…</p>
      </main>
    );
  }

  // Hosted overlay passes the doc's published posts; B modes read the store.
  const posts: Post[] =
    postsProp ??
    (data.posts ?? []).filter((post) => post.status === 'published');
  const post = posts.find((candidate) => candidate.id === activeId);

  if (!post) {
    return (
      <main className="min-h-dvh">
        <div className="mx-auto w-full max-w-prose px-6 py-16 text-center">
          <p className="opacity-50">
            This post doesn&apos;t exist or isn&apos;t published.
          </p>
          <button
            type="button"
            onClick={() =>
              onClose ? onClose() : goBackOrHome(router)
            }
            className="mt-4 inline-block font-mono text-xs opacity-60 hover:text-accent hover:opacity-100"
          >
            ← Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-5xl px-6 pb-16 pt-6">
        <PostReader
          post={post}
          onBack={() => (onClose ? onClose() : goBackOrHome(router))}
        />
      </div>
    </main>
  );
}
