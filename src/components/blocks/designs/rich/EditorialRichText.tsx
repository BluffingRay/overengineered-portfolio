import { useEffect, useRef } from 'react';
import type { RichDesignProps } from '../types';
import { WIDTH_CLASSES } from './shared';

/**
 * Editorial rich text — magazine body copy. Same .rich-text output,
 * but the opening paragraph gets a print-style drop cap and headings
 * inherit the serif stack (both via the .ed-dropcap hook in globals). Images that 404 show placeholder.svg.
 */
export default function EditorialRichText({ block }: RichDesignProps) {
  const ref = useRef<HTMLElement>(null);
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
    <section ref={ref} className={`dsn-editorial ed-dropcap rich-text ${WIDTH_CLASSES[block.width ?? 'narrow']}`} dangerouslySetInnerHTML={{ __html: block.content }} />
  );
}
