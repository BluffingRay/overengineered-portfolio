'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ENTRY_LIST_COLUMNS, ENTRY_LIST_PRESETS } from '@/types/schema';
import type { EntryListItem, EntryListBlock } from '@/types/schema';
import { useState } from 'react';
import {
  BlockDesignPicker,
  DRAG_HANDLE,
  ENTRY_LIST_FIELD_LABELS,
  ENTRY_LIST_PRESET_LABELS,
  Field,
  INPUT,
  ROW_BTN,
  useTrimmedCommit,
} from '../editor-shared';
import type { EntryListFieldLabels } from '../editor-shared';

interface Props {
  block: EntryListBlock;
  patch: (p: Record<string, unknown>) => void;
}

/** One bordered mini-card: drag handle + collapsible header + remove;
    fields reveal on expand (the app-grid card idiom) so a long list
    never bloats the block row. */
function SortableEntry({
  entry,
  labels,
  isOpen,
  onToggle,
  onPatch,
  onRemove,
}: {
  entry: EntryListItem;
  labels: EntryListFieldLabels;
  isOpen: boolean;
  onToggle: () => void;
  onPatch: (p: Partial<EntryListItem>) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  // House echo-guard: free typing while focused, trim-or-clear on blur;
  // optional fields commit undefined when empty (absent, never null).
  const title = useTrimmedCommit(entry.title, (next) =>
    onPatch({ title: next ?? '' }),
  );
  const subtitle = useTrimmedCommit(entry.subtitle, (next) =>
    onPatch({ subtitle: next }),
  );
  const meta = useTrimmedCommit(entry.meta, (next) => onPatch({ meta: next }));
  const description = useTrimmedCommit(entry.description, (next) =>
    onPatch({ description: next }),
  );
  const link = useTrimmedCommit(entry.link, (next) => onPatch({ link: next }));

  const name = entry.title || 'entry';

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-skin border border-dashed border-[var(--border)] p-2 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`Drag to reorder ${name}`}
          className={DRAG_HANDLE}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <span className="opacity-50">{isOpen ? '▾' : '▸'}</span>
          <span className="truncate text-sm font-medium">
            {entry.title || 'Untitled'}
          </span>
        </button>
        <button
          type="button"
          aria-label={`Remove ${name}`}
          title="Remove entry"
          className={`${ROW_BTN} hover:!text-red-500`}
          onClick={onRemove}
        >
          ✕
        </button>
      </div>

      {isOpen && (
        <div className="mt-1.5 space-y-1.5">
        <Field label={labels.title}>
          <input
            value={title.draft}
            onChange={(e) => title.onChange(e.target.value)}
            onBlur={title.onBlur}
            className={`${INPUT} font-medium`}
          />
        </Field>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <Field label={labels.subtitle}>
            <input
              value={subtitle.draft}
              onChange={(e) => subtitle.onChange(e.target.value)}
              onBlur={subtitle.onBlur}
              className={INPUT}
            />
          </Field>
          <Field label={labels.meta}>
            <input
              value={meta.draft}
              onChange={(e) => meta.onChange(e.target.value)}
              onBlur={meta.onBlur}
              placeholder="2024 — Now"
              className={INPUT}
            />
          </Field>
        </div>
        <Field label={labels.description}>
          <textarea
            value={description.draft}
            onChange={(e) => description.onChange(e.target.value)}
            onBlur={description.onBlur}
            rows={2}
            className={`${INPUT} resize-y leading-relaxed`}
          />
        </Field>
        <Field label="Link (optional — opens on the title)">
          <input
            value={link.draft}
            onChange={(e) => link.onChange(e.target.value)}
            onBlur={link.onBlur}
            placeholder="https://…"
            className={`${INPUT} font-mono text-xs`}
          />
        </Field>
        </div>
      )}
    </li>
  );
}

export default function EntryListForm({ block, patch }: Props) {
  const preset = block.preset ?? 'experience';
  const labels = ENTRY_LIST_FIELD_LABELS[preset];
  // One entry expanded at a time (app-grid idiom) — a long list keeps
  // the block row compact and draggable.
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const titleField = useTrimmedCommit(block.title, (title) => patch({ title }));

  function setEntries(entries: EntryListItem[]) {
    patch({ entries });
  }

  function patchEntry(entryId: string, p: Partial<EntryListItem>) {
    setEntries(
      block.entries.map((entry) => (entry.id === entryId ? { ...entry, ...p } : entry)),
    );
  }

  function removeEntry(entryId: string) {
    setEntries(block.entries.filter((entry) => entry.id !== entryId));
  }

  function addEntry() {
    const id = crypto.randomUUID();
    setEntries([...block.entries, { id, title: '' }]);
    setOpenEntryId(id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = block.entries.findIndex((entry) => entry.id === active.id);
    const to = block.entries.findIndex((entry) => entry.id === over.id);
    if (from === -1 || to === -1) return;

    setEntries(arrayMove(block.entries, from, to));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium opacity-50">Design</span>
        <BlockDesignPicker
          value={block.design}
          onChange={(design) => patch({ design })}
        />
      </div>

      <Field label="Preset">
        <div className="inline-flex overflow-hidden rounded-skin border border-[var(--border)]">
          {ENTRY_LIST_PRESETS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={preset === option}
              onClick={() =>
                patch({ preset: preset === option ? undefined : option })
              }
              className={`px-2.5 py-1 text-xs font-medium ${
                preset === option
                  ? 'bg-accent text-background'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              {ENTRY_LIST_PRESET_LABELS[option]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Section title (optional — blank hides the heading)">
        <input
          value={titleField.draft}
          onChange={(e) => titleField.onChange(e.target.value)}
          onBlur={titleField.onBlur}
          placeholder="Experience"
          className={INPUT}
        />
      </Field>

      <Field label="Columns">
        <div className="inline-flex overflow-hidden rounded-skin border border-[var(--border)]">
          {ENTRY_LIST_COLUMNS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={(block.columns ?? 1) === option}
              onClick={() =>
                patch({ columns: (block.columns ?? 1) === option ? undefined : option })
              }
              className={`px-2.5 py-1 text-xs font-medium ${
                (block.columns ?? 1) === option
                  ? 'bg-accent text-background'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              {option === 1 ? 'One' : option === 2 ? 'Two' : 'Three'}
            </button>
          ))}
        </div>
      </Field>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={block.entries.map((entry) => entry.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {block.entries.map((entry) => (
              <SortableEntry
                key={entry.id}
                entry={entry}
                labels={labels}
                isOpen={openEntryId === entry.id}
                onToggle={() =>
                  setOpenEntryId(openEntryId === entry.id ? null : entry.id)
                }
                onPatch={(p) => patchEntry(entry.id, p)}
                onRemove={() => removeEntry(entry.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {block.entries.length === 0 && (
        <p className="text-xs opacity-50">No entries yet — add one below.</p>
      )}

      <button
        type="button"
        onClick={addEntry}
        className="rounded-skin border border-dashed border-[var(--border)] px-2.5 py-1 text-xs opacity-70 hover:border-accent hover:text-accent hover:opacity-100"
      >
        + Add entry
      </button>
    </div>
  );
}
