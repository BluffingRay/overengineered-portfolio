import {
  CardCoverImage,
  CardExtraLinks,
  CardTitleLink,
  resolveCardLinks,
} from './shared';
import GridShell from './GridShell';
import ExpandableDescription from './ExpandableDescription';
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
  slug,
}: GridDesignProps) {
  return (
    <section className="dsn-editorial space-y-5">
      <h2 className="ed-serif border-t-2 border-current pt-4 text-3xl tracking-tight">
        {block.title}
      </h2>
      <ul className="divide-y divide-current/10">
        <GridShell
          cards={cards}
          cardIds={block.apps}
          renderCard={(app, index) => {
            const { primaryHref, linkedPost } = resolveCardLinks(app, posts);
            const meta =
              app.category ?? (app.tags && app.tags.length > 0 ? app.tags.join(' · ') : undefined);
            return (
              <li key={app.id} className="relative">
                <div className="group flex items-start gap-4 py-4">
                  <span
                    aria-hidden="true"
                    className="ed-serif shrink-0 pt-0.5 text-base italic opacity-40"
                  >
                    {String(index + 1).padStart(2, '0')}.
                  </span>

                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    {app.coverImage && (
                      <CardCoverImage
                        src={app.coverImage}
                        className="h-14 w-14 shrink-0 border border-current/15 object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitleLink href={primaryHref} className="after:absolute after:inset-0">
                        <h3 className="ed-serif text-xl italic leading-snug group-hover:text-accent">
                          {app.name}
                        </h3>
                      </CardTitleLink>
                      <ExpandableDescription
                        text={app.description}
                        collapsedClass="line-clamp-1"
                        textClass="mt-0.5 text-sm opacity-50"
                        threshold={50}
                      />
                    </div>
                  </div>

                  <div className="relative z-10 shrink-0 pt-1 text-right">
                    {meta && (
                      <span className="block text-[11px] uppercase tracking-[0.2em] opacity-50">
                        {meta}
                      </span>
                    )}
                    <CardExtraLinks
                      app={app}
                      linkedPost={linkedPost}
                      slug={slug}
                      onOpenPost={onOpenPost}
                      className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5 text-[11px] uppercase tracking-[0.2em]"
                      linkClassName="opacity-50 hover:text-accent hover:opacity-100"
                    />
                  </div>
                </div>
              </li>
            );
          }}
        />
      </ul>
    </section>
  );
}
