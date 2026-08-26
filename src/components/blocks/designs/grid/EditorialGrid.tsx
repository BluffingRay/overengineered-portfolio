import Link from 'next/link';
import Reveal from '../../Reveal';
import { hasExtraLinks, resolveCardLinks, staggerDelay } from './shared';
import type { GridDesignProps } from '../types';

/**
 * Editorial grid — a magazine index, not cards: numbered rows on
 * hairline dividers, serif-italic titles, small-caps metadata pushed
 * hard right. The whole row is one link; typography does all the work.
 */
export default function EditorialGrid({
  block,
  cards,
  posts,
  onOpenPost,
}: GridDesignProps) {
  const cardById = new Map((cards ?? []).map((card) => [card.id, card]));

  return (
    <section className="dsn-editorial space-y-5">
      <h2 className="ed-serif border-t-2 border-current pt-4 text-3xl tracking-tight">
        {block.title}
      </h2>
      <ul className="divide-y divide-current/10">
        {block.apps.map((appId, index) => {
          const app = cardById.get(appId);
          if (!app) return null; // dangling ref — sanitizer normally removes these

          const { primaryHref, linkedPost } = resolveCardLinks(app, posts);

          // Category first; tags stand in when there is no category.
          const meta =
            app.category ??
            (app.tags && app.tags.length > 0
              ? app.tags.join(' · ')
              : undefined);

          return (
            <li key={appId} className="relative">
              <Reveal delay={staggerDelay(index)}>
                <div className="group flex items-start gap-4 py-4">
                  <span
                    aria-hidden="true"
                    className="ed-serif shrink-0 pt-0.5 text-base italic opacity-40"
                  >
                    {String(index + 1).padStart(2, '0')}.
                  </span>

                  {/* Row-wide overlay link: everything not z-10 clicks through */}
                  <a
                    href={primaryHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-start gap-4 after:absolute after:inset-0"
                  >
                    {app.coverImage && (
                      <img
                        src={app.coverImage}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-14 shrink-0 border border-current/15 object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="ed-serif text-xl italic leading-snug group-hover:text-accent">
                        {app.name}
                      </h3>
                      <p
                        className="mt-0.5 line-clamp-1 text-sm opacity-50"
                        title={app.description}
                      >
                        {app.description}
                      </p>
                    </div>
                  </a>

                  <span className="relative z-10 shrink-0 pt-1 text-right">
                    {meta && (
                      <span className="block text-[11px] uppercase tracking-[0.2em] opacity-50">
                        {meta}
                      </span>
                    )}
                    {hasExtraLinks(app, linkedPost) && (
                      <span className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5 text-[11px] uppercase tracking-[0.2em]">
                        {app.demoUrl && (
                          <a
                            href={app.demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="opacity-50 hover:text-accent hover:opacity-100"
                          >
                            Demo ↗
                          </a>
                        )}
                        {app.githubUrl && (
                          <a
                            href={app.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="opacity-50 hover:text-accent hover:opacity-100"
                          >
                            GitHub ↗
                          </a>
                        )}
                        {linkedPost ? (
                          <Link
                            href={`/blog?post=${linkedPost.id}`}
                            className="opacity-50 hover:text-accent hover:opacity-100"
                            onClick={(event) => {
                              if (onOpenPost) {
                                event.preventDefault();
                                onOpenPost(linkedPost.id);
                              }
                            }}
                          >
                            {app.customLabel ?? 'Read'} →
                          </Link>
                        ) : app.customUrl ? (
                          <a
                            href={app.customUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="opacity-50 hover:text-accent hover:opacity-100"
                          >
                            {app.customLabel || 'Open'} ↗
                          </a>
                        ) : null}
                      </span>
                    )}
                  </span>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
