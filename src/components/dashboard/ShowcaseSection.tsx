'use client';

import Link from 'next/link';

const CARD = 'rounded-skin border border-[var(--border)] bg-surface p-5';
const ACTION_BTN =
  'rounded-skin border border-[var(--border)] bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-background disabled:pointer-events-none disabled:opacity-40';

interface ShowcaseCard {
  slug: string;
  title: string | null;
}

export default function ShowcaseSection(props: {
  items: ShowcaseCard[] | null;
  error: string | null;
  emptyCopy: string;
  heading?: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-wide opacity-50">
        {props.heading ?? 'Other portfolios'}
      </h2>
      {props.error ? (
        <p role="alert" className={`mt-3 text-sm text-red-500 ${CARD}`}>
          {props.error}
        </p>
      ) : props.items === null ? (
        <div className={`mt-3 ${CARD}`}>
          <p className="text-sm opacity-50">Loading…</p>
        </div>
      ) : props.items.length === 0 ? (
        <div className={`mt-3 ${CARD}`}>
          <p className="text-sm opacity-60">{props.emptyCopy}</p>
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {props.items.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/u/${item.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-skin border border-[var(--border)] bg-surface p-4 hover:-translate-y-0.5 hover:border-accent hover:shadow-sm"
              >
                <span className="block text-sm font-medium">
                  {item.title ?? item.slug}
                </span>
                <span className="mt-0.5 block font-mono text-xs opacity-50">
                  /u/{item.slug}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {props.hasMore && props.items !== null && (
        <button
          type="button"
          disabled={props.loadingMore}
          onClick={props.onLoadMore}
          className={`mt-3 ${ACTION_BTN}`}
        >
          {props.loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </section>
  );
}
