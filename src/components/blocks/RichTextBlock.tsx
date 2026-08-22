import type { RichTextBlock as RichTextBlockData } from '@/types/schema';

interface Props {
  block: RichTextBlockData;
}

export default function RichTextBlock({ block }: Props) {
  return (
    <section className="max-w-prose text-base leading-relaxed opacity-80">
      <p className="whitespace-pre-wrap">{block.content}</p>
    </section>
  );
}
