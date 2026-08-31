'use client';

import type { ReactNode, KeyboardEvent } from 'react';
import type { useScrollableTabs } from '@/hooks/useScrollableTabs';

/**
 * Shared scrollable tab strip rendered by PortfolioView, the public
 * HostedPortfolioView and the Playground. Owns the overflow container,
 * the hidden scrollbar, and the desktop gradient arrow buttons that
 * indicate overflow. The host passes its useScrollableTabs() output and
 * renders the actual tab elements as children.
 *
 * To reduce duplication, the children should be a single flex row of tab
 * elements wired to `tablist` keyboard semantics (role="tab" etc.) — the
 * host keeps its own aria-label / keyboard handler via `onKeyDown`.
 */
export function ScrollableTabStrip({
  scrollRef,
  onScroll,
  canScrollLeft,
  canScrollRight,
  scrollLeft,
  scrollRight,
  isDesktop,
  onKeyDown,
  ariaLabel,
  children,
}: {
  scrollRef: ReturnType<typeof useScrollableTabs<HTMLElement>>['scrollRef'];
  onScroll: (() => void) | undefined;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollLeft: () => void;
  scrollRight: () => void;
  isDesktop: boolean;
  onKeyDown?: (event: KeyboardEvent) => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          role="tablist"
          aria-label={ariaLabel}
          onKeyDown={onKeyDown}
          className="flex gap-1 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {children}
        </div>
        {isDesktop && canScrollLeft && (
          <button
            type="button"
            aria-label="Scroll tabs left"
            onClick={scrollLeft}
            className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent text-current opacity-80 hover:opacity-100"
          >
            ‹
          </button>
        )}
        {isDesktop && canScrollRight && (
          <button
            type="button"
            aria-label="Scroll tabs right"
            onClick={scrollRight}
            className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent text-current opacity-80 hover:opacity-100"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
