'use client';

import TabsManager from './TabsManager';
import BlockList from './BlockList';

interface Props {
  activeTabId: string;
}

export default function EditorPanel({ activeTabId }: Props) {
  return (
    <section
      aria-label="Block editor"
      className="rounded-skin border border-current/15 bg-surface p-4 shadow-xl shadow-black/20 ring-1 ring-current/10"
    >
      <TabsManager activeTabId={activeTabId} />
      <BlockList activeTabId={activeTabId} />
    </section>
  );
}
