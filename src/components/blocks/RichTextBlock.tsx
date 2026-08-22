import type { RichTextBlock as RichTextBlockData } from '@/types/schema';

interface Props {
  block: RichTextBlockData;
}

export default function RichTextBlock({ block }: Props) {
  return (
    <section
      className="rich-text max-w-prose"
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}
