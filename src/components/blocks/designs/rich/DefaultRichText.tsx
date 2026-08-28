import { useEffect, useRef } from 'react';
import type { RichDesignProps } from '../types';
import { WIDTH_CLASSES } from './shared';

/**
 * Coder rich text — the original: bare prose on the page background.
 * The global .rich-text stylesheet does ALL styling; content is
 * admin-authored HTML. Images that 404 or are missing show the shared
 * placeholder.svg so empty doesn't mean gone.
 */
export default function CoderRichText({ block }: RichDesignProps) {
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
    <section
      ref={ref}
      className={`rich-text ${WIDTH_CLASSES[block.width ?? 'narrow']}`}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}
