'use client';

import type { MarqueeBlock } from '@/types/schema';
import { MARQUEE_SPEEDS } from '@/types/schema';
import { Checkbox, Field, INPUT, SPEED_LABELS } from '../editor-shared';

interface Props {
  block: MarqueeBlock;
  patch: (p: Record<string, unknown>) => void;
}

export default function MarqueeForm({ block, patch }: Props) {
  const itemsDraft = block.items.join('\n');

  return (
    <div className="space-y-2">
      <Field label="Items (one per line)">
        <textarea
          value={itemsDraft}
          onChange={(e) => {
            const items = e.target.value
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean);
            patch({ items });
          }}
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
