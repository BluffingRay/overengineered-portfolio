import Link from 'next/link';
import ProjectIcon from '@/components/ui/ProjectIcon';
import { hasExtraLinks, resolveCardLinks } from './shared';
import GridShell from './GridShell';
import type { GridDesignProps } from '../types';

/**
 * Riso grid — zine clippings pinned to the page: hard ink borders,
 * offset shadows that physically depress on press, duotone plates with
 * FIG. stamps, bracketed mono tags. Everything rides --accent so the
 * misregistered ink stays on-brand in every skin.
 */
export default function RisoGrid({
  block,
  cards,
  posts,
  onOpenPost,
}: GridDesignProps) {
  return (
    <section className="dsn-riso space-y-6">
      <h2 className="riso-misprint text-2xl font-black uppercase tracking-tight">
        {block.title}
      </h2>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <GridShell
          cards={cards}
          cardIds={block.apps}
          renderCard={(app, index) => {
            const { primaryHref, linkedPost } = resolveCardLinks(app, posts);
            return (
              <article className="relative flex h-full flex-col border-2 border-current bg-background shadow-[4px_4px_0_0_currentColor] transition-[translate,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_currentColor] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none">
                <figure className="border-b-2 border-current">
                  <div className="relative aspect-video overflow-hidden">
                    {app.coverImage ? (
                      <img
                        src={app.coverImage}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="riso-duotone h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-full w-full select-none items-center justify-center bg-current/[0.06] text-7xl font-black uppercase opacity-10"
                      >
                        {app.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {/* Accent pass printed over the plate */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-accent opacity-40 mix-blend-color"
                    />
                  </div>
                  <figcaption className="flex items-center justify-between gap-2 bg-accent px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-background">
                    <span>Fig. {String(index + 1).padStart(2, '0')}</span>
                    {app.category && (
                      <span className="truncate">{app.category}</span>
                    )}
                  </figcaption>
                </figure>

                <div className="flex flex-1 flex-col p-4">
                  <ProjectIcon icon={app.icon} appName={app.name} />

                  {app.tags && app.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[10px] uppercase opacity-70">
                      {app.tags.map((tag) => (
                        <span key={tag}>[{tag}]</span>
                      ))}
                    </div>
                  )}

                  <h3 className="riso-misprint mt-3 font-black uppercase leading-tight">
                    <a
                      href={primaryHref}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-accent after:absolute after:inset-0"
                    >
                      {app.name}
                    </a>
                  </h3>
                  <p
                    className="mt-1.5 line-clamp-3 font-mono text-xs leading-relaxed opacity-70"
                    title={app.description}
                  >
                    {app.description}
                  </p>

                  {hasExtraLinks(app, linkedPost) && (
                    <div className="relative z-10 mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 font-mono text-xs font-bold uppercase">
                      {app.demoUrl && (
                        <a
                          href={app.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-4 hover:text-accent hover:underline"
                        >
                          Demo ↗
                        </a>
                      )}
                      {app.githubUrl && (
                        <a
                          href={app.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-4 hover:text-accent hover:underline"
                        >
                          GitHub ↗
                        </a>
                      )}
                      {linkedPost ? (
                        <Link
                          href={`/blog?post=${linkedPost.id}`}
                          className="underline-offset-4 hover:text-accent hover:underline"
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
                          className="underline-offset-4 hover:text-accent hover:underline"
                        >
                          {app.customLabel || 'Open'} ↗
                        </a>
                      ) : null}
                    </div>
                  )}
                </div>
              </article>
            );
          }}
        />
      </div>
    </section>
  );
}
