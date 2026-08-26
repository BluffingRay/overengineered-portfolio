import type { BlockWidth } from '@/types/schema';

/* Atoms shared by rich-text designs. The global .rich-text CSS owns all
   typography; designs only decide the frame around admin-authored HTML. */

export const WIDTH_CLASSES: Record<BlockWidth, string> = {
  narrow: 'max-w-prose',
  wide: 'max-w-3xl',
  full: 'max-w-none',
};
