'use client';

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import SkinSwitcher from '@/components/SkinSwitcher';
import ViewScaleControl from '@/components/ViewScaleControl';
import UtilityBar from '@/components/UtilityBar';
import PostAdmin from '@/components/editor/PostAdmin';
import FloatingPage from '@/components/FloatingPage';
import WriteView from '@/components/write/WriteView';
import BlogSite from '@/components/blog/BlogSite';
import GlobalSettings from '@/components/editor/GlobalSettings';
import SiteFooter from '@/components/ui/SiteFooter';
import EditorPanel from '@/components/editor/EditorPanel';
import {
  readStoredShortcut,
  shortcutMatches,
  type EditShortcut,
} from '@/lib/editShortcut';
import {
  PortfolioStoreProvider,
  usePortfolioData,
} from '@/hooks/usePortfolioData';
import { usePortfolioShell } from '@/hooks/usePortfolioShell';
import PortfolioChrome from '@/components/PortfolioChrome';
import { createPlaygroundStore } from './store';
import { useIsDesktopWidth } from '@/hooks/useIsDesktopWidth';

function PlaygroundInner({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  const { data, undo, redo } = usePortfolioData();
  const searchParams = useSearchParams();
  const [isEditMode, setIsEditMode] = useState(
    searchParams.get('edit') === 'true',
  );
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [overlay, setOverlay] = useState<
    { kind: 'write'; id: string } | { kind: 'read'; id: string } | null
  >(null);

  const shell = usePortfolioShell({
    tabs: data.tabs,
    docSkin: data.skin,
    docTheme: data.theme,
    initialActiveTabId: data.tabs[0]?.id ?? '',
    adminTabIds: ['admin:posts', 'admin:site'],
    posts: data.posts,
  });

  const [editShortcut, setEditShortcut] = useState<EditShortcut>(() =>
    readStoredShortcut(),
  );

  const isDesktop = useIsDesktopWidth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (isEditMode) params.set('edit', 'true');
    else params.delete('edit');

    const queryString = params.toString();
    window.history.replaceState(
      null,
      '',
      queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname,
    );
  }, [isEditMode]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (shortcutMatches(event, editShortcut)) {
        event.preventDefault();
        setIsEditMode((mode) => !mode);
        return;
      }

      if (!isEditMode) return;

      const mod = event.ctrlKey || event.metaKey;

      if (mod && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      } else if (
        mod &&
        ((event.shiftKey && event.key.toLowerCase() === 'z') ||
          event.key.toLowerCase() === 'y')
      ) {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditMode, undo, redo, editShortcut]);

  const tabs = data.tabs;
  const canEdit = isEditMode;

  const ADMIN_TABS = [
    { id: 'admin:posts', label: 'Posts' },
    { id: 'admin:site', label: 'Site' },
  ] as const;
  const activeAdmin = ADMIN_TABS.find((t) => t.id === shell.activeId);
  const adminView: (typeof ADMIN_TABS)[number]['id'] | null =
    canEdit && activeAdmin ? activeAdmin.id : null;

  const activeTab = adminView ? undefined : shell.activeTab;
  const activeIndex = adminView ? -1 : shell.activeIndex;
  const navDirection = shell.navDirection;

  const publishedPosts = shell.publishedPosts;

  if (tabs.length === 0 || (!adminView && !activeTab)) return null;

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="animate-pulse font-mono text-sm opacity-40">
          ~/loading playground…
        </p>
      </main>
    );
  }

  const adminRow = canEdit ? (
    <div className="flex items-center gap-1.5 self-start pt-1.5">
      <span aria-hidden="true" className="mx-1 h-5 w-px self-center bg-current/15" />
      {ADMIN_TABS.map((adminTab) => {
        const isActive = adminView === adminTab.id;
        return (
          <button
            key={adminTab.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => shell.setActiveId(adminTab.id)}
            title={`Edit mode only — ${adminTab.id.replace('admin:', '')} settings`}
            className={`whitespace-nowrap rounded-skin border px-2.5 py-1 text-xs font-medium ${
              isActive
                ? 'border-accent bg-accent text-background'
                : 'border-[var(--border)] bg-surface opacity-70 hover:opacity-100'
            }`}
          >
            {adminTab.label}
          </button>
        );
      })}
    </div>
  ) : undefined;

  const controls = (
    <>
      {canEdit && <UtilityBar />}
      <ViewScaleControl
        value={shell.appliedScale}
        official={shell.officialViewScale}
        overridden={shell.scalePick !== null}
        onChange={(v) => shell.setScale(v)}
      />
      {!shell.isSkinLocked ? (
        <SkinSwitcher
          value={shell.skinPick ?? shell.appliedSkin}
          official={data.skin}
          onChange={shell.setSkin}
        />
      ) : (
        <span
          className="inline-flex items-center gap-1.5 rounded-skin border border-[var(--border)] bg-surface px-2.5 py-1 text-xs opacity-50"
          title="Theme locked by site owner"
        >
          {data.skin.toUpperCase()} locked
        </span>
      )}
      {canEdit && (
        <button
          type="button"
          aria-expanded={editorOpen}
          onClick={() => setEditorOpen((open) => !open)}
          className={`rounded-skin border px-2.5 py-1 text-xs font-medium transition-colors ${
            editorOpen
              ? 'border-accent bg-accent text-background'
              : 'border-accent/50 bg-accent/5 text-accent opacity-90 hover:opacity-100'
          }`}
        >
          {editorOpen ? 'Done' : 'Edit'}
        </button>
      )}
    </>
  );

  return (
    <main
      style={
        {
          ...(data.theme.accentColor
            ? { '--accent': data.theme.accentColor }
            : {}),
          ...(data.theme.fontFamily ? { '--font': data.theme.fontFamily } : {}),
        } as React.CSSProperties
      }
      className="flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground"
    >
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 border-b border-current/15 bg-background/95 px-4 py-2 text-xs backdrop-blur">
        <span className="font-medium opacity-80">
          Playground — nothing you do here is saved. A refresh (or Reset)
          restores the pristine demo.
        </span>
        <a href={backHref} className="font-medium opacity-60 hover:opacity-100">
          {backLabel}
        </a>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-6 pb-16">
        <PortfolioChrome
          tabs={tabs}
          activeIndex={activeIndex}
          onTabChange={shell.setActiveId}
          onKeyDown={shell.handleKeyDownForTabs}
          scrollable={shell}
          isDesktop={isDesktop}
          adminRow={adminRow}
          controls={controls}
        />

        {canEdit && editorOpen && !adminView && activeTab && (
          <EditorPanel activeTabId={activeTab.id} />
        )}

        {adminView ? (
          <div className="settle-in mx-auto w-full max-w-2xl flex-1 pt-8">
            {adminView === 'admin:posts' && (
              <PostAdmin onOpenPost={(id) => setOverlay({ kind: 'write', id })} />
            )}
            {adminView === 'admin:site' && (
              <GlobalSettings
                editShortcut={editShortcut}
                onEditShortcutChange={setEditShortcut}
              />
            )}
          </div>
        ) : (
          activeTab && (
            <div
              key={activeTab.id}
              role="tabpanel"
              id={`panel-${activeTab.id}`}
              aria-labelledby={`tab-${activeTab.id}`}
              className={`flex-1 ${
                navDirection === 1 ? 'tab-enter-right' : 'tab-enter-left'
              }`}
            >
              {activeTab.blocks.map((block) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  socials={data.socials}
                  cards={data.cards}
                  posts={publishedPosts}
                  onNavigate={shell.handleNavigate}
                  onOpenPost={(id) => setOverlay({ kind: 'read', id })}
                  showMediaPlaceholders={canEdit}
                />
              ))}
            </div>
          )
        )}

        <SiteFooter footer={data.footer} socials={data.socials} />
      </div>

      {overlay && (
        <FloatingPage onClose={() => setOverlay(null)}>
          {overlay.kind === 'write' ? (
            <WriteView postId={overlay.id} onClose={() => setOverlay(null)} />
          ) : (
            <BlogSite
              postId={overlay.id}
              posts={publishedPosts}
              onClose={() => setOverlay(null)}
            />
          )}
        </FloatingPage>
      )}
    </main>
  );
}

function PlaygroundFallback() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background text-foreground">
      <p className="animate-pulse font-mono text-sm opacity-40">
        ~/loading playground…
      </p>
    </main>
  );
}

export default function PlaygroundView({
  backHref = '/',
  backLabel = '← Back to the site',
}: {
  backHref?: string;
  backLabel?: string;
}) {
  const store = useMemo(() => createPlaygroundStore(), []);
  return (
    <Suspense fallback={<PlaygroundFallback />}>
      <PortfolioStoreProvider store={store}>
        <PlaygroundInner backHref={backHref} backLabel={backLabel} />
      </PortfolioStoreProvider>
    </Suspense>
  );
}
