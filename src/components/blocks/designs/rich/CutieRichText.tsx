import { useRef } from 'react';
import type { RichDesignProps } from '../types';
import { WIDTH_CLASSES, useRichImageFallback } from './shared';

/**
 * Cutie rich text — prose on a soft sticker card. Dashed candy border,
 * translucent surface fill, one drifting-flower watermark. Body copy
 * itself stays untouched (.rich-text rules own it). Images that 404 show placeholder.svg.
 */
export default function CutieRichText({ block }: RichDesignProps) {
  const ref = useRef<HTMLDivElement>(null);
  useRichImageFallback(ref, block.content);
  return (
    <section className="dsn-cutie relative">
      <span aria-hidden="true" className="absolute -top-3 right-8 z-10 -rotate-6 select-none text-xl opacity-60">
        ✿
      </span>
      <div className="rounded-[2rem] border-2 border-dashed border-accent/25 bg-surface/60 p-8">
        <div ref={ref} className={`rich-text ${WIDTH_CLASSES[block.width ?? 'narrow']}`} dangerouslySetInnerHTML={{ __html: block.content }} />
      </div>
    </section>
  );
}
