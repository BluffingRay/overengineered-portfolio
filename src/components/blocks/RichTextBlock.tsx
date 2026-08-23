import type { BlockWidth } from '@/types/schema';
import type { RichTextBlock as RichTextBlockData } from '@/types/schema';

const WIDTH_CLASSES: Record<BlockWidth, string> = {
  narrow: 'max-w-prose',
  wide: 'max-w-3xl',
  full: 'max-w-none',
};

interface Props {
  block: RichTextBlockData;
}

export default function RichTextBlock({ block }: Props) {
  return (
    <section
      className={`rich-text ${WIDTH_CLASSES[block.width ?? 'narrow']}`}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}
