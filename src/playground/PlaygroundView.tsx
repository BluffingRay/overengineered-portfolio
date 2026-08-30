'use client';

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ThemeSkin } from '@/types/schema';
import { clampViewScale } from '@/types/schema';
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
import { createPlaygroundStore } from './store';

/**
 * The demo playground — the REAL editor, verbatim, over an in-memory copy
 * of the demo doc. Deliberately self-contained (src/playground): it
 * mirrors PortfolioView's editing surface (Ctrl/Cmd+Shift+E, admin tabs,
 * floating writer/reader, skin/scale controls) but shares ZERO state —
 * no localStorage document, no auth, no hosted save, no network. A
 * refresh is the reset. The one persistent delta is the banner.
 */

const DARK_QUERY = '(prefers-color-scheme: dark)';
const SKIN_OVERRIDE_KEY = 'portfolio-skin-override';
const VIEW_SCALE_OVERRIDE_KEY = 'portfolio-view-scale-override';

function subscribeSystemTheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function subscribeDesktopWidth(onChange: () => void) {
  const query = window.matchMedia('(min-width: 768px)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function PlaygroundInner({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  const { data, undo, redo } = usePortfolioData();
  const searchParams = useSearchParams();
  const [isEditMode, setIsEditMode] = useState(
    searchParams.get('edit') === 'true',
  );
  // Hydration-safe mount flip, same contract as PortfolioView's ready gate.
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [overlay, setOverlay] = useState<
    { kind: 'write'; id: string } | { kind: 'read'; id: string } | null
  >(null);
  const [activeTabId, setActiveTabId] = useState<string>(
    () => data.tabs[0]?.id ?? '',
  );

  // Playground-local shortcut preference: read the visitor's real one for
  // familiarity but never persist changes from here (that key is not
  // playground data).
  const [editShortcut, setEditShortcut] = useState<EditShortcut>(() =>
    readStoredShortcut(),
  );

  // Visitor skin/scale picks — identical to the real site's controls
  // (same keys, same auto behavior). Cosmetic overrides, not doc data.
  const [skinOverride, setSkinOverride] = useState<ThemeSkin | 'auto' | null>(
    () => {
      try {
        const stored = window.localStorage.getItem(SKIN_OVERRIDE_KEY);
        return stored === 'hud' ||
          stored === 'notebook' ||
          stored === 'clean' ||
          stored === 'auto'
          ? stored
          : null;
      } catch {
        return null;
      }
    },
  );
  function changeSkinOverride(next: ThemeSkin | 'auto') {
    setSkinOverride(next);
    try {
      window.localStorage.setItem(SKIN_OVERRIDE_KEY, next);
    } catch {
      // Private mode etc. — override just stays ephemeral.
    }
  }
  const [scaleOverride, setScaleOverride] = useState<number | null>(() => {
    try {
      const raw = window.localStorage.getItem(VIEW_SCALE_OVERRIDE_KEY);
      const parsed = raw === null ? NaN : Number(raw);
      return Number.isFinite(parsed) ? clampViewScale(parsed) : null;
    } catch {
      return null;
    }
  });
  function changeScaleOverride(next: number | null) {
    setScaleOverride(next);
    try {
      if (next === null) {
        window.localStorage.removeItem(VIEW_SCALE_OVERRIDE_KEY);
      } else {
        window.localStorage.setItem(VIEW_SCALE_OVERRIDE_KEY, String(next));
      }
    } catch {
      // Private mode etc. — the pick just stays ephemeral.
    }
  }

  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemTheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  const isSkinLocked = data.theme.lockSkin === true;
  const activeSkin: ThemeSkin = isSkinLocked
    ? data.skin
    : skinOverride === 'auto'
      ? systemPrefersDark
        ? 'hud'
        : 'clean'
      : (skinOverride ?? data.skin);

  useEffect(() => {
    document.documentElement.dataset.skin = activeSkin;
  }, [activeSkin]);
  useEffect(() => {
    const root = document.documentElement;
    if (data.theme.accentColor) {
      root.style.setProperty('--accent', data.theme.accentColor);
    } else {
      root.style.removeProperty('--accent');
    }
    if (data.theme.fontFamily) {
      root.style.setProperty('--font', data.theme.fontFamily);
      root.style.setProperty('--font-custom', data.theme.fontFamily);
    } else {
      root.style.removeProperty('--font');
      root.style.removeProperty('--font-custom');
    }
  }, [data.theme.accentColor, data.theme.fontFamily]);

  const officialViewScale =
    typeof data.theme.viewScale === 'number'
      ? clampViewScale(data.theme.viewScale)
      : 1;
  const pickedViewScale = scaleOverride ?? officialViewScale;
  const isDesktopWidth = useSyncExternalStore(
    subscribeDesktopWidth,
    () => window.matchMedia('(min-width: 768px)').matches,
    () => false,
  );
  const effectiveViewScale = isDesktopWidth ? pickedViewScale : 1;
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveViewScale !== 1) {
      root.style.zoom = String(effectiveViewScale);
    } else {
      root.style.removeProperty('zoom');
    }
  }, [effectiveViewScale]);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // ?edit=true sync — same as PortfolioView, but on this route's pathname.
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

  // In the playground the shortcut is ALWAYS allowed (no auth, no gates).
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

      const mod = event.ctrlKey || event.metaKey;

      if (shortcutMatches(event, editShortcut)) {
        event.preventDefault();
        setIsEditMode((mode) => !mode);
        return;
      }

      if (!isEditMode) return;

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
  const activeAdmin = ADMIN_TABS.find((t) => t.id === activeTabId);
  const adminView: (typeof ADMIN_TABS)[number]['id'] | null =
    canEdit && activeAdmin ? activeAdmin.id : null;

  const activeTab = adminView
    ? undefined
    : (tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]);
  const activeIndex = activeTab ? tabs.indexOf(activeTab) : -1;

  const publishedPosts = (data.posts ?? [])
    .filter((post) => post.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));

  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  const [prevActiveIndex, setPrevActiveIndex] = useState(activeIndex);
  if (prevActiveIndex !== activeIndex) {
    setNavDirection(activeIndex > prevActiveIndex ? 1 : -1);
    setPrevActiveIndex(activeIndex);
  }

  if (tabs.length === 0 || (!adminView && !activeTab)) return null;

  function selectAndFocus(index: number) {
    const tab = tabs[index];
    if (!tab) return;
    setActiveTabId(tab.id);
    tabRefs.current[index]?.focus();
  }

  function handleNavigate(href: string): boolean {
    if (!href.trim().startsWith('#')) return false;
    const raw = href.trim().toLowerCase().replace(/^#/, '');
    if (!raw) return false;

    const slug = raw.replace(/^tab-/, '');
    const match = tabs.find((tab) => {
      const id = tab.id.toLowerCase();
      return (
        id === raw ||
        id.replace(/^tab-/, '') === slug ||
        tab.label.toLowerCase().replace(/\s+/g, '-') === slug
      );
    });
    if (!match) return false;

    setActiveTabId(match.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    const last = tabs.length - 1;
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
        next = activeIndex === last ? 0 : activeIndex + 1;
        break;
      case 'ArrowLeft':
        next = activeIndex === 0 ? last : activeIndex - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
    }

    if (next !== null) {
      event.preventDefault();
      selectAndFocus(next);
    }
  }

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="animate-pulse font-mono text-sm opacity-40">
          ~/loading playground…
        </p>
      </main>
    );
  }

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
      {/* The one promise the playground makes — always visible. */}
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
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-current/15">
          <div
            role="tablist"
            aria-label="Portfolio sections"
            onKeyDown={handleKeyDown}
            className="flex gap-1"
          >
            {tabs.map((tab, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={
                    activeTab ? `panel-${activeTab.id}` : undefined
                  }
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
                    isActive
                      ? 'border-accent'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {canEdit && (
            <div className="flex items-center gap-1.5 self-start pt-1.5">
              <span
                aria-hidden="true"
                className="mx-1 h-5 w-px self-center bg-current/15"
              />
              {ADMIN_TABS.map((adminTab) => {
                const isActive = adminView === adminTab.id;

                return (
                  <button
                    key={adminTab.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveTabId(adminTab.id)}
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
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pb-3">
            {canEdit && <UtilityBar />}
            <ViewScaleControl
              value={pickedViewScale}
              official={officialViewScale}
              overridden={scaleOverride !== null}
              onChange={changeScaleOverride}
            />
            {!isSkinLocked ? (
              <SkinSwitcher
                value={skinOverride ?? activeSkin}
                official={data.skin}
                onChange={changeSkinOverride}
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
                className={`rounded-skin border px-2.5 py-1 text-xs font-medium ${
                  editorOpen
                    ? 'border-accent bg-accent text-background'
                    : 'border-[var(--border)] bg-surface opacity-70 hover:opacity-100'
                }`}
              >
                {editorOpen ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
        </div>

        {canEdit && editorOpen && !adminView && activeTab && (
          <EditorPanel activeTabId={activeTab.id} />
        )}

        {adminView ? (
          <div className="settle-in mx-auto w-full max-w-2xl flex-1 pt-8">
            {adminView === 'admin:posts' && (
              <PostAdmin
                onOpenPost={(id) => setOverlay({ kind: 'write', id })}
              />
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
                  onNavigate={handleNavigate}
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
  // A NEW store per mount: navigating away and back gives a pristine
  // demo, same as a refresh. Nothing anywhere persists it.
  const store = useMemo(() => createPlaygroundStore(), []);
  return (
    // Suspense: PlaygroundInner reads useSearchParams (?edit=true sync) —
    // the same prerender contract as PortfolioView. Without this boundary
    // the static build of /playground fails (the exact Vercel error).
    <Suspense fallback={<PlaygroundFallback />}>
      <PortfolioStoreProvider store={store}>
        <PlaygroundInner backHref={backHref} backLabel={backLabel} />
      </PortfolioStoreProvider>
    </Suspense>
  );
}
