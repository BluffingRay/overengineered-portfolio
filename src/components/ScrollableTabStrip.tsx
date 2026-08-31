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
          className="flex gap-1 overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth pb-2.5 -mb-2.5"
        >
          {children}
        </div>
        {/* Edge fade — the scrollability indicator on EVERY breakpoint
            (non-interactive; hints there's content off-screen, shown
            whenever either edge overflows). The clickable ‹ › arrows are
            desktop-only, layered on top of the same fade. */}
        {canScrollLeft && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-background to-transparent"
          />
        )}
        {canScrollRight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent"
          />
        )}
        {isDesktop && canScrollLeft && (
          <button
            type="button"
            aria-label="Scroll tabs left"
            onClick={scrollLeft}
            className="absolute left-1 top-1/2 flex h-7 w-7 -translate-y-[calc(50%+3px)] items-center justify-center rounded-full border border-current/15 bg-background/80 text-current opacity-70 shadow-sm backdrop-blur hover:opacity-100"
          >
            <span aria-hidden="true">‹</span>
          </button>
        )}
        {isDesktop && canScrollRight && (
          <button
            type="button"
            aria-label="Scroll tabs right"
            onClick={scrollRight}
            className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-[calc(50%+3px)] items-center justify-center rounded-full border border-current/15 bg-background/80 text-current opacity-70 shadow-sm backdrop-blur hover:opacity-100"
          >
            <span aria-hidden="true">›</span>
          </button>
        )}
      </div>
    </div>
  );
}
