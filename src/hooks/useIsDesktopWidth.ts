'use client';

import { useSyncExternalStore } from 'react';

/* Reusable hydration-safe mobile detection (matches the existing
   desktop-width pattern in PortfolioView / PlaygroundView). Mobile =
   narrower than the `md:` breakpoint (768px). Returns false server-side
   and during hydration, then live-updates on real mobile. */

const DESKTOP_QUERY = '(min-width: 768px)';

function subscribeDesktopWidth(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getDesktopWidth() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/** True when the viewport is at desktop width (>= 768px). */
export function useIsDesktopWidth(): boolean {
  return useSyncExternalStore(
    subscribeDesktopWidth,
    getDesktopWidth,
    // Server + hydration snapshot: treat as desktop so the full layout
    // (including the admin's chosen hero layout) renders without flash.
    () => true,
  );
}
