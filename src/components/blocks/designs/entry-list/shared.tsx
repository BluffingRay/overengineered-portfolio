import type { EntryListBlock } from '@/types/schema';

/* The one entry-list skeleton, per the marquee pattern: semantic
   section + heading + <ol> lives here; the four designs are thin skins
   that only pass per-part classes. Optional entry fields render only
   when present; a link turns the title into a hard-target external
   anchor. Server-safe: no hooks, no client APIs, nothing animates. */

export interface EntryListPartClasses {
  section?: string;
  heading?: string;
  list?: string;
  item?: string;
  metaLine?: string;
  title?: string;
  /** The anchor when the entry has a link; plain text otherwise. */
  link?: string;
  subtitle?: string;
  description?: string;
}

export interface EntryListSkeletonProps {
  block: EntryListBlock;
  classes: EntryListPartClasses;
  /** Riso only: leads each meta line with the entry's display number. */
  number?: {
    className?: string;
    format: (index: number) => string;
  };
}

export function EntryListSkeleton({ block, classes, number }: EntryListSkeletonProps) {
  if (block.entries.length === 0) return null;

  // Multi-column: a responsive card grid — grid items stretch, so every
  // card in a row is uniform regardless of missing/extra content
  // (2 → two-up, 3 → two-up then three-up, matching the app grid);
  // one column: the design's own stack, but each card gets the same
  // fixed height (user-locked: uniform look in every mode; globally
  // row-based stretching across grids is a future plan).
  const listClass =
    block.columns === 2
      ? `${classes.list} grid gap-3 sm:grid-cols-2`
      : block.columns === 3
        ? `${classes.list} grid gap-3 sm:grid-cols-2 lg:grid-cols-3`
        : `${classes.list} space-y-3 [&_>li]:h-40 [&_>li]:overflow-y-auto`;

  return (
    <section className={classes.section}>
      {block.title && <h2 className={classes.heading}>{block.title}</h2>}
      <ol className={listClass}>
        {block.entries.map((entry, index) => {
          const num = number?.format(index);

          return (
            <li key={entry.id} className={classes.item}>
              {(num !== undefined || entry.meta) && (
                <p className={classes.metaLine}>
                  {num !== undefined && (
                    <span aria-hidden="true" className={number?.className}>
                      {num}
                    </span>
                  )}
                  {entry.meta}
                </p>
              )}
              <h3 className={classes.title}>
                {entry.link ? (
                  <a
                    href={entry.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={classes.link}
                  >
                    {entry.title || 'Untitled'}
                  </a>
                ) : (
                  entry.title || 'Untitled'
                )}
              </h3>
              {entry.subtitle && <p className={classes.subtitle}>{entry.subtitle}</p>}
              {entry.description && (
                <p className={classes.description}>{entry.description}</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
