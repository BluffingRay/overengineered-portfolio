import { useRef } from 'react';
import type { RichDesignProps } from '../types';
import { WIDTH_CLASSES, useRichImageFallback } from './shared';

/**
 * Editorial rich text — magazine body copy. Same .rich-text output,
 * but the opening paragraph gets a print-style drop cap and headings
 * inherit the serif stack (both via the .ed-dropcap hook in globals). Images that 404 show placeholder.svg.
 */
export default function EditorialRichText({ block }: RichDesignProps) {
  const ref = useRef<HTMLElement>(null);
  useRichImageFallback(ref, block.content);
  return (
    <section ref={ref} className={`dsn-editorial ed-dropcap rich-text ${WIDTH_CLASSES[block.width ?? 'narrow']}`} dangerouslySetInnerHTML={{ __html: block.content }} />
  );
}
