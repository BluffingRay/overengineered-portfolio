'use client';

import type { FeaturedHeroBlock, ImageAlignment } from '@/types/schema';
import { ALIGNMENT_LABELS, Field, INPUT } from '../editor-shared';
import { IMAGE_ALIGNMENTS } from '@/types/schema';

interface Props {
  block: FeaturedHeroBlock;
  patch: (p: Record<string, unknown>) => void;
}

export default function HeroForm({ block, patch }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label="Heading">
        <input
          value={block.heading}
          onChange={(e) => patch({ heading: e.target.value })}
          className={INPUT}
        />
      </Field>
      <Field label="Image URL">
        <input
          value={block.thumbnail}
          onChange={(e) => patch({ thumbnail: e.target.value })}
          placeholder="/images/…"
          className={`${INPUT} font-mono text-xs`}
        />
      </Field>
      <Field label="Subheading">
        <textarea
          value={block.subheading}
          onChange={(e) => patch({ subheading: e.target.value })}
          rows={2}
          className={`${INPUT} resize-y leading-relaxed`}
        />
      </Field>
      <Field label="Image alignment">
        <select
          value={block.imageAlign ?? 'left'}
          onChange={(e) =>
            patch({ imageAlign: e.target.value as ImageAlignment })
          }
          className={INPUT}
        >
          {IMAGE_ALIGNMENTS.map((alignment) => (
            <option key={alignment} value={alignment}>
              {ALIGNMENT_LABELS[alignment]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="CTA label">
        <input
          value={block.ctaLabel}
          onChange={(e) => patch({ ctaLabel: e.target.value })}
          className={INPUT}
        />
      </Field>
      <Field label="CTA link">
        <input
          value={block.ctaHref}
          onChange={(e) => patch({ ctaHref: e.target.value })}
          className={`${INPUT} font-mono text-xs`}
        />
      </Field>
    </div>
  );
}
