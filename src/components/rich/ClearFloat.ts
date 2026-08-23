'use client';

import Paragraph from '@tiptap/extension-paragraph';

/**
 * Paragraph-level "start below floated images" flag.
 *
 * An earlier attempt used an invisible inline <br data-clear> marker,
 * but StarterKit's HardBreak parse rule claimed every <br> on reload and
 * the flag evaporated. Attaching the flag to the PARAGRAPH attribute is
 * collision-free: paragraphs round-trip their attributes reliably, and
 * `<p data-clear="both">` clears CSS floats in both editor and viewer.
 */
export const ClearableParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      clearBelow: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-clear') === 'both',
        renderHTML: (attrs: { clearBelow?: boolean }) =>
          attrs.clearBelow ? { 'data-clear': 'both' } : {},
      },
    };
  },
});
