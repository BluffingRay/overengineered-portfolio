'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PortfolioStoreProvider,
  usePortfolioData,
} from '@/hooks/usePortfolioData';
import { createPlaygroundStore } from './store';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import EditorPanel from '@/components/editor/EditorPanel';

/**
 * The demo playground — the real editor over the real demo doc, in
 * memory only. Deliberately self-contained (src/playground): it shares
 * COMPONENTS with the products but zero STATE — no localStorage, no
 * auth, no hosted save, no network. A refresh is the reset. Both
 * products render it identically at /playground with zero configuration.
 */

function PlaygroundInner({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  const { data, reset, undo, redo, canUndo, canRedo } = usePortfolioData();
  const [isEditMode, setIsEditMode] = useState(true);
  const [activeTabId, setActiveTabId] = useState<string>(
    () => data.tabs[0]?.id ?? '',
  );

  const activeTab =
    data.tabs.find((tab) => tab.id === activeTabId) ?? data.tabs[0];

  const publishedPosts = useMemo(
    () => (data.posts ?? []).filter((post) => post.status === 'published'),
    [data.posts],
  );

  const btn =
    'rounded-skin border border-[var(--border)] bg-surface px-2.5 py-1 text-xs font-medium disabled:opacity-40';

  return (
    <div
      data-skin={data.skin}
      style={
        {
          '--accent': data.theme.accentColor,
          ...(data.theme.fontFamily ? { '--font': data.theme.fontFamily } : {}),
          minHeight: '100dvh',
        } as React.CSSProperties
      }
      className="bg-background text-foreground"
    >
      {/* The one promise the playground makes — always visible. */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-b border-current/15 bg-background/95 px-4 py-2 text-xs backdrop-blur">
        <span className="font-medium opacity-80">
          Playground — nothing you do here is saved. Refresh or Reset
          restores the demo.
        </span>
        <span className="flex items-center gap-1.5">
          <button type="button" className={btn} onClick={undo} disabled={!canUndo} aria-label="Undo">↩</button>
          <button type="button" className={btn} onClick={redo} disabled={!canRedo} aria-label="Redo">↪</button>
          <button
            type="button"
            className={btn}
            onClick={() => {
              if (window.confirm('Reset the playground to the pristine demo? Your changes here are discarded (they were never saved anywhere).')) reset();
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="rounded-skin border border-accent bg-accent px-2.5 py-1 text-xs font-medium text-background"
            onClick={() => setIsEditMode((open) => !open)}
            aria-expanded={isEditMode}
          >
            {isEditMode ? 'Hide editor' : 'Edit'}
          </button>
          <Link href={backHref} className="opacity-60 hover:opacity-100">
            {backLabel}
          </Link>
        </span>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
        {/* Tab nav — same idea as the real site's, one component less. */}
        <nav aria-label="Portfolio sections" className="mb-2 flex flex-wrap gap-1">
          {data.tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-selected={activeTab?.id === tab.id}
              role="tab"
              onClick={() => setActiveTabId(tab.id)}
              className={`whitespace-nowrap rounded-skin border px-3 py-1.5 text-sm font-medium ${
                activeTab?.id === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {isEditMode && activeTab && (
          <div className="mb-6">
            <EditorPanel activeTabId={activeTab.id} />
          </div>
        )}

        <div role="tabpanel" className="space-y-2">
          {(activeTab?.blocks ?? []).map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              socials={data.socials}
              cards={data.cards}
              posts={publishedPosts}
              showMediaPlaceholders
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundView({
  backHref = '/',
  backLabel = '← Back',
}: {
  backHref?: string;
  backLabel?: string;
}) {
  // A NEW store per mount: navigating away and back gives a pristine
  // demo, same as a refresh. Nothing anywhere persists it.
  const store = useMemo(() => createPlaygroundStore(), []);
  return (
    <PortfolioStoreProvider store={store}>
      <PlaygroundInner backHref={backHref} backLabel={backLabel} />
    </PortfolioStoreProvider>
  );
}
