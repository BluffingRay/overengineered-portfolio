import type { Post } from '@/types/schema';
import ManagedImage from '@/components/ui/ManagedImage';
import { stripHtml } from '@/components/blog/BlogViews';
import {
  BlogPostLink,
  BlogShell,
  postTitle,
} from './shared';
import type { BlogDesignProps } from '../types';

/** Duotone cover plate with the accent pass printed over the grayscale. */
function RisoCover({ post }: { post: Post }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-current/[0.04]">
      {post.coverImage ? (
        <>
          <ManagedImage
            src={post.coverImage}
            className="riso-duotone h-full w-full object-cover"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-accent opacity-40 mix-blend-color"
          />
        </>
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

/**
 * Riso blog — zine plates. Every post prints as an inked card with a
 * hard offset shadow that physically depresses on hover; covers run
 * through the duotone press, and each plate carries a numbered date
 * strip like an edition stamp.
 */
export default function RisoBlog({ block, posts, onOpenPost, slug }: BlogDesignProps) {
  // One anchor per plate = the plate itself; the motion owner's base
  // rule animates its translate/shadow depress.
  const plate =
    'group border-2 border-current p-3 shadow-[4px_4px_0_0_currentColor] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_currentColor]';

  const datestrip = (post: Post, index: number) =>
    post.publishedAt && (
      <span className="mt-0 flex items-baseline justify-between border-t-2 border-current pt-1 font-mono text-[10px] uppercase">
        <span>No. {String(index + 1).padStart(2, '0')}</span>
        <time>{post.publishedAt}</time>
      </span>
    );

  return (
    <BlogShell
      block={block}
      posts={posts}
      sectionClassName="dsn-riso space-y-6"
      titleClassName="riso-misprint text-2xl font-black uppercase leading-tight tracking-tight"
      allTag="div"
      allClassName="flex flex-col gap-4"
      latestClassName="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6"
      renderRow={(post, index) => (
        <BlogPostLink
          id={post.id}
          slug={slug}
          onOpenPost={onOpenPost}
          className={`${plate} flex flex-col gap-4 sm:flex-row sm:items-start`}
        >
          <div className="w-full shrink-0 sm:w-48">
            <RisoCover post={post} />
            {datestrip(post, index)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-black uppercase leading-tight group-hover:text-accent">
              {postTitle(post)}
            </h3>
            <p className="mt-1 line-clamp-2 font-mono text-xs opacity-70">
              {stripHtml(post.content)}
            </p>
          </div>
        </BlogPostLink>
      )}
      renderCard={(post, index) => (
        <BlogPostLink
          id={post.id}
          slug={slug}
          onOpenPost={onOpenPost}
          className={`${plate} flex h-full flex-col`}
        >
          <RisoCover post={post} />

          {datestrip(post, index)}

          <h3 className="mt-2 text-xl font-black uppercase leading-tight group-hover:text-accent">
            {postTitle(post)}
          </h3>
          <p className="mt-1 line-clamp-3 font-mono text-xs opacity-70">
            {stripHtml(post.content)}
          </p>
        </BlogPostLink>
      )}
    />
  );
}
