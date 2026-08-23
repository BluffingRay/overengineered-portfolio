'use client';

import { useState } from 'react';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SPACINGS } from '@/types/schema';
import type { Block } from '@/types/schema';
import { useBlockMutations } from '@/hooks/useBlockMutations';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import {
  BLOCK_LABELS,
  BlockWidthPicker,
  SPACING_GLYPHS,
  SPACING_LABELS,
  createDefaultApp,
  createDefaultBlock,
  duplicateBlock,
  nextSpacing,
} from './editor-shared';
import SortableBlockRow from './SortableBlockRow';
import HeroForm from './blocks/HeroForm';
import AppGridForm from './blocks/AppGridForm';
import MarqueeForm from './blocks/MarqueeForm';
import BlogForm from './blocks/BlogForm';
import RichTextForm from './RichTextForm';

interface Props {
  activeTabId: string;
}

export default function BlockList({ activeTabId }: Props) {
  const { data } = usePortfolioData();
  const {
    updateBlocks,
    updateBlock,
    moveBlockToTab,
    updateAppsOf,
    updateCard,
    addCardToGrid,
    detachApp,
    deleteCardGlobally,
    attachCardToGrid,
    duplicateAsIndependent,
  } = useBlockMutations(activeTabId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const usageCounts: Record<string, number> = {};
  for (const tab of data.tabs) {
    for (const block of tab.blocks) {
      if (block.type !== 'app_grid') continue;
      for (const cardId of block.apps) {
        usageCounts[cardId] = (usageCounts[cardId] ?? 0) + 1;
      }
    }
  }

  const activeTab = data.tabs.find((tab) => tab.id === activeTabId);
  if (!activeTab) return null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    updateBlocks((blocks) => {
      const from = blocks.findIndex((b) => b.id === active.id);
      const to = blocks.findIndex((b) => b.id === over.id);
      if (from === -1 || to === -1) return blocks;
      return arrayMove(blocks, from, to);
    });
  }

  function renderBody(block: Block) {
    switch (block.type) {
      case 'featured_hero':
        return (
          <HeroForm
            block={block}
            tabs={data.tabs}
            patch={(p) => updateBlock(block.id, p)}
          />
        );
      case 'app_grid':
        return (
          <AppGridForm
            block={block}
            cards={data.cards}
            posts={data.posts ?? []}
            usageCounts={usageCounts}
            patch={(p) => updateBlock(block.id, p)}
            patchCard={(cardId, p) => updateCard(cardId, p)}
            detachApp={(cardId) => detachApp(block.id, cardId)}
            deleteCardGlobal={deleteCardGlobally}
            duplicateAsNew={(cardId) =>
              duplicateAsIndependent(block.id, cardId)
            }
            addNewCard={() => addCardToGrid(block.id, createDefaultApp())}
            attachExisting={(cardId, atIndex) =>
              attachCardToGrid(block.id, cardId, atIndex)
            }
            reorderApps={(from, to) =>
              updateAppsOf(block.id, (apps) => arrayMove(apps, from, to))
            }
          />
        );
      case 'marquee':
        return (
          <MarqueeForm block={block} patch={(p) => updateBlock(block.id, p)} />
        );
      case 'blog':
        return <BlogForm block={block} patch={(p) => updateBlock(block.id, p)} />;
      case 'rich_text':
        return (
          <RichTextForm
            block={block}
            patch={(p) => updateBlock(block.id, p)}
          />
        );
      case 'custom_html':
        return (
          <div className="space-y-1.5">
            <BlockWidthPicker
              value={block.width}
              onChange={(width) => updateBlock(block.id, { width })}
            />
            <textarea
              value={block.html}
              onChange={(event) =>
                updateBlock(block.id, { html: event.target.value })
              }
              rows={4}
              spellCheck={false}
              aria-label="Custom HTML source"
              className="w-full resize-y rounded-skin border border-[var(--border)] bg-background px-2 py-1 font-mono text-xs leading-relaxed"
            />
          </div>
        );
    }
  }

  return (
    <>
      <h2 className="mt-4 text-xs font-semibold uppercase tracking-wider opacity-60">
        Editing “{activeTab.label}”
      </h2>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={activeTab.blocks.map((block) => block.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="mt-3 space-y-1.5">
            {activeTab.blocks.map((block, index) => {
              const spacing = block.spacing ?? 'normal';

              return (
                <SortableBlockRow
                  key={block.id}
                  block={block}
                  index={index}
                  count={activeTab.blocks.length}
                  isExpanded={expandedId === block.id}
                  spacingGlyph={SPACING_GLYPHS[spacing]}
                  spacingTitle={SPACING_LABELS[spacing]}
                  onToggle={() =>
                    setExpandedId(expandedId === block.id ? null : block.id)
                  }
                  onMove={(direction) =>
                    updateBlocks((blocks) => {
                      const next = [...blocks];
                      const targetIndex = index + direction;
                      if (targetIndex < 0 || targetIndex >= next.length) {
                        return blocks;
                      }
                      [next[index], next[targetIndex]] = [
                        next[targetIndex],
                        next[index],
                      ];
                      return next;
                    })
                  }
                  onDuplicate={() =>
                    updateBlocks((blocks) => {
                      const from = blocks.findIndex(
                        (candidate) => candidate.id === block.id,
                      );
                      if (from === -1) return blocks;
                      const next = [...blocks];
                      next.splice(from + 1, 0, duplicateBlock(block));
                      return next;
                    })
                  }
                  onRemove={() =>
                    updateBlocks((blocks) =>
                      blocks.filter((candidate) => candidate.id !== block.id),
                    )
                  }
                  onCycleSpacing={() =>
                    updateBlock(block.id, {
                      spacing: (() => {
                        const candidate = nextSpacing(spacing);
                        return candidate === 'normal' ? undefined : candidate;
                      })(),
                    })
                  }
                >
                  {expandedId === block.id && (
                    <>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-wide opacity-50">
                          Spacing
                        </span>
                        <div className="flex rounded-skin border border-[var(--border)] p-0.5">
                          {SPACINGS.map((option) => {
                            const isActive = spacing === option;

                            return (
                              <button
                                key={option}
                                type="button"
                                title={`Spacing: ${SPACING_LABELS[option]}`}
                                aria-pressed={isActive}
                                onClick={() =>
                                  updateBlock(block.id, {
                                    spacing:
                                      option === 'normal' ? undefined : option,
                                  })
                                }
                                className={`rounded-[calc(var(--radius)-0.15rem)] px-2 py-0.5 text-[10px] capitalize ${
                                  isActive
                                    ? 'bg-accent text-background'
                                    : 'opacity-60 hover:opacity-100'
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-wide opacity-50">
                          Move to
                        </span>
                        <select
                          value=""
                          onChange={(event) => {
                            if (event.target.value) {
                              moveBlockToTab(block.id, event.target.value);
                            }
                          }}
                          aria-label="Move this block to another tab"
                          className="rounded-skin border border-[var(--border)] bg-background px-2 py-0.5 text-xs"
                        >
                          <option value="" disabled>
                            Choose tab…
                          </option>
                          {data.tabs
                            .filter((tab) => tab.id !== activeTabId)
                            .map((tab) => (
                              <option key={tab.id} value={tab.id}>
                                {tab.label}
                              </option>
                            ))}
                        </select>
                      </div>
                      {renderBody(block)}
                    </>
                  )}
                </SortableBlockRow>
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(Object.keys(BLOCK_LABELS) as Array<keyof typeof BLOCK_LABELS>).map(
          (type) => (
            <button
              key={type}
              type="button"
              className="rounded-skin border border-dashed border-[var(--border)] px-2.5 py-1 text-xs opacity-70 hover:border-accent hover:text-accent hover:opacity-100"
              onClick={() =>
                updateBlocks((blocks) => [...blocks, createDefaultBlock(type)])
              }
            >
              + {BLOCK_LABELS[type]}
            </button>
          ),
        )}
      </div>
    </>
  );
}
