'use client';

import TabsManager from './TabsManager';
import BlockList from './BlockList';

/**
 * The on-page editor is single-purpose now: this tab's blocks. Posts and
 * site settings render as hidden edit-mode tabs in PortfolioView.
 */
export default function EditorPanel({ activeTabId }: { activeTabId: string }) {
  return (
    <section
      aria-label="Portfolio editor"
      className="settle-in rounded-skin border border-current/15 bg-surface p-4 shadow-xl shadow-black/20 ring-1 ring-current/10"
    >
      <TabsManager activeTabId={activeTabId} />
      <BlockList activeTabId={activeTabId} />
    </section>
  );
}
