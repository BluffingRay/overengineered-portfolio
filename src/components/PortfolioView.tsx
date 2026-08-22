'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import SkinSwitcher from '@/components/SkinSwitcher';
import UtilityBar from '@/components/UtilityBar';
import EditorPanel from '@/components/editor/EditorPanel';

export default function PortfolioView() {
  const { data } = usePortfolioData();
  const searchParams = useSearchParams();
  const [isEditMode, setIsEditMode] = useState(
    searchParams.get('edit') === 'true',
  );
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'e'
      ) {
        event.preventDefault();
        setIsEditMode((mode) => !mode);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const tabs = data.tabs;
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  if (tabs.length === 0 || !activeTab) return null;

  const activeIndex = tabs.indexOf(activeTab);

  function selectAndFocus(index: number) {
    const tab = tabs[index];
    if (!tab) return;
    setActiveTabId(tab.id);
    tabRefs.current[index]?.focus();
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

  return (
    <main
      data-skin={data.skin}
      style={
        data.theme.accentColor
          ? ({ '--accent': data.theme.accentColor } as React.CSSProperties)
          : undefined
      }
      className="min-h-dvh"
    >
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="flex items-center justify-between gap-4 border-b border-current/15">
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
              aria-controls={`panel-${activeTab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTabId(tab.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
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

          <div className="flex flex-wrap items-center justify-end gap-3">
            {isEditMode && <UtilityBar />}
            <SkinSwitcher />
            {isEditMode && (
              <button
                type="button"
                aria-expanded={editorOpen}
                onClick={() => setEditorOpen((open) => !open)}
                className={`rounded-skin border px-2.5 py-1 text-xs font-medium transition-colors ${
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

        {isEditMode && editorOpen && (
          <EditorPanel activeTabId={activeTab.id} />
        )}

      <div
        role="tabpanel"
        id={`panel-${activeTab.id}`}
        aria-labelledby={`tab-${activeTab.id}`}
        className="space-y-24 pt-16"
      >
        {activeTab.blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
      </div>
    </main>
  );
}
