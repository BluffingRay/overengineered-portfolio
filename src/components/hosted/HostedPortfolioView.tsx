'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { clampViewScale } from '@/types/schema';
import type { PortfolioData, ThemeSkin } from '@/types/schema';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import SiteFooter from '@/components/ui/SiteFooter';
import SkinSwitcher from '@/components/SkinSwitcher';
import ViewScaleControl from '@/components/ViewScaleControl';
import FloatingPage from '@/components/FloatingPage';
import BlogSite from '@/components/blog/BlogSite';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeSystemTheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * FIX-F phase-1 — the hosted public render (Product A): the visitor
 * pipeline of PortfolioView (skin tokens + tab nav + panel + footer) with
 * every editor organ stripped, mounted from the /u/[slug] server page via
 * pure data props. Deliberately imports nothing that touches the B store,
 * localStorage, or useAuth — the DOC's skin/accent/font is the theme.
 *
 * Visitor controls (user decision, 2026-08-30): SkinSwitcher +
 * ViewScaleControl render as LIVE, PER-VISIT adjustments — component state
 * only, no localStorage, no override keys — so every fresh visit loads the
 * owner's art direction and a pick never rides across other hosted
 * portfolios. State seeds from the doc (SSR + hydration identical; picks
 * arrive only through event handlers), `theme.lockSkin` hides the theme
 * changer, and the scale pick applies to the wrapper exactly like the
 * doc's own scale (never <html>; the html zoom-removal effect below keeps
 * a scaled SPA navigation from leaking in).
 *
 * Tabs are hybrid: ?t= deep links still server-render (the page validates
 * the param), but plain clicks switch locally from the already-loaded doc
 * and sync the URL via history.pushState — no server round trip per press.
 * Blog post / card post clicks open the floating reader (BlogSite fed the
 * doc's published posts — the B store is the wrong source here).
 *
 * Phase-1 duplication note: this mirrors PortfolioView's render region on
 * purpose (zero regression risk to Product B); unification is a later
 * review-gated pass.
 */
interface Props {
  doc: PortfolioData;
  slug: string;
  activeTabId: string;
}

export default function HostedPortfolioView({ doc, slug, activeTabId }: Props) {
  const tabs = doc.tabs;

  // Hybrid tabs: `activeTabId` (the server-rendered URL) is the truth when
  // the server sends a NEW value — deep links and back/forward render
  // server-side — while plain clicks switch locally. Comparing against a
  // stored copy of the prop (not the prop itself) keeps client re-renders
  // from clobbering a local pick. Render-phase adjustment, same house
  // pattern as the navDirection tracker below.
  const [activeId, setActiveId] = useState(activeTabId);
  const [lastServerTabId, setLastServerTabId] = useState(activeTabId);
  if (lastServerTabId !== activeTabId) {
    setLastServerTabId(activeTabId);
    setActiveId(activeTabId);
  }
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const activeIndex = activeTab ? tabs.indexOf(activeTab) : -1;
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  // Floating reader overlay (same shape as PortfolioView's read overlay).
  const [overlayPostId, setOverlayPostId] = useState<string | null>(null);

  // Visitors read published posts, newest first (same as PortfolioView).
  const publishedPosts = (doc.posts ?? [])
    .filter((post) => post.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));

  // Render-phase direction tracking (no effect): the panel enters from the
  // side the navigation moved toward. Same pattern as PortfolioView.
  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  const [prevActiveIndex, setPrevActiveIndex] = useState(activeIndex);
  if (prevActiveIndex !== activeIndex) {
    setNavDirection(activeIndex > prevActiveIndex ? 1 : -1);
    setPrevActiveIndex(activeIndex);
  }

  // Canonical URLs: the first tab is the bare /u/<slug>, deeper tabs carry
  // ?t=<tabId> so every tab is a shareable server-rendered address.
  function hrefFor(tabId: string): string {
    return tabs[0] && tabId === tabs[0].id
      ? `/u/${slug}`
      : `/u/${slug}?t=${encodeURIComponent(tabId)}`;
  }

  // Local switch: URL sync via pushState (integrated with the App Router —
  // back/forward still restore real URLs) without a server round trip.
  function switchTabLocal(tabId: string) {
    window.history.pushState(null, '', hrefFor(tabId));
    setActiveId(tabId);
  }

  // Browsers restore URLs via popstate (back/forward across local
  // switches) — re-sync the local pick from the restored URL so the panel
  // always matches the address bar. State updates inside the event
  // callback are event-handler writes, not render-phase ones.
  useEffect(() => {
    function onPopState() {
      const requested = new URLSearchParams(window.location.search).get('t');
      const match = tabs.find((tab) => tab.id === requested) ?? tabs[0];
      if (match) setActiveId(match.id);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [tabs]);

  // The hosted render is doc-deterministic: a visitor arriving from a
  // scaled B page (SPA nav) would otherwise inherit <html>'s zoom. The
  // doc's own scale applies on the wrapper below, not on <html>.
  useEffect(() => {
    document.documentElement.style.removeProperty('zoom');
  }, []);

  // Visitor controls — ephemeral by design (see docstring): picks live in
  // component state only, seeded null = the doc's values, so SSR and
  // hydration agree and nothing persists past the visit.
  const isSkinLocked = doc.theme.lockSkin === true;
  const [skinPick, setSkinPick] = useState<ThemeSkin | 'auto' | null>(null);
  const [scalePick, setScalePick] = useState<number | null>(null);
  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemTheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  // Same resolution as PortfolioView's activeSkin (kept inline on purpose —
  // phase-1 duplication, no shared lib yet).
  const appliedSkin: ThemeSkin = isSkinLocked
    ? doc.skin
    : skinPick === 'auto'
      ? systemPrefersDark
        ? 'hud'
        : 'clean'
      : (skinPick ?? doc.skin);

  // Hero CTAs resolve against tabs — same matching as PortfolioView's
  // handleNavigate (only `#`-prefixed values are candidates; ids, `tab-…`
  // ids and label slugs all match), then a local switch + scroll to top.
  function handleNavigate(href: string): boolean {
    if (!href.trim().startsWith('#')) return false;
    const raw = href.trim().toLowerCase().replace(/^#/, '');
    if (!raw) return false;

    const slugPart = raw.replace(/^tab-/, '');
    const match = tabs.find((tab) => {
      const id = tab.id.toLowerCase();
      return (
        id === raw ||
        id.replace(/^tab-/, '') === slugPart ||
        tab.label.toLowerCase().replace(/\s+/g, '-') === slugPart
      );
    });
    if (!match) return false;

    switchTabLocal(match.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }

  function handleKeyDown(event: ReactKeyboardEvent) {
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

    if (next === null) return;
    event.preventDefault();
    const tab = tabs[next];
    if (!tab) return;
    switchTabLocal(tab.id);
    tabRefs.current[next]?.focus();
  }

  // The doc's tokens + the APPLIED scale (doc default or the visitor's
  // ephemeral pick), applied to the wrapper AND to body-level portals
  // (FloatingPage) that sit outside the wrapper's [data-skin] subtree —
  // otherwise the reader would wear the visitor's localStorage theme and
  // an unscaled size.
  const viewScale =
    typeof doc.theme.viewScale === 'number'
      ? clampViewScale(doc.theme.viewScale)
      : 1;
  const appliedScale = scalePick ?? viewScale;
  const themeStyle = {
    ...(doc.theme.accentColor
      ? { '--accent': doc.theme.accentColor }
      : {}),
    ...(doc.theme.fontFamily
      ? {
          '--font': doc.theme.fontFamily,
          '--font-custom': doc.theme.fontFamily,
        }
      : {}),
    ...(appliedScale !== 1 ? { zoom: appliedScale } : {}),
  } as CSSProperties;
  // zoom multiplies viewport units — divide dvh so the scaled wrapper
  // still fills the window.
  const wrapperMinHeight =
    appliedScale === 1 ? undefined : `calc(100dvh / ${appliedScale})`;

  return (
    <main
      data-skin={appliedSkin}
      style={{ ...themeStyle, minHeight: wrapperMinHeight }}
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
                <Link
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  href={hrefFor(tab.id)}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={
                    activeTab ? `panel-${activeTab.id}` : undefined
                  }
                  tabIndex={isActive ? 0 : -1}
                  onClick={(event) => {
                    // Plain left-clicks switch locally from the
                    // already-loaded doc (no round trip); modified clicks,
                    // middle-click and no-JS keep the real href.
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey ||
                      event.button !== 0
                    ) {
                      return;
                    }
                    event.preventDefault();
                    switchTabLocal(tab.id);
                  }}
                  className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
                    isActive
                      ? 'border-accent'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Public visitor controls — live per-visit adjustments, never
              persisted (ephemeral model, see docstring). */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <ViewScaleControl
              value={appliedScale}
              official={viewScale}
              overridden={scalePick !== null}
              onChange={(next) => setScalePick(next === null ? null : clampViewScale(next))}
            />
            {!isSkinLocked && (
              <SkinSwitcher
                value={skinPick ?? appliedSkin}
                official={doc.skin}
                onChange={setSkinPick}
              />
            )}
          </div>
        </div>

        {activeTab && (
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
                socials={doc.socials}
                cards={doc.cards}
                posts={publishedPosts}
                onNavigate={handleNavigate}
                onOpenPost={(id) => setOverlayPostId(id)}
              />
            ))}
          </div>
        )}

        {/* 5g-b (followup) — platform credit passed INTO the footer so it
            shares the copyright line instead of stacking one of its own:
            quieter, and a user-defined footer keeps its length. Link (not
            <a>) — the project eslint rule; hosted / redirects to
            /dashboard, so the badge always lands on the hub. NO
            transition/duration utilities: the motion base layer owns link
            transitions (utilities would drop scale from the list). */}
        <SiteFooter
          footer={doc.footer}
          socials={doc.socials}
          badge={
            <Link href="/" className="opacity-40 hover:opacity-70">
              Built with overengineered-portfolio
            </Link>
          }
        />
      </div>

      {overlayPostId && (
        <FloatingPage
          onClose={() => setOverlayPostId(null)}
          themeSkin={appliedSkin}
          themeStyle={themeStyle}
        >
          <BlogSite
            postId={overlayPostId}
            posts={publishedPosts}
            onClose={() => setOverlayPostId(null)}
          />
        </FloatingPage>
      )}
    </main>
  );
}
