import { useEffect, useRef } from 'react';
import type { RichDesignProps } from '../types';
import { WIDTH_CLASSES } from './shared';

/**
 * Cutie rich text — prose on a soft sticker card. Dashed candy border,
 * translucent surface fill, one drifting-flower watermark. Body copy
 * itself stays untouched (.rich-text rules own it). Images that 404 show placeholder.svg.
 */
export default function CutieRichText({ block }: RichDesignProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const fix = (img: HTMLImageElement) => { img.src = '/images/placeholder.svg'; img.style.opacity = '0.6'; };
    ref.current.querySelectorAll('img').forEach((el) => {
      const img = el as HTMLImageElement;
      if (!img.getAttribute('src')) { fix(img); return; }
      if (img.complete && img.naturalWidth === 0) { fix(img); return; }
      img.addEventListener('error', () => fix(img), { once: true });
    });
  }, [block.content]);
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
