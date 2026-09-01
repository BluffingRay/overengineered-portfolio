import Link from 'next/link';
import ProjectIcon from '@/components/ui/ProjectIcon';
import Reveal from '../../Reveal';
import { resolveCardLinks } from './shared';
import GridShell from './GridShell';
import ExpandableDescription from './ExpandableDescription';
import type { GridDesignProps } from '../types';

/**
 * Coder grid — the original rendering: uniform cover bands, quiet
 * borders, overlay-linked titles. The baseline the other designs
 * riff against.
 */
export default function CoderGrid({
  block,
  cards,
  posts,
  onOpenPost,
}: GridDesignProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">{block.title}</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
                <GridShell cards={cards} cardIds={block.apps} renderCard={(app, index) => {
          const { primaryHref, linkedPost } = resolveCardLinks(app, posts);
          return (
              <article className="lift relative flex h-full flex-col overflow-hidden rounded-skin border border-current/15 hover:border-current/40">
                {/* Uniform media slot: every card shares the same cover band,
                    image or not — rows stop stretching to the tallest sibling. */}
                <div className="relative aspect-video w-full overflow-hidden bg-current/[0.04]">
                  {app.coverImage ? (
                    <img
                      src={app.coverImage}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex select-none items-center justify-center text-7xl font-semibold opacity-[0.07]"
                    >
                      {app.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <ProjectIcon icon={app.icon} appName={app.name} />
                    {app.category && (
                      <span className="rounded-full border border-current/20 px-2.5 py-0.5 text-xs opacity-60">
                        {app.category}
                      </span>
                    )}
                  </div>

                  {app.tags && app.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {app.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-current/10 px-2 py-0.5 text-[10px] opacity-80"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 className="mt-4 font-medium">
                    <a
                      href={primaryHref}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent after:absolute after:inset-0 after:rounded-skin"
                    >
                      {app.name}
                    </a>
                  </h3>
                  <ExpandableDescription
                    text={app.description}
                    collapsedClass="line-clamp-3"
                    textClass="mt-1 text-sm opacity-60"
                  />

                  {(app.demoUrl || app.githubUrl || linkedPost || app.customUrl) && (
                    <div className="relative z-10 mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-sm">
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
        }} />
      </div>
    </section>
  );
}
