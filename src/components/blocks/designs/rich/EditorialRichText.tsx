import type { RichDesignProps } from '../types';
import { WIDTH_CLASSES } from './shared';

/**
 * Editorial rich text — magazine body copy. Same .rich-text output,
 * but the opening paragraph gets a print-style drop cap and headings
 * inherit the serif stack (both via the .ed-dropcap hook in globals).
 */
export default function EditorialRichText({ block }: RichDesignProps) {
  return (
    <section
      className={`dsn-editorial ed-dropcap rich-text ${
        WIDTH_CLASSES[block.width ?? 'narrow']
      }`}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}
