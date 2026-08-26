'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MarqueeBlock } from '@/types/schema';
import { MARQUEE_SPEEDS } from '@/types/schema';
import {
  BlockDesignPicker,
  Checkbox,
  Field,
  INPUT,
  SPEED_LABELS,
} from '../editor-shared';

interface Props {
  block: MarqueeBlock;
  patch: (p: Record<string, unknown>) => void;
}

export default function MarqueeForm({ block, patch }: Props) {
  const itemsKey = block.items.join('\n');
  const [draft, setDraft] = useState(itemsKey);
  const seedRef = useRef(itemsKey);

  // When the store changes from outside (undo, add block), reseed the draft.
  useEffect(() => {
    if (itemsKey !== seedRef.current) {
      seedRef.current = itemsKey;
      setDraft(itemsKey);
    }
  }, [itemsKey]);

  const commit = useCallback(
    (raw: string) => {
      const items = raw
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
      seedRef.current = items.join('\n');
      patch({ items });
    },
    [patch],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium opacity-50">Design</span>
        <BlockDesignPicker
          value={block.design}
          onChange={(design) => patch({ design })}
        />
      </div>
      <Field label="Items (one per line)">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          rows={5}
          aria-label="Marquee items (one per line)"
          className={`${INPUT} resize-y font-mono text-xs leading-relaxed`}
        />
      </Field>

      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Speed">
          <div className="inline-flex overflow-hidden rounded-skin border border-[var(--border)]">
            {MARQUEE_SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                aria-pressed={(block.speed ?? 'normal') === speed}
                onClick={() =>
                  patch({
                    speed:
                      (block.speed ?? 'normal') === speed ? undefined : speed,
                  })
                }
                className={`px-2.5 py-1 text-xs font-medium ${
                  (block.speed ?? 'normal') === speed
                    ? 'bg-accent text-background'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                {SPEED_LABELS[speed]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Separator glyph">
          <input
            value={block.separator ?? ''}
            onChange={(e) =>
              patch({ separator: e.target.value.trim() || undefined })
            }
            placeholder="·"
            maxLength={3}
            aria-label="Separator glyph between items"
            className={INPUT}
          />
        </Field>
      </div>

      <Checkbox
        label="Reverse direction"
        checked={block.reverse === true}
        onChange={(next) => patch({ reverse: next || undefined })}
      />
    </div>
  );
}
