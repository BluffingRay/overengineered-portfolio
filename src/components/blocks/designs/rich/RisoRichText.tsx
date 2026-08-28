import { useEffect, useRef } from 'react';
import type { RichDesignProps } from '../types';
import { WIDTH_CLASSES } from './shared';

/**
 * Riso rich text — prose printed in a poster column. Hard ink frame,
 * paper grain over everything, content lifted above the texture on
 * z-10. No typography overrides: .rich-text rules stay the owner. Images that 404 show placeholder.svg.
 */
export default function RisoRichText({ block }: RichDesignProps) {
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
    <section className="dsn-riso relative border-2 border-current p-8">
      <div aria-hidden="true" className="riso-grain pointer-events-none absolute inset-0" />
      <div ref={ref} className={`rich-text relative z-10 ${WIDTH_CLASSES[block.width ?? 'narrow']}`} dangerouslySetInnerHTML={{ __html: block.content }} />
    </section>
  );
}
