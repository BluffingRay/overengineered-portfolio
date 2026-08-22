import type { CustomHtmlBlock as CustomHtmlBlockData } from '@/types/schema';

interface Props {
  block: CustomHtmlBlockData;
}

export default function CustomHtmlBlock({ block }: Props) {
  return (
    <section
      className="max-w-prose space-y-4 [&_a]:underline [&_strong]:font-semibold"
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  );
}
