import type { BlockWidth } from '@/types/schema';
import type { CustomHtmlBlock as CustomHtmlBlockData } from '@/types/schema';

const WIDTH_CLASSES: Record<BlockWidth, string> = {
  narrow: 'max-w-prose',
  wide: 'max-w-3xl',
  full: 'max-w-none',
};

interface Props {
  block: CustomHtmlBlockData;
}

export default function CustomHtmlBlock({ block }: Props) {
  return (
    <section
      className={`${WIDTH_CLASSES[block.width ?? 'narrow']} space-y-4 [&_a]:underline [&_strong]:font-semibold`}
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  );
}
