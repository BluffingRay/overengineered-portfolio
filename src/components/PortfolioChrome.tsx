'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Tab } from '@/types/schema';
import { ScrollableTabStrip } from '@/components/ScrollableTabStrip';
import type { useScrollableTabs } from '@/hooks/useScrollableTabs';

interface PortfolioChromeProps {
  tabs: Tab[];
  activeIndex: number;
  onTabChange: (id: string) => void;
  hrefFor?: (id: string) => string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  scrollable: ReturnType<typeof useScrollableTabs<HTMLElement>>;
  isDesktop: boolean;
  adminRow?: ReactNode;
  controls?: ReactNode;
}

/**
 * Shared header chrome: tab strip + admin row + right controls.
 * Used by PortfolioView, PlaygroundView and HostedPortfolioView.
 * Hosted passes hrefFor to render Links; editable shells render buttons.
 * The host owns the scrollable hook (via usePortfolioShell) and passes it in,
 * so the chrome stays stateless.
 */
export default function PortfolioChrome({
  tabs,
  activeIndex,
  onTabChange,
  hrefFor,
  onKeyDown,
  scrollable,
  isDesktop,
  adminRow,
  controls,
}: PortfolioChromeProps) {
  // Edit mode renders a heavy controls cluster (UtilityBar + Edit/Logout) that
  // overflows the row on phones/tablets — force it onto its own line so the
  // UtilityBar's inner flex-wrap can lay items out at full width. Visitor mode
  // only has theme + zoom, which fit on one row with the tab strip; keep the
  // compact desktop-style layout there.
  const controlsFullWidth = Boolean(adminRow);
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-current/15">
      <ScrollableTabStrip
        scrollRef={scrollable.scrollRef}
        onScroll={scrollable.onScroll}
        canScrollLeft={scrollable.canScrollLeft}
        canScrollRight={scrollable.canScrollRight}
        scrollLeft={scrollable.scrollLeft}
        scrollRight={scrollable.scrollRight}
        isDesktop={isDesktop}
        onKeyDown={onKeyDown}
        ariaLabel="Portfolio sections"
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          // Hosted links mode
          if (hrefFor) {
            return (
              <Link
                key={tab.id}
                ref={(el) => {
                  scrollable.itemsRef.current[index] = el;
                }}
                href={hrefFor(tab.id)}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  onTabChange(tab.id);
                }}
                className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
                  isActive ? 'border-accent' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {tab.label}
              </Link>
            );
          }
          return (
            <button
              key={tab.id}
              ref={(el) => {
                scrollable.itemsRef.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={undefined}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
                isActive ? 'border-accent' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </ScrollableTabStrip>

      {adminRow}

      {controls && (
        <div
          className={`flex flex-wrap items-center justify-end gap-3 pb-3 lg:shrink-0 ${
            controlsFullWidth ? 'w-full' : 'w-auto'
          }`}
        >
          {controls}
        </div>
      )}
    </div>
  );
}
