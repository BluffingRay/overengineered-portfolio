import type { MouseEvent } from 'react';
import type { Post } from '@/types/schema';

/* Atoms shared by blog designs: the published feed + its slicing rule,
   the cover art, and the floating-reader link interception. Nothing
   here assumes an art direction. */

/** Published posts only, newest first. */
export function selectPublished(posts?: Post[]): Post[] {
  return (posts ?? [])
    .filter((post) => post.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}

/** `latest` teases the 3 newest; `all` stacks every published post. */
export function selectVisible(published: Post[], isAll: boolean): Post[] {
  return isAll ? published : published.slice(0, 3);
}

export function Cover({
  post,
  placeholder = '✎',
}: {
  post: Post;
  placeholder?: string;
}) {
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
          {placeholder}
        </span>
      )}
    </div>
  );
}

export function EmptyFeed() {
  return <p className="text-sm opacity-50">Nothing published yet.</p>;
}

/** Link click → floating reader when present; else plain /blog navigation. */
export function openPostHandler(
  id: string,
  onOpenPost?: (id: string) => void,
) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (onOpenPost) {
      event.preventDefault();
      onOpenPost(id);
    }
  };
}
