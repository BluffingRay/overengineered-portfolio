'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Shared scrollable-tab-strip logic, used by PortfolioView, the public
 * HostedPortfolioView (/u/) and the Playground — the three surfaces that
 * each render a horizontal tab bar with theme/zoom controls anchored
 * right. Encapsulates the arrow-visibility calculation, left/right
 * scrolling, overflow re-sync (ResizeObserver) and active-tab
 * auto-centering that used to be duplicated verbatim in all three.
 *
 * Returns everything the host needs to render the strip:
 *  - `scrollRef`  → attach to the horizontally scrollable tablist
 *  - `onScroll`   → attach to that same element
 *  - arrow state + `scrollLeft` / `scrollRight` handlers
 *  - an `autocenter(index)` effect you should call with the active index
 *
 * `scrollwidth-cmp` uses the host's `itemsRef` (an array of the tab
 * elements) to find the active one for auto-centering, so it works for
 * both <button> and <Link> children.
 */
export function useScrollableTabs<T extends HTMLElement>({
  itemCount,
  activeIndex,
}: {
  itemCount: number;
  activeIndex: number;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Host mirrors each tab element into this array (e.g. via a ref callback).
  const itemsRef = useRef<Array<T | null>>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  };

  const onScroll = () => updateArrows();

  const scrollLeft = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: -el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.7, behavior: 'smooth' });
  };

  // Re-sync arrows on mount and whenever the tab set grows/shrinks, plus
  // on any resize/overflow change (ResizeObserver callback is an
  // event-handler context — safe to setState).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    requestAnimationFrame(updateArrows);
    return () => ro.disconnect();
  }, [itemCount]);

  // Auto-center the active tab whenever it changes (mounts centered too).
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = scrollRef.current;
    const activeEl = itemsRef.current[activeIndex];
    if (el && activeEl) {
      const target =
        activeEl.offsetLeft - (el.clientWidth - activeEl.offsetWidth) / 2;
      const clamped = Math.max(
        0,
        Math.min(target, el.scrollWidth - el.clientWidth),
      );
      el.scrollTo({ left: clamped, behavior: 'smooth' });
    }
    requestAnimationFrame(updateArrows);
  }, [activeIndex]);

  return {
    scrollRef,
    itemsRef,
    canScrollLeft,
    canScrollRight,
    onScroll,
    scrollLeft,
    scrollRight,
  };
}
