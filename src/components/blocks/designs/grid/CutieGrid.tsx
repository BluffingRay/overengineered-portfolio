import Link from 'next/link';
import ProjectIcon from '@/components/ui/ProjectIcon';
import Reveal from '../../Reveal';
import { hasExtraLinks, resolveCardLinks } from './shared';
import { postHref } from '../blog/shared';
import GridShell from './GridShell';
import ExpandableDescription from './ExpandableDescription';
import type { GridDesignProps } from '../types';

/**
 * Cutie grid — every project taped to the wall as a polaroid: white
 * surface frames with thick bottoms, washi tape, a gentle tilt that
 * straightens when you look at it. Candy-pill tags and ♡/✿ links
 * finish the sticker album.
 */
export default function CutieGrid({
  block,
  cards,
  posts,
  onOpenPost,
  slug,
}: GridDesignProps) {
  return (
    <section className="dsn-cutie relative space-y-8">
      {/* Wall garnish — pure decoration */}
      <span
        aria-hidden="true"
        className="cutie-float absolute -left-1 -top-5 select-none text-2xl opacity-60"
      >
        ✿
      </span>
      <span
        aria-hidden="true"
        className="cutie-float-slow absolute -right-2 top-28 select-none text-xl opacity-60"
      >
        ♡
      </span>

      <h2 className="text-center text-2xl font-extrabold tracking-tight">
        {block.title}
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
                <GridShell cards={cards} cardIds={block.apps} renderCard={(app, index) => {
          const { primaryHref, linkedPost } = resolveCardLinks(app, posts);
          return (
              <article
                className={`relative flex h-full flex-col bg-surface p-3 pb-10 shadow-md shadow-accent/10 transition-transform ${
                  index % 2 ? 'rotate-1' : '-rotate-1'
                } hover:rotate-0`}
              >
                {/* Washi tape holding the print to the wall */}
                <span
                  aria-hidden="true"
                  className={`absolute -top-2.5 left-1/2 z-10 h-5 w-20 -translate-x-1/2 border-x border-accent/20 bg-accent/25 backdrop-blur-[1px] ${
                    index % 2 ? 'rotate-2' : '-rotate-3'
                  }`}
                />

                {/* The print itself: square, softly rounded corners */}
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-current/[0.05]">
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
                      className="cutie-blob absolute inset-2 flex select-none items-center justify-center bg-accent/10 text-5xl font-bold text-accent/50"
                    >
                      {app.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col px-1 pt-3">
                  <div className="flex items-center gap-2">
                    <ProjectIcon icon={app.icon} appName={app.name} />
                    {app.category && (
                      <span className="ml-auto rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold text-accent">
                        {app.category}
                      </span>
                    )}
                  </div>

                  {app.tags && app.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {app.tags.map((tag, tagIndex) => (
                        <span
                          key={tag}
                          className={`rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent ${
                            tagIndex % 2 ? 'rotate-[1.5deg]' : '-rotate-[1.5deg]'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 className="mt-3 font-extrabold">
                    <a
                      href={primaryHref}
                      target="_blank"
                      rel="noreferrer"
                      className="after:absolute after:inset-0"
                    >
                      {app.name}
                    </a>
                  </h3>
                  <ExpandableDescription
                    text={app.description}
                    collapsedClass="line-clamp-3"
                    textClass="mt-1 text-sm opacity-60"
                  />

                  {hasExtraLinks(app, linkedPost) && (
                    <div className="relative z-10 mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-sm font-semibold">
                      {app.demoUrl && (
                        <a
                          href={app.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="cutie-btn text-accent"
                        >
                          Demo ♡
                        </a>
                      )}
                      {app.githubUrl && (
                        <a
                          href={app.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="cutie-btn text-accent"
                        >
                          GitHub ✿
                        </a>
                      )}
                      {linkedPost ? (
                        <Link
                          href={postHref(linkedPost.id, slug)}
                          className="cutie-btn text-accent"
                          onClick={(event) => {
                            if (onOpenPost) {
                              event.preventDefault();
                              onOpenPost(linkedPost.id);
                            }
                          }}
                        >
                          {app.customLabel ?? 'Read'} ♡
                        </Link>
                      ) : app.customUrl ? (
                        <a
                          href={app.customUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="cutie-btn text-accent"
                        >
                          {app.customLabel || 'Open'} ✿
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
