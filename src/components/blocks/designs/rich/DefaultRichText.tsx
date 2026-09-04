import { useRef } from 'react';
import type { RichDesignProps } from '../types';
import { WIDTH_CLASSES, useRichImageFallback } from './shared';

/**
 * Coder rich text — the original: bare prose on the page background.
 * The global .rich-text stylesheet does ALL styling; content is
 * admin-authored HTML. Images that 404 or are missing show the shared
 * placeholder.svg so empty doesn't mean gone.
 */
export default function CoderRichText({ block }: RichDesignProps) {
  const ref = useRef<HTMLElement>(null);
  useRichImageFallback(ref, block.content);
  return (
    <section
      ref={ref}
      className={`rich-text ${WIDTH_CLASSES[block.width ?? 'narrow']}`}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}
