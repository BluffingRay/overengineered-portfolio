'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { usePortfolioShell } from '@/hooks/usePortfolioShell';
import PortfolioChrome from '@/components/PortfolioChrome';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import SkinSwitcher from '@/components/SkinSwitcher';
import ViewScaleControl from '@/components/ViewScaleControl';
import { useIsDesktopWidth } from '@/hooks/useIsDesktopWidth';

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
import { isDirty, setIntentionalNav } from '@/lib/hostedDoc';
import LoginCard from '@/components/auth/LoginCard';
import FirebaseLoginCard from '@/components/auth/FirebaseLoginCard';

export default function PortfolioView() {
  const { data, undo, redo } = usePortfolioData();
  const searchParams = useSearchParams();
  const [isEditMode, setIsEditMode] = useState(searchParams.get('edit') === 'true');
  const auth = useAuth();
  const gated = auth.gated;
  const isAuthed = auth.authenticated;
  const editingAllowed = auth.allowEdit;
  const canEdit = isEditMode && isAuthed && editingAllowed;
  const showLogin =
    isEditMode && gated && !auth.authenticated && editingAllowed && auth.authReady;
  const useFirebaseLogin = auth.hosted;

  const router = useRouter();
  const frontDoorFired = useRef(false);
  useEffect(() => {
    if (!showLogin || !auth.hosted || frontDoorFired.current) return;
    frontDoorFired.current = true;
    router.replace('/dashboard');
  }, [showLogin, auth.hosted, router]);

  async function handleLogout() {
    // Guard BEFORE destroying the session. The beforeunload listener only
    // fires on navigation, and auth.logout() would have already completed
    // by then — so a cancel there would still leave the user logged out.
    // isDirty() returns false in Product B (no hosted save layer) so the
    // guard is a no-op there.
    if (auth.hosted && isDirty()) {
      const ok = window.confirm(
        'You have unsaved changes. Leave without saving?',
      );
      if (!ok) return;
      // We confirmed the discard; flag the upcoming navigation so the
      // beforeunload guard doesn't stack a second "Leave site?" dialog.
      setIntentionalNav();
    }
    await auth.logout();
    try {
      window.sessionStorage.removeItem('portfolio-edit-mode');
      document.cookie = 'portfolio-edit-mode=; Path=/; SameSite=Lax; Max-Age=0';
    } catch {}
    if (auth.hosted) {
      // Full page navigation on purpose — logout must re-init every gated
      // organ from scratch, so this can't be a soft router.push().
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/dashboard';
    } else {
      window.location.reload();
    }
  }
  const [editShortcut, setEditShortcut] = useState<EditShortcut>(() =>
    readStoredShortcut(),
  );
  function changeEditShortcut(next: EditShortcut) {
    setEditShortcut(next);
    writeStoredShortcut(next);
  }
  const [overlay, setOverlay] = useState<
    { kind: 'write'; id: string } | { kind: 'read'; id: string } | null
  >(null);
  // shell handles tabs, theme, nav, scroll
  const shell = usePortfolioShell({
    tabs: data.tabs,
    docSkin: data.skin,
    docTheme: data.theme,
    persistTabKey: 'portfolio-last-tab',
    adminTabIds: ['admin:posts', 'admin:site'],
    posts: data.posts,
  });

  // Keep shell's activeId seeded correctly on first mount if session had admin id?
  // shell already seeds from sessionStorage, we just need to derive admin view from it
  const ADMIN_TABS = [
    { id: 'admin:posts', label: 'Posts' },
    { id: 'admin:site', label: 'Site' },
  ] as const;
  type AdminTabId = (typeof ADMIN_TABS)[number]['id'];
  const activeAdmin = ADMIN_TABS.find((t) => t.id === shell.activeId);
  const adminView: AdminTabId | null =
    canEdit && activeAdmin ? activeAdmin.id : null;

  const activeTab = adminView ? undefined : shell.activeTab;
  const activeIndex = adminView ? -1 : shell.activeIndex;

  // Override shell's activeIndex for navDirection when admin is active
  // shell's navDirection already tracks activeIndex, but we need to ensure admin -1 is considered
  // For simplicity, reuse shell's navDirection (it tracks regular tabs); when admin active, direction is preserved.
  const navDirection = shell.navDirection;

  const [editorOpen, setEditorOpen] = useState(false);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDesktop = useIsDesktopWidth();

  // Restore edit intent from persisted storage (covers reload at `/` after `?edit=true` was set
  // but the URL lost it before the server could see it). Runs once on mount.
  useEffect(() => {
    if (isEditMode) return;
    try {
      if (window.sessionStorage.getItem('portfolio-edit-mode') === '1' || document.cookie.includes('portfolio-edit-mode=1')) {
        setIsEditMode(true);
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      if (isEditMode) {
        window.sessionStorage.setItem('portfolio-edit-mode', '1');
        document.cookie = 'portfolio-edit-mode=1; Path=/; SameSite=Lax; Max-Age=86400';
      } else {
        window.sessionStorage.removeItem('portfolio-edit-mode');
        document.cookie = 'portfolio-edit-mode=; Path=/; SameSite=Lax; Max-Age=0';
      }
    } catch {}
    const params = new URLSearchParams(window.location.search);
    if (isEditMode) params.set('edit', 'true');
    else params.delete('edit');

    const queryString = params.toString();
    const target = queryString ? `/?${queryString}` : window.location.pathname;
    if (target !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, '', target);
    }
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

      if (editingAllowed && shortcutMatches(event, editShortcut)) {
        event.preventDefault();
        setIsEditMode((mode) => !mode);
        return;
      }

      if (!canEdit) return;

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
  }, [isEditMode, canEdit, undo, redo, editShortcut, editingAllowed]);

  if (data.tabs.length === 0 || (!adminView && !activeTab)) return null;

  const publishedPosts = shell.publishedPosts;

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="animate-pulse font-mono text-sm opacity-40">
          ~/loading portfolio…
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
      {canEdit && <UtilityBar hosted={auth.hosted} authenticated={isAuthed} onLogout={handleLogout} />}
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
      {canEdit && !auth.hosted && (
        <button
          type="button"
          onClick={handleLogout}
          title="End this session and return to visitor mode"
          className="rounded-skin border border-red-500/40 bg-red-500/5 px-2.5 py-1 text-xs font-medium text-red-500 opacity-90 transition-colors hover:opacity-100"
        >
          Log out
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
          ...(data.theme.fontFamily
            ? { '--font': data.theme.fontFamily }
            : {}),
        } as React.CSSProperties
      }
      className="flex min-h-dvh flex-col overflow-x-clip"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-6 pb-16">
        <PortfolioChrome
          tabs={data.tabs}
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

        {showLogin ? (
          <div className="flex-1">
            {useFirebaseLogin ? (
              <>
                <p className="pt-6 text-center text-xs opacity-50">
                  Taking you to sign-in…
                </p>
                <FirebaseLoginCard onLoginWithIdToken={auth.loginWithIdToken} />
              </>
            ) : (
              <LoginCard onLogin={auth.login} />
            )}
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
            <BlogSite postId={overlay.id} onClose={() => setOverlay(null)} />
          )}
        </FloatingPage>
      )}
    </main>
  );
}
