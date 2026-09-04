'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useEditorSensors } from '@/hooks/useEditorSensors';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import type { Tab } from '@/types/schema';
import { DRAG_HANDLE, INPUT, ROW_BTN } from './editor-shared';

function SortableTabRow({
  tab,
  isActive,
  canDelete,
  onRename,
  onDelete,
}: {
  tab: Tab;
  isActive: boolean;
  canDelete: boolean;
  onRename: (label: string) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-center gap-1.5 ${isDragging ? 'opacity-40' : ''}`}
    >
      <button
        type="button"
        aria-label={`Drag to reorder ${tab.label}`}
        title={isActive ? 'Active tab' : undefined}
        className={DRAG_HANDLE}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <input
        value={tab.label}
        onChange={(event) => onRename(event.target.value)}
        aria-label={`Rename tab ${tab.label}`}
        className={INPUT}
      />
      <button
        type="button"
        aria-label={`Delete tab ${tab.label}`}
        title={canDelete ? undefined : 'Cannot delete the last remaining tab'}
        disabled={!canDelete}
        className={`${ROW_BTN} hover:!text-red-500`}
        onClick={onDelete}
      >
        ✕
      </button>
    </li>
  );
}

export default function TabsManager({ activeTabId }: { activeTabId: string }) {
  const { data, mutate } = usePortfolioData();
  const [open, setOpen] = useState(false);

  const sensors = useEditorSensors();

  function reorderTabs(from: number, to: number) {
    mutate((current) => ({
      ...current,
      tabs: arrayMove(current.tabs, from, to),
    }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = data.tabs.findIndex((tab) => tab.id === active.id);
    const to = data.tabs.findIndex((tab) => tab.id === over.id);
    if (from === -1 || to === -1) return;

    reorderTabs(from, to);
  }

  function addTab() {
    mutate((current) => ({
      ...current,
      tabs: [
        ...current.tabs,
        { id: crypto.randomUUID(), label: 'New tab', blocks: [] },
      ],
    }));
  }

  function renameTab(tabId: string, label: string) {
    mutate((current) => ({
      ...current,
      tabs: current.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, label } : tab,
      ),
    }));
  }

  function deleteTab(tabId: string) {
    mutate((current) =>
      current.tabs.length <= 1
        ? current
        : {
            ...current,
            tabs: current.tabs.filter((tab) => tab.id !== tabId),
          },
    );
  }

  return (
    <section
      aria-label="Manage tabs"
      className="rounded-skin border border-dashed border-[var(--border)] p-2"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-1.5 text-left text-[10px] font-medium uppercase tracking-wide opacity-50 hover:opacity-80"
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        Manage tabs
        <span className="ml-auto normal-case tracking-normal">
          ({data.tabs.length})
        </span>
      </button>

      {open && (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
        <SortableContext
          items={data.tabs.map((tab) => tab.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="mt-1.5 space-y-1.5">
            {data.tabs.map((tab) => (
              <SortableTabRow
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                canDelete={data.tabs.length > 1}
                onRename={(label) => renameTab(tab.id, label)}
                onDelete={() => deleteTab(tab.id)}
              />
            ))}
          </ul>
          </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={addTab}
            className="mt-1.5 rounded-skin border border-dashed border-[var(--border)] px-2.5 py-1 text-xs opacity-70 hover:border-accent hover:text-accent hover:opacity-100"
          >
            + Add tab
          </button>
        </>
      )}
    </section>
  );
}
