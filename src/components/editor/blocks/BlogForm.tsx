'use client';

import type { BlogBlock, BlogVariant } from '@/types/schema';
import { BLOG_VARIANTS } from '@/types/schema';
import {
  BlockDesignPicker,
  Field,
  INPUT,
} from '../editor-shared';

const VARIANT_LABELS: Record<BlogVariant, string> = {
  latest: 'Latest (grid of 3)',
  all: 'All (stacked list)',
};

export default function BlogForm({
  block,
  patch,
}: {
  block: BlogBlock;
  patch: (p: Record<string, unknown>) => void;
}) {
  const variant = block.variant ?? 'latest';

  return (
    <div className="space-y-2">
      <Field label="Section title">
        <input
          value={block.title}
          onChange={(e) => patch({ title: e.target.value })}
          className={INPUT}
        />
      </Field>

      <Field label="Variant">
        <div className="flex rounded-skin border border-[var(--border)] p-0.5">
          {BLOG_VARIANTS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={variant === option}
              onClick={() =>
                patch({ variant: option === 'latest' ? undefined : option })
              }
              className={`flex-1 rounded-[calc(var(--radius)-0.15rem)] px-2 py-0.5 text-xs ${
                variant === option
                  ? 'bg-accent text-background'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              {VARIANT_LABELS[option]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Design">
        <BlockDesignPicker
          value={block.design}
          onChange={(design) => patch({ design })}
        />
      </Field>

      <p className="text-xs opacity-50">
        Shows published posts only — visitors click a card to read it at its
        own link. Latest caps at the 3 newest; All lists everything.
      </p>
    </div>
  );
}
