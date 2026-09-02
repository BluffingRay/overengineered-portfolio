import type { BlockWidth } from '@/types/schema';
import type { CustomHtmlBlock as CustomHtmlBlockData } from '@/types/schema';
import { scopeCustomHtml } from '@/lib/sanitize-html';

const WIDTH_CLASSES: Record<BlockWidth, string> = {
  narrow: 'max-w-prose',
  wide: 'max-w-3xl',
  full: 'max-w-none',
};

interface Props {
  block: CustomHtmlBlockData;
}

export default function CustomHtmlBlock({ block }: Props) {
  // Auto-scope <style> selectors to this block's id so AI-generated generic
  // CSS like `.card{}` never leaks globally. sanitize-html already scopes
  // on hosted persist/read, but B's localStorage preview bypasses sanitize
  // — so we scope at render time too (idempotent).
  const html = scopeCustomHtml(block.html, block.id);
  return (
    <section
      id={`custom-html-${block.id}`}
      className={`${WIDTH_CLASSES[block.width ?? 'narrow']} space-y-4 [&_a]:underline [&_strong]:font-semibold`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
