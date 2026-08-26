import type { RichDesignProps } from '../types';
import { WIDTH_CLASSES } from './shared';

/**
 * Coder rich text — the original: bare prose on the page background.
 * The global .rich-text stylesheet does ALL styling; content is
 * admin-authored HTML.
 */
export default function CoderRichText({ block }: RichDesignProps) {
  return (
    <section
      className={`rich-text ${WIDTH_CLASSES[block.width ?? 'narrow']}`}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}
