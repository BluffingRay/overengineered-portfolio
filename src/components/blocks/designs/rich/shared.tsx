import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { BlockWidth } from '@/types/schema';

/* Atoms shared by rich-text designs. The global .rich-text CSS owns all
   typography; designs only decide the frame around admin-authored HTML. */

export const WIDTH_CLASSES: Record<BlockWidth, string> = {
  narrow: 'max-w-prose',
  wide: 'max-w-3xl',
  full: 'max-w-none',
};

/**
 * Broken-image fallback — images that 404 or arrive src-less show the
 * shared placeholder so empty doesn't mean gone. Identical in all 4
 * rich designs; the effect re-runs when authored HTML changes.
 */
export function useRichImageFallback(
  ref: RefObject<HTMLElement | HTMLDivElement | null>,
  content: string,
) {
  useEffect(() => {
    if (!ref.current) return;
    const fix = (img: HTMLImageElement) => { img.src = '/images/placeholder.svg'; img.style.opacity = '0.6'; };
    ref.current.querySelectorAll('img').forEach((el) => {
      const img = el as HTMLImageElement;
      if (!img.getAttribute('src')) { fix(img); return; }
      if (img.complete && img.naturalWidth === 0) { fix(img); return; }
      img.addEventListener('error', () => fix(img), { once: true });
    });
  }, [ref, content]);
}
