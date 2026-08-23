'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Block } from '@/types/schema';
import {
  BLOCK_ICONS,
  BLOCK_LABELS,
  DRAG_HANDLE,
  ROW_BTN,
} from './editor-shared';

interface Props {
  block: Block;
  index: number;
  count: number;
  isExpanded: boolean;
  spacingGlyph: string;
  spacingTitle: string;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onCycleSpacing: () => void;
  children: React.ReactNode;
}

export default function SortableBlockRow({
  block,
  index,
  count,
  isExpanded,
  spacingGlyph,
  spacingTitle,
  onToggle,
  onMove,
  onDuplicate,
  onRemove,
  onCycleSpacing,
  children,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-skin border border-[var(--border)] bg-background ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <button
          type="button"
          aria-label={`Drag to reorder ${BLOCK_LABELS[block.type]}`}
          className={DRAG_HANDLE}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={onToggle}
          className="flex items-center gap-1.5 text-left text-sm font-medium hover:opacity-70"
        >
          <span className="opacity-50">{isExpanded ? '▾' : '▸'}</span>
          {(() => {
            const TypeIcon = BLOCK_ICONS[block.type];
            return TypeIcon ? (
              <TypeIcon
                className="h-3.5 w-3.5 shrink-0 text-accent"
                aria-hidden="true"
              />
            ) : null;
          })()}
          {BLOCK_LABELS[block.type]}
        </button>
        <code className="text-[10px] opacity-40">{block.id}</code>

        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onCycleSpacing}
            title={`Spacing: ${spacingTitle} (click to cycle)`}
            aria-label={`Spacing: ${spacingTitle}. Click to cycle`}
            className={ROW_BTN}
          >
            {spacingGlyph}
          </button>
          <button
            type="button"
            aria-label="Move block up"
            className={ROW_BTN}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move block down"
            className={ROW_BTN}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </button>
          <button
            type="button"
            aria-label={`Duplicate ${BLOCK_LABELS[block.type]} block`}
            title="Duplicate block"
            className={ROW_BTN}
            onClick={onDuplicate}
          >
            ⧉
          </button>
          <button
            type="button"
            aria-label={`Remove ${BLOCK_LABELS[block.type]} block`}
            className={`${ROW_BTN} hover:!text-red-500`}
            onClick={onRemove}
          >
            ✕
          </button>
        </span>
      </div>

      {isExpanded && (
        <div className="border-l-2 border-l-accent/40 border-t border-t-[var(--border)] bg-surface p-2">
          {children}
        </div>
      )}
    </li>
  );
}
