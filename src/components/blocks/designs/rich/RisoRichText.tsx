import { useRef } from 'react';
import type { RichDesignProps } from '../types';
import { WIDTH_CLASSES, useRichImageFallback } from './shared';

/**
 * Riso rich text — prose printed in a poster column. Hard ink frame,
 * paper grain over everything, content lifted above the texture on
 * z-10. No typography overrides: .rich-text rules stay the owner. Images that 404 show placeholder.svg.
 */
export default function RisoRichText({ block }: RichDesignProps) {
  const ref = useRef<HTMLDivElement>(null);
  useRichImageFallback(ref, block.content);
  return (
    <section className="dsn-riso relative border-2 border-current p-8">
      <div aria-hidden="true" className="riso-grain pointer-events-none absolute inset-0" />
      <div ref={ref} className={`rich-text relative z-10 ${WIDTH_CLASSES[block.width ?? 'narrow']}`} dangerouslySetInnerHTML={{ __html: block.content }} />
    </section>
  );
}
