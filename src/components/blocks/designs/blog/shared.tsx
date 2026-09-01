import type { MouseEvent } from 'react';
import ManagedImage from '@/components/ui/ManagedImage';
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
      {post.coverImage ? (          <ManagedImage
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

/** Hosted shareable href: /u/[slug]?post=ID vs B's /blog?post=ID. */
export function postHref(id: string, slug?: string): string {
  return slug ? `/u/${slug}?post=${encodeURIComponent(id)}` : `/blog?post=${encodeURIComponent(id)}`;
}

/** Link click → floating reader when present; else plain navigation (href already points to correct shell). */
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
