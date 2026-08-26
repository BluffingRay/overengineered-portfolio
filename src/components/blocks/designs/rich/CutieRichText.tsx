import type { RichDesignProps } from '../types';
import { WIDTH_CLASSES } from './shared';

/**
 * Cutie rich text — prose on a soft sticker card. Dashed candy border,
 * translucent surface fill, one drifting-flower watermark. Body copy
 * itself stays untouched (.rich-text rules own it).
 */
export default function CutieRichText({ block }: RichDesignProps) {
  return (
    <section className="dsn-cutie relative">
      {/* Watermark sticker pinning the card corner */}
      <span
        aria-hidden="true"
        className="absolute -top-3 right-8 z-10 -rotate-6 select-none text-xl opacity-60"
      >
        ✿
      </span>
      <div className="rounded-[2rem] border-2 border-dashed border-accent/25 bg-surface/60 p-8">
        <div
          className={`rich-text ${WIDTH_CLASSES[block.width ?? 'narrow']}`}
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      </div>
    </section>
  );
}
