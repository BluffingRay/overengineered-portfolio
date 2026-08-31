'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { clampViewScale } from '@/types/schema';
import type { ThemeSkin, Tab, ThemeConfig, Post } from '@/types/schema';
import { useScrollableTabs } from '@/hooks/useScrollableTabs';

const DARK_QUERY = '(prefers-color-scheme: dark)';
const SKIN_OVERRIDE_KEY = 'portfolio-skin-override';
const VIEW_SCALE_OVERRIDE_KEY = 'portfolio-view-scale-override';
const LAST_TAB_KEY = 'portfolio-last-tab';

function subscribeSystemTheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export interface UsePortfolioShellOptions {
  tabs: Tab[];
  docSkin: ThemeSkin;
  docTheme: ThemeConfig;
  // Tab persistence mode
  persistTabKey?: string | null; // 'portfolio-last-tab' for Portfolio, null for Playground/Hosted
  initialActiveTabId?: string; // for Hosted hybrid (server-provided) or Playground seed
  usePushState?: boolean; // true for Hosted hybrid tabs
  slug?: string; // for Hosted hrefFor
  adminTabIds?: string[]; // ['admin:posts','admin:site'] for editable shells
  ephemeralTheme?: boolean; // true for Hosted (no localStorage for skin/scale)
  posts?: Post[]; // optional for publishedPosts derivation
}

function hrefForHosted(slug: string, tabId: string, firstTabId: string | undefined) {
  return firstTabId && tabId === firstTabId ? `/u/${slug}` : `/u/${slug}?t=${encodeURIComponent(tabId)}`;
}

export function usePortfolioShell(options: UsePortfolioShellOptions) {
  const {
    tabs,
    docSkin,
    docTheme,
    persistTabKey = null,
    initialActiveTabId,
    usePushState = false,
    slug,
    adminTabIds,
    ephemeralTheme = false,
    posts,
  } = options;

  // ----- active tab id -----
  const [activeId, setActiveId] = useState<string>(() => {
    // Hosted controlled initial takes precedence when provided
    if (initialActiveTabId !== undefined && initialActiveTabId !== '') return initialActiveTabId;
    if (persistTabKey) {
      try {
        const stored = window.sessionStorage.getItem(persistTabKey);
        if (stored) return stored;
      } catch {}
    }
    return tabs[0]?.id ?? '';
  });

  // Hosted hybrid: sync when server prop changes (deep link / back-forward via RSC)
  const [lastServerTabId, setLastServerTabId] = useState<string | undefined>(initialActiveTabId);
  if (usePushState && lastServerTabId !== initialActiveTabId) {
    setLastServerTabId(initialActiveTabId);
    if (initialActiveTabId !== undefined) setActiveId(initialActiveTabId);
  }

  // Persist to sessionStorage when key provided (PortfolioView)
  useEffect(() => {
    if (!persistTabKey || !activeId) return;
    // Don't persist admin ids? PortfolioView persists admin ids (so Done lands back in Posts). Keep.
    try {
      window.sessionStorage.setItem(persistTabKey, activeId);
    } catch {}
  }, [activeId, persistTabKey]);

  // Hosted popstate sync (back/forward across pushState switches)
  useEffect(() => {
    if (!usePushState) return;
    function onPopState() {
      const requested = new URLSearchParams(window.location.search).get('t');
      const match = tabs.find((tab) => tab.id === requested) ?? tabs[0];
      if (match) setActiveId(match.id);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [tabs, usePushState]);

  const isAdminActive = adminTabIds ? adminTabIds.includes(activeId) : false;
  const activeTab = isAdminActive ? undefined : (tabs.find((tab) => tab.id === activeId) ?? tabs[0]);
  const activeIndex = activeTab ? tabs.indexOf(activeTab) : -1;

  // ----- theme skin/scale -----
  const [skinPick, setSkinPick] = useState<ThemeSkin | 'auto' | null>(() => {
    if (ephemeralTheme) return null;
    try {
      const stored = window.localStorage.getItem(SKIN_OVERRIDE_KEY);
      return stored === 'hud' || stored === 'notebook' || stored === 'clean' || stored === 'auto' ? stored : null;
    } catch {
      return null;
    }
  });

  function setSkin(next: ThemeSkin | 'auto') {
    setSkinPick(next);
    if (!ephemeralTheme) {
      try {
        window.localStorage.setItem(SKIN_OVERRIDE_KEY, next);
      } catch {}
    }
  }

  const [scalePick, setScalePick] = useState<number | null>(() => {
    if (ephemeralTheme) return null;
    try {
      const raw = window.localStorage.getItem(VIEW_SCALE_OVERRIDE_KEY);
      const parsed = raw === null ? NaN : Number(raw);
      return Number.isFinite(parsed) ? clampViewScale(parsed) : null;
    } catch {
      return null;
    }
  });

  function setScale(next: number | null) {
    setScalePick(next);
    if (!ephemeralTheme) {
      try {
        if (next === null) window.localStorage.removeItem(VIEW_SCALE_OVERRIDE_KEY);
        else window.localStorage.setItem(VIEW_SCALE_OVERRIDE_KEY, String(next));
      } catch {}
    }
  }

  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemTheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );

  const isSkinLocked = docTheme.lockSkin === true;
  const appliedSkin: ThemeSkin = isSkinLocked
    ? docSkin
    : skinPick === 'auto'
      ? systemPrefersDark
        ? 'hud'
        : 'clean'
      : (skinPick ?? docSkin);

  const officialViewScale = typeof docTheme.viewScale === 'number' ? clampViewScale(docTheme.viewScale) : 1;
  const appliedScale = scalePick ?? officialViewScale;

  function subscribeDesktopWidth(onChange: () => void) {
    const query = window.matchMedia('(min-width: 768px)');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }

  const isDesktopWidth = useSyncExternalStore(
    subscribeDesktopWidth,
    () => window.matchMedia('(min-width: 768px)').matches,
    () => false,
  );

  const effectiveScale = ephemeralTheme ? appliedScale : isDesktopWidth ? appliedScale : 1;

  // ----- documentElement mirrors (non-ephemeral) -----
  useEffect(() => {
    if (ephemeralTheme) {
      // Hosted cleans leak from B SPA navigation; its own scale goes on wrapper
      document.documentElement.style.removeProperty('zoom');
      return;
    }
    document.documentElement.dataset.skin = appliedSkin;
  }, [appliedSkin, ephemeralTheme]);

  useEffect(() => {
    if (ephemeralTheme) return;
    const root = document.documentElement;
    if (docTheme.accentColor) root.style.setProperty('--accent', docTheme.accentColor);
    else root.style.removeProperty('--accent');
    if (docTheme.fontFamily) {
      root.style.setProperty('--font', docTheme.fontFamily);
      root.style.setProperty('--font-custom', docTheme.fontFamily);
    } else {
      root.style.removeProperty('--font');
      root.style.removeProperty('--font-custom');
    }
  }, [docTheme.accentColor, docTheme.fontFamily, ephemeralTheme]);

  useEffect(() => {
    if (ephemeralTheme) return;
    const root = document.documentElement;
    if (effectiveScale !== 1) root.style.zoom = String(effectiveScale);
    else root.style.removeProperty('zoom');
  }, [effectiveScale, ephemeralTheme]);

  // ----- navDirection -----
  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  const [prevActiveIndex, setPrevActiveIndex] = useState(activeIndex);
  if (prevActiveIndex !== activeIndex) {
    setNavDirection(activeIndex > prevActiveIndex ? 1 : -1);
    setPrevActiveIndex(activeIndex);
  }

  // ----- scrollable tabs -----
  const scrollable = useScrollableTabs<HTMLElement>({
    itemCount: tabs.length,
    activeIndex,
  });

  // ----- handleNavigate / handleKeyDown -----
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
    if (usePushState && slug) {
      const target = hrefForHosted(slug, match.id, tabs[0]?.id);
      window.history.pushState(null, '', target);
      setActiveId(match.id);
    } else {
      setActiveId(match.id);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }

  function handleKeyDownForTabs(event: React.KeyboardEvent) {
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
      const tab = tabs[next];
      if (!tab) return;
      if (usePushState && slug) {
        const target = hrefForHosted(slug, tab.id, tabs[0]?.id);
        window.history.pushState(null, '', target);
        setActiveId(tab.id);
      } else {
        setActiveId(tab.id);
      }
      // focus is caller's responsibility via itemsRef, but we can focus via scrollable.itemsRef
      scrollable.itemsRef.current[next]?.focus();
    }
  }

  function switchTabLocal(tabId: string) {
    if (usePushState && slug) {
      window.history.pushState(null, '', hrefForHosted(slug, tabId, tabs[0]?.id));
    }
    setActiveId(tabId);
  }

  function hrefFor(tabId: string): string {
    if (!slug) return `#${tabId}`;
    return hrefForHosted(slug, tabId, tabs[0]?.id);
  }

  // ----- publishedPosts -----
  const publishedPosts = (posts ?? [])
    .filter((p) => p.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));

  // ----- themeStyle for hosted wrapper -----
  const themeStyle = ephemeralTheme
    ? ({
        ...(docTheme.accentColor ? { '--accent': docTheme.accentColor } : {}),
        ...(docTheme.fontFamily ? { '--font': docTheme.fontFamily, '--font-custom': docTheme.fontFamily } : {}),
        ...(appliedScale !== 1 ? { zoom: appliedScale } : {}),
      } as React.CSSProperties)
    : undefined;

  const wrapperMinHeight = ephemeralTheme && appliedScale !== 1 ? `calc(100dvh / ${appliedScale})` : undefined;

  return {
    // tab
    activeId,
    setActiveId,
    activeTab,
    activeIndex,
    navDirection,
    handleNavigate,
    handleKeyDownForTabs,
    switchTabLocal,
    hrefFor,
    publishedPosts,
    // theme
    skinPick,
    setSkin: setSkin as (next: ThemeSkin | 'auto') => void,
    scalePick,
    setScale,
    appliedSkin,
    appliedScale,
    effectiveScale,
    officialViewScale,
    isSkinLocked,
    systemPrefersDark,
    themeStyle,
    wrapperMinHeight,
    // scrollable
    ...scrollable,
    // raw
    isDesktopWidth,
  };
}

// Keep constants exported for view's localStorage writes if needed externally
export { SKIN_OVERRIDE_KEY, VIEW_SCALE_OVERRIDE_KEY, LAST_TAB_KEY };
