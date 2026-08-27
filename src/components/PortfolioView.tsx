'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import type { ThemeSkin } from '@/types/schema';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import SkinSwitcher from '@/components/SkinSwitcher';

const DARK_QUERY = '(prefers-color-scheme: dark)';
// Visitor skin pick — persisted separately from the document so it
// survives navigation to the standalone /write and /blog routes.
const SKIN_OVERRIDE_KEY = 'portfolio-skin-override';
// Last-viewed tab — restored when visitors return from a standalone
// route, so Back lands them where they left off (per browser session).
const LAST_TAB_KEY = 'portfolio-last-tab';

function subscribeSystemTheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
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
  writeStoredShortcut,
  shortcutMatches,
  type EditShortcut,
} from '@/lib/editShortcut';
import { useAuth } from '@/hooks/useAuth';
import LoginCard from '@/components/auth/LoginCard';

export default function PortfolioView() {
  const { data, undo, redo } = usePortfolioData();
  const searchParams = useSearchParams();
  const [isEditMode, setIsEditMode] = useState(
    searchParams.get('edit') === 'true',
  );
  // Phase 4b — auth gate. `enabled` is whether an ADMIN_PASSWORD is
  // configured; when it isn't, the gate is off and edit mode works as
  // before. `authenticated` seeds from the stored session on hydration.
  const auth = useAuth();
  const gated = auth.enabled;
  const isAuthed = !gated || auth.authenticated;
  // Edit UI only when edit was requested AND we're allowed. `showLogin`
  // intercepts the request: edit was requested but the gate isn't satisfied.
  const canEdit = isEditMode && isAuthed;
  const showLogin = isEditMode && gated && !auth.authenticated;

  function handleLogout() {
    auth.logout();
    // Drop back to visitor mode (also strips ?edit=true via the URL effect).
    setIsEditMode(false);
  }
  // Edit-mode toggle shortcut — a preference, NOT document data. Lives in
  // its own localStorage key (like the skin override). It's a dependency of
  // the keydown effect below, so that listener re-subscribes only when it
  // changes (rare) and always reads the current value.
  const [editShortcut, setEditShortcut] = useState<EditShortcut>(() =>
    readStoredShortcut(),
  );
  function changeEditShortcut(next: EditShortcut) {
    setEditShortcut(next);
    writeStoredShortcut(next);
  }
  // Floating pages — /write and /blog cover the site in-place instead
  // of navigating, so closing unmasks the exact view underneath.
  const [overlay, setOverlay] = useState<
    { kind: 'write' | 'read'; id: string } | null
  >(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem(LAST_TAB_KEY);
    } catch {
      return null;
    }
  });
  const [editorOpen, setEditorOpen] = useState(false);
  // Render gate: hold everything back (splash only) until the client
  // store is live, so visitors never see the SSR default document flash
  // before their persisted one. Images are the exception — they stream.
  // useSyncExternalStore gives a hydration-safe flip without an effect.
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // Visitor skin preference — persisted under its own key (never in the
  // document, never in undo history). The layout's pre-paint script reads
  // the same key so every route wears the pick from the first frame.
  // The document's `skin` remains the admin's official default.
  const [skinOverride, setSkinOverride] = useState<
    ThemeSkin | 'auto' | null
  >(() => {
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
  });

  function changeSkinOverride(next: ThemeSkin | 'auto') {
    setSkinOverride(next);
    try {
      window.localStorage.setItem(SKIN_OVERRIDE_KEY, next);
    } catch {
      // Private mode etc. — override just stays ephemeral.
    }
  }

  // 'auto' maps the visitor's OS preference onto the skin trio:
  // dark → HUD (terminal night), light → Clean. Notebook stays a manual
  // pick (it's a read-mode flavor, not a light/dark state).
  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemTheme,
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
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

  // Mirror the resolved pick onto <html>, not just this page's <main>:
  // the standalone /write and /blog routes hang off the html attribute
  // alone, so a stale default there would greet visitors who navigate.
  useEffect(() => {
    document.documentElement.dataset.skin = activeSkin;
  }, [activeSkin]);

  // Same mirror for the admin-owned accent/font: html carries the
  // pre-paint copies that standalone routes inherit — keep them live
  // with document edits instead of waiting for a full reload.
  // --font-custom is the heavy override that all designs respect;
  // --font keeps the body in sync for backwards compat.
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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Remember the visitor's place so returning from /write or /blog
  // restores the tab they left (writing an external system — allowed).
  // Remember the visitor's/admin's place so returning from /write or
  // /blog restores the view they left — INCLUDING admin tabs (finish
  // writing → Done → land back in Posts). Visitor mode simply ignores
  // stored admin ids via the regular fallback resolution.
  useEffect(() => {
    if (!activeTabId) return;
    try {
      window.sessionStorage.setItem(LAST_TAB_KEY, activeTabId);
    } catch {
      // Session storage unavailable — memory just stays per-mount.
    }
  }, [activeTabId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (isEditMode) params.set('edit', 'true');
    else params.delete('edit');

    const queryString = params.toString();
    window.history.replaceState(
      null,
      '',
      queryString ? `/?${queryString}` : window.location.pathname,
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

      const mod = event.ctrlKey || event.metaKey;

      if (shortcutMatches(event, editShortcut)) {
        event.preventDefault();
        setIsEditMode((mode) => !mode);
        return;
      }

      if (!canEdit) return;

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
  }, [isEditMode, canEdit, undo, redo, editShortcut]);

  const tabs = data.tabs;

  // Hidden admin "tabs" — revealed by edit mode, never stored in the
  // document, never URL-synced. They render management surfaces
  // (posts / site settings) full-width in the tabpanel region.
  const ADMIN_TABS = [
    { id: 'admin:posts', label: 'Posts' },
    { id: 'admin:site', label: 'Site' },
  ] as const;
  type AdminTabId = (typeof ADMIN_TABS)[number]['id'];
  const activeAdmin = ADMIN_TABS.find((t) => t.id === activeTabId);
  const adminView: AdminTabId | null =
    canEdit && activeAdmin ? activeAdmin.id : null;

  const activeTab = adminView
    ? undefined
    : (tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]);
  // -1 while an admin view owns the panel — no regular tab highlighted.
  const activeIndex = activeTab ? tabs.indexOf(activeTab) : -1;

  // Visitors read published posts, newest first.
  const publishedPosts = (data.posts ?? [])
    .filter((post) => post.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));

  // Render-phase direction tracking (no effect): remember whether
  // navigation moved right or left so the panel enters from that side.
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

  // Hero CTAs (and any future in-page links) resolve against tabs.
  // Only `#`-prefixed values are tab candidates — `#tab-projects`,
  // bare ids (`#projects`) and label slugs (`#hero-lab`) all match.
  // Real URLs / paths / empty hashes pass through untouched.
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
          ~/loading portfolio…
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
          ...(data.theme.fontFamily
            ? { '--font': data.theme.fontFamily }
            : {}),
        } as React.CSSProperties
      }
      className="flex min-h-dvh flex-col overflow-x-clip"
    >
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
            {canEdit && (
              <button
                type="button"
                onClick={handleLogout}
                title="End this session and return to visitor mode"
                className="rounded-skin border border-[var(--border)] bg-surface px-2.5 py-1 text-xs font-medium opacity-70 hover:opacity-100"
              >
                Log out
              </button>
            )}
          </div>
        </div>

        {canEdit && editorOpen && !adminView && activeTab && (
          <EditorPanel activeTabId={activeTab.id} />
        )}

        {showLogin ? (
          <div className="flex-1">
            <LoginCard onLogin={auth.login} />
          </div>
        ) : adminView ? (
          <div className="settle-in mx-auto w-full max-w-2xl flex-1 pt-8">
            {adminView === 'admin:posts' && (
              <PostAdmin
                onOpenPost={(id) => setOverlay({ kind: 'write', id })}
              />
            )}
            {adminView === 'admin:site' && (
              <GlobalSettings
                editShortcut={editShortcut}
                onEditShortcutChange={changeEditShortcut}
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
            <BlogSite postId={overlay.id} onClose={() => setOverlay(null)} />
          )}
        </FloatingPage>
      )}
    </main>
  );
}
