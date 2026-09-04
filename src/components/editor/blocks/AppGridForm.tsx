'use client';

import { useMemo, useState } from 'react';
import { useCommittedValue } from '@/hooks/useCommittedValue';
import MediaPicker from '@/components/editor/MediaPicker';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useEditorSensors } from '@/hooks/useEditorSensors';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  AppCardItem,
  AppGridBlock,
  Post,
  PrimaryAction,
} from '@/types/schema';
import { PRIMARY_ACTIONS } from '@/types/schema';
import { ACTION_LABELS, BlockDesignPicker, DRAG_HANDLE, Field, INPUT, ROW_BTN } from '../editor-shared';
import IconPicker from '../IconPicker';

function SortableAppCard({
  card,
  posts,
  usageCount,
  isOpen,
  onToggle,
  onPatch,
  onOpenCoverPicker,
  onDuplicateAsNew,
  onDetach,
  onDeleteEverywhere,
}: {
  card: AppCardItem;
  /** Posts (drafts included) offered as on-site link targets, newest first. */
  posts: Post[];
  usageCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onPatch: (p: Record<string, unknown>) => void;
  onOpenCoverPicker: () => void;
  onDuplicateAsNew: () => void;
  onDetach: () => void;
  onDeleteEverywhere: () => void;
}) {
  const [blogsOpen, setBlogsOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

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
          aria-label={`Drag to reorder ${card.name}`}
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
          <span className="truncate text-sm font-medium">{card.name}</span>
          {usageCount > 1 && (
            <span
              title={`Linked card — used in ${usageCount} places. Edits here propagate everywhere.`}
              className="shrink-0 rounded-full border border-accent/40 px-1.5 py-px text-[10px] text-accent"
            >
              linked ×{usageCount}
            </span>
          )}
        </button>
        <button
          type="button"
          aria-label={`Duplicate ${card.name} as an independent card`}
          title="Duplicate as new independent card"
          className={ROW_BTN}
          onClick={onDuplicateAsNew}
        >
          ⧉
        </button>
        <button
          type="button"
          aria-label={`Unlink ${card.name} from this grid`}
          title="Unlink from this grid (card stays in the library)"
          className={`${ROW_BTN} hover:!text-red-500`}
          onClick={onDetach}
        >
          ✕
        </button>
      </div>

      {isOpen && (
        <div className="space-y-2 border-t border-[var(--border)] p-2">
          <textarea
            value={card.description}
            onChange={(e) => onPatch({ description: e.target.value })}
            aria-label={`Description for ${card.name}`}
            placeholder="Description"
            rows={2}
            className={`${INPUT} resize-y leading-relaxed`}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Name">
                <input
                  value={card.name}
                  onChange={(e) => onPatch({ name: e.target.value })}
                  className={`${INPUT} font-medium`}
                />
              </Field>
            </div>
            <Field label="Link">
              <input
                value={card.href}
                onChange={(e) => onPatch({ href: e.target.value })}
                className={`${INPUT} font-mono text-xs`}
              />
            </Field>
            <Field label="Primary action">
              <select
                value={card.primaryAction ?? 'href'}
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
                value={card.category ?? ''}
                onChange={(e) =>
                  onPatch({ category: e.target.value || undefined })
                }
                placeholder="Web App"
                className={INPUT}
              />
            </Field>
            <Field label="Cover image URL">
              <div className="flex gap-1.5">
                <input
                  value={card.coverImage ?? ''}
                  onChange={(e) =>
                    onPatch({ coverImage: e.target.value || undefined })
                  }
                  placeholder="/images/…"
                  className={`${INPUT} min-w-0 flex-1 font-mono text-xs`}
                />
                <button
                  type="button"
                  onClick={onOpenCoverPicker}
                  className="shrink-0 rounded-skin border border-[var(--border)] px-2 py-1 text-xs font-medium opacity-70 hover:opacity-100"
                >
                  Library
                </button>
              </div>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Icon">
                <IconPicker
                  value={card.icon}
                  appName={card.name}
                  onChange={(next) => onPatch({ icon: next })}
                />
              </Field>
            </div>
            <Field label="Demo URL (optional)">
              <input
                value={card.demoUrl ?? ''}
                onChange={(e) =>
                  onPatch({ demoUrl: e.target.value || undefined })
                }
                placeholder="—"
                className={`${INPUT} font-mono text-xs`}
              />
            </Field>
            <Field label="GitHub URL (optional)">
              <input
                value={card.githubUrl ?? ''}
                onChange={(e) =>
                  onPatch({ githubUrl: e.target.value || undefined })
                }
                placeholder="—"
                className={`${INPUT} font-mono text-xs`}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Custom link">
                <div className="flex flex-wrap gap-1.5">
                  <input
                    value={card.customLabel ?? ''}
                    onChange={(e) =>
                      onPatch({ customLabel: e.target.value || undefined })
                    }
                    placeholder="Paper, Blog, View…"
                    className={`${INPUT} min-w-0 flex-1`}
                  />
                  <input
                    value={card.customPostId ? '' : (card.customUrl ?? '')}
                    disabled={card.customPostId !== undefined}
                    onChange={(e) =>
                      onPatch({
                        customUrl: e.target.value || undefined,
                        customPostId: undefined,
                      })
                    }
                    placeholder={
                      card.customPostId ? 'linked to blog post' : 'https://…'
                    }
                    className={`${INPUT} min-w-0 flex-1 font-mono text-xs`}
                  />
                  <button
                    type="button"
                    aria-expanded={blogsOpen}
                    onClick={() => setBlogsOpen((state) => !state)}
                    className="shrink-0 rounded-skin border border-[var(--border)] px-2 py-1 text-xs font-medium opacity-70 hover:opacity-100"
                  >
                    Open blogs ▾
                  </button>
                </div>

                {blogsOpen && (
                  <div className="mt-1.5 space-y-1 rounded-skin border border-[var(--border)] p-2">
                    <ul className="max-h-40 space-y-1 overflow-y-auto">
                      <li>
                        <button
                          type="button"
                          onClick={() => onPatch({ customPostId: undefined })}
                          className={`flex w-full items-center gap-2 rounded-skin border px-1.5 py-1 text-left text-xs ${
                            !card.customPostId
                              ? 'border-accent/50 bg-current/5'
                              : 'border-transparent hover:border-current/20 hover:bg-current/5'
                          }`}
                        >
                          <span className="truncate">None — plain URL</span>
                          {!card.customPostId && (
                            <span className="ml-auto shrink-0 text-accent">✓</span>
                          )}
                        </button>
                      </li>
                      {posts.map((post) => {
                        const isActive = card.customPostId === post.id;

                        return (
                          <li key={post.id}>
                            <button
                              type="button"
                              onClick={() =>
                                onPatch({
                                  customPostId: post.id,
                                  customUrl: undefined,
                                })
                              }
                              className={`flex w-full items-center gap-2 rounded-skin border px-1.5 py-1 text-left text-xs ${
                                isActive
                                  ? 'border-accent/50 bg-current/5'
                                  : 'border-transparent hover:border-current/20 hover:bg-current/5'
                              }`}
                            >
                              <span className="truncate">
                                {post.title}
                                {post.status === 'draft' && (
                                  <span className="ml-2 rounded-full border border-current/25 px-1.5 py-px text-[9px] uppercase tracking-wide opacity-60">
                                    draft
                                  </span>
                                )}
                              </span>
                              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                                {isActive && (
                                  <span className="text-accent">✓</span>
                                )}
                                {post.publishedAt && (
                                  <span className="font-mono text-[10px] opacity-50">
                                    {post.publishedAt.slice(0, 10)}
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <p className="mt-0.5 text-[10px] opacity-50">
                  Binding a blog makes the card link open that post on-site;
                  typing a URL replaces it. The label names the link (“Paper”,
                  “Blog”, “View”…).
                </p>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Tags (comma-separated)">
                <TagsInput
                  tags={card.tags}
                  onChange={(next) => onPatch({ tags: next })}
                />
              </Field>
            </div>
          </div>

          {usageCount > 0 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
              <span className="text-[10px] opacity-50">
                Linked in {usageCount === 1 ? '1 place' : `${usageCount} places`} — edits apply everywhere.
              </span>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete “${card.name}” from the library and every grid that references it?`,
                    )
                  ) {
                    onDeleteEverywhere();
                  }
                }}
                className="rounded-skin border border-dashed border-red-500/40 px-2 py-0.5 text-[11px] opacity-60 hover:border-red-500 hover:text-red-500 hover:opacity-100"
              >
                🗑 Delete everywhere
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

interface Props {
  block: AppGridBlock;
  cards: AppCardItem[];
  /** All posts (drafts included) — offered as custom-link targets. */
  posts: Post[];
  /** How many grids reference each card id (computed upstream). */
  usageCounts: Record<string, number>;
  patch: (p: Record<string, unknown>) => void;
  patchCard: (cardId: string, p: Record<string, unknown>) => void;
  detachApp: (cardId: string) => void;
  deleteCardGlobal: (cardId: string) => void;
  duplicateAsNew: (cardId: string) => void;
  addNewCard: () => void;
  attachExisting: (cardId: string, atIndex?: number) => void;
  reorderApps: (from: number, to: number) => void;
}

function TagsInput({
  tags,
  onChange,
}: {
  tags?: string[];
  onChange: (next: string[] | undefined) => void;
}) {
  const { draft, onChange: handleChange } = useCommittedValue(
    tags,
    onChange,
    (v) => v?.join(', ') ?? '',
    (draft) => {
      const parsed = draft
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      return parsed.length > 0 ? parsed : undefined;
    },
  );

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
  cards,
  posts,
  usageCounts,
  patch,
  patchCard,
  detachApp,
  deleteCardGlobal,
  duplicateAsNew,
  addNewCard,
  attachExisting,
  reorderApps,
}: Props) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [coverPickerCardId, setCoverPickerCardId] = useState<string | null>(null);

  const sensors = useEditorSensors();

  const cardById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  // Newest first: publishedAt desc, then id desc (matches PostAdmin's recency heuristic).
  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) =>
          (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') ||
          b.id.localeCompare(a.id),
      ),
    [posts],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = block.apps.indexOf(active.id as string);
    const to = block.apps.indexOf(over.id as string);
    if (from === -1 || to === -1) return;

    reorderApps(from, to);
  }

  const availableCards = useMemo(
    () =>
      cards.filter(
        (card) =>
          !block.apps.includes(card.id) &&
          card.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()),
      ),
    [cards, block.apps, pickerQuery],
  );

  return (
    <div className="space-y-3">
      <Field label="Grid title">
        <input
          value={block.title}
          onChange={(e) => patch({ title: e.target.value })}
          className={INPUT}
        />
      </Field>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium opacity-50">Design</span>
        <BlockDesignPicker
          value={block.design}
          onChange={(design) => patch({ design })}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={block.apps}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {block.apps.map((cardId) => {
              const card = cardById.get(cardId);
              if (!card) return null; // sanitizer removes dangling refs

              return (
                <SortableAppCard
                  key={cardId}
                  card={card}
                  posts={sortedPosts}
                  usageCount={usageCounts[cardId] ?? 1}
                  isOpen={openCardId === cardId}
                  onToggle={() =>
                    setOpenCardId(openCardId === cardId ? null : cardId)
                  }
                  onPatch={(p) => patchCard(cardId, p)}
                  onOpenCoverPicker={() => setCoverPickerCardId(cardId)}
                  onDuplicateAsNew={() => duplicateAsNew(cardId)}
                  onDetach={() => detachApp(cardId)}
                  onDeleteEverywhere={() => {
                    deleteCardGlobal(cardId);
                    setOpenCardId(null);
                  }}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      {block.apps.length === 0 && (
        <p className="text-xs opacity-50">
          Empty grid — add a new card or pick one from the library below.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            addNewCard();
            setOpenCardId(null);
          }}
          className="rounded-skin border border-dashed border-[var(--border)] px-2.5 py-1 text-xs opacity-70 hover:border-accent hover:text-accent hover:opacity-100"
        >
          + New card
        </button>
        <button
          type="button"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((state) => !state)}
          className="rounded-skin border border-dashed border-[var(--border)] px-2.5 py-1 text-xs opacity-70 hover:border-accent hover:text-accent hover:opacity-100"
        >
          + From library…
        </button>
      </div>

      {pickerOpen && (
        <div className="space-y-2 rounded-skin border border-[var(--border)] p-2">
          <input
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Search library…"
            aria-label="Search card library"
            className={`${INPUT} text-xs`}
          />
          {availableCards.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {availableCards.map((card) => (
                <li key={card.id}>
                  <button
                    type="button"
                    onClick={() => {
                      attachExisting(card.id);
                      setPickerOpen(false);
                      setPickerQuery('');
                    }}
                    className="flex w-full items-center gap-2 rounded-skin border border-transparent px-1.5 py-1 text-left text-xs hover:border-current/20 hover:bg-current/5"
                  >
                    <span className="truncate font-medium">{card.name}</span>
                    {(usageCounts[card.id] ?? 0) > 0 && (
                      <span className="ml-auto shrink-0 opacity-50">
                        used ×{usageCounts[card.id]}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-1 text-center text-xs opacity-50">
              {cards.length === 0
                ? 'Library is empty — create a card first.'
                : 'No unattached cards match.'}
            </p>
          )}
        </div>
      )}
      <MediaPicker
        open={coverPickerCardId !== null}
        onClose={() => setCoverPickerCardId(null)}
        onSelect={(url) => {
          if (coverPickerCardId) patchCard(coverPickerCardId, { coverImage: url });
        }}
      />
    </div>
  );
}
