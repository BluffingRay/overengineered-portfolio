'use client';

import { useEffect, useRef, useState } from 'react';
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  AppCardItem,
  AppGridBlock,
  PrimaryAction,
} from '@/types/schema';
import { PRIMARY_ACTIONS } from '@/types/schema';
import { ACTION_LABELS, DRAG_HANDLE, Field, INPUT, ROW_BTN } from '../editor-shared';
import IconPicker from '../IconPicker';

function SortableAppCard({
  app,
  isOpen,
  onToggle,
  onPatch,
  onDuplicate,
  onRemove,
}: {
  app: AppCardItem;
  isOpen: boolean;
  onToggle: () => void;
  onPatch: (p: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-skin border border-dashed border-[var(--border)] ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 p-1.5">
        <button
          type="button"
          aria-label={`Drag to reorder ${app.name}`}
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
          <span className="truncate text-sm font-medium">{app.name}</span>
        </button>
        <button
          type="button"
          aria-label={`Duplicate ${app.name}`}
          title="Duplicate card"
          className={ROW_BTN}
          onClick={onDuplicate}
        >
          ⧉
        </button>
        <button
          type="button"
          aria-label={`Remove ${app.name}`}
          className={`${ROW_BTN} hover:!text-red-500`}
          onClick={onRemove}
        >
          ✕
        </button>
      </div>

      {isOpen && (
        <div className="space-y-2 border-t border-[var(--border)] p-2">
          <textarea
            value={app.description}
            onChange={(e) => onPatch({ description: e.target.value })}
            aria-label={`Description for ${app.name}`}
            placeholder="Description"
            rows={2}
            className={`${INPUT} resize-y leading-relaxed`}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Name">
                <input
                  value={app.name}
                  onChange={(e) => onPatch({ name: e.target.value })}
                  className={`${INPUT} font-medium`}
                />
              </Field>
            </div>
            <Field label="Link">
              <input
                value={app.href}
                onChange={(e) => onPatch({ href: e.target.value })}
                className={`${INPUT} font-mono text-xs`}
              />
            </Field>
            <Field label="Primary action">
              <select
                value={app.primaryAction ?? 'href'}
                onChange={(e) =>
                  onPatch({ primaryAction: e.target.value as PrimaryAction })
                }
                className={INPUT}
              >
                {PRIMARY_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {ACTION_LABELS[action]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <input
                value={app.category ?? ''}
                onChange={(e) =>
                  onPatch({ category: e.target.value || undefined })
                }
                placeholder="Web App"
                className={INPUT}
              />
            </Field>
            <Field label="Cover image URL">
              <input
                value={app.coverImage ?? ''}
                onChange={(e) =>
                  onPatch({ coverImage: e.target.value || undefined })
                }
                placeholder="/images/…"
                className={`${INPUT} font-mono text-xs`}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Icon">
                <IconPicker
                  value={app.icon}
                  appName={app.name}
                  onChange={(next) => onPatch({ icon: next })}
                />
              </Field>
            </div>
            <Field label="Demo URL (optional)">
              <input
                value={app.demoUrl ?? ''}
                onChange={(e) =>
                  onPatch({ demoUrl: e.target.value || undefined })
                }
                placeholder="—"
                className={`${INPUT} font-mono text-xs`}
              />
            </Field>
            <Field label="GitHub URL (optional)">
              <input
                value={app.githubUrl ?? ''}
                onChange={(e) =>
                  onPatch({ githubUrl: e.target.value || undefined })
                }
                placeholder="—"
                className={`${INPUT} font-mono text-xs`}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Tags (comma-separated)">
                <TagsInput
                  tags={app.tags}
                  onChange={(next) => onPatch({ tags: next })}
                />
              </Field>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

interface Props {
  block: AppGridBlock;
  patch: (p: Record<string, unknown>) => void;
  patchApp: (appId: string, p: Record<string, unknown>) => void;
  removeApp: (appId: string) => void;
  duplicateApp: (appId: string) => void;
  addApp: () => void;
  reorderApps: (from: number, to: number) => void;
}

function TagsInput({
  tags,
  onChange,
}: {
  tags?: string[];
  onChange: (next: string[] | undefined) => void;
}) {
  const [draft, setDraft] = useState(tags?.join(', ') ?? '');
  const committedRef = useRef(tags?.join(', ') ?? '');

  useEffect(() => {
    const external = tags?.join(', ') ?? '';
    if (external !== committedRef.current) {
      committedRef.current = external;
      setDraft(external);
    }
  }, [tags]);

  function handleChange(raw: string) {
    setDraft(raw);

    const parsed = raw
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const next = parsed.length > 0 ? parsed : undefined;

    committedRef.current = next?.join(', ') ?? '';
    onChange(next);
  }

  return (
    <input
      value={draft}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="react, local-first"
      aria-label="Tags (comma-separated)"
      className={INPUT}
    />
  );
}

export default function AppGridForm({
  block,
  patch,
  patchApp,
  removeApp,
  duplicateApp,
  addApp,
  reorderApps,
}: Props) {
  const [openAppId, setOpenAppId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = block.apps.findIndex((app) => app.id === active.id);
    const to = block.apps.findIndex((app) => app.id === over.id);
    if (from === -1 || to === -1) return;

    reorderApps(from, to);
  }

  return (
    <div className="space-y-3">
      <Field label="Grid title">
        <input
          value={block.title}
          onChange={(e) => patch({ title: e.target.value })}
          className={INPUT}
        />
      </Field>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={block.apps.map((app) => app.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {block.apps.map((app) => (
              <SortableAppCard
                key={app.id}
                app={app}
                isOpen={openAppId === app.id}
                onToggle={() =>
                  setOpenAppId(openAppId === app.id ? null : app.id)
                }
                onPatch={(p) => patchApp(app.id, p)}
                onDuplicate={() => duplicateApp(app.id)}
                onRemove={() => removeApp(app.id)}/>
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={() => {
          addApp();
          setOpenAppId(null);
        }}
        className="rounded-skin border border-dashed border-[var(--border)] px-2.5 py-1 text-xs opacity-70 transition-opacity hover:border-accent hover:text-accent hover:opacity-100"
      >
        + Add app card
      </button>
    </div>
  );
}
