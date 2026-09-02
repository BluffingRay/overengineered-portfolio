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

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const copyEl = target.closest('[data-copy]') as HTMLElement | null;
    if (!copyEl) return;
    const text = copyEl.getAttribute('data-copy');
    if (!text) return;
    // Don't flip the card when copying — the flip is a label+checkbox hack
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text).catch(() => {});
    // Tiny visual feedback if the block uses the keycard pattern (.kb-val)
    const val = copyEl.querySelector('.kb-val') as HTMLElement | null;
    if (val) {
      const orig = val.dataset.orig ?? val.textContent ?? '';
      if (!val.dataset.orig) val.dataset.orig = orig;
      val.textContent = 'COPIED! ✓';
      (val as HTMLElement).style.color = '#10b981';
      window.setTimeout(() => {
        val.textContent = val.dataset.orig ?? orig;
        (val as HTMLElement).style.color = '';
      }, 1500);
    }
  };

  return (
    <section
      id={`custom-html-${block.id}`}
      className={`${WIDTH_CLASSES[block.width ?? 'narrow']} space-y-4 [&_a]:underline [&_strong]:font-semibold`}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
