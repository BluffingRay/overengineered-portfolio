import type { EntryListDesignProps } from '../types';
import { EntryListSkeleton } from './shared';

/**
 * Cutie entry list — soft sticker cards: full block width, rounded
 * skins on a whisper of current-color, one accent dot per entry,
 * sentence-case bold titles.
 * Static sweetness — nothing floats or bobs here.
 */
export default function CutieEntryList({ block }: EntryListDesignProps) {
  return (
    <EntryListSkeleton
      block={block}
      classes={{
        section: 'space-y-4',
        heading: 'text-2xl font-bold tracking-tight',
        list: 'space-y-2.5',
        item:
          'relative rounded-skin bg-current/[0.04] p-4 pl-8 before:absolute before:left-4 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-accent',
        metaLine: 'text-[11px] font-semibold uppercase tracking-wide text-accent',
        title: 'mt-0.5 text-base font-bold',
        link: 'hover:underline',
        subtitle: 'mt-0.5 text-sm opacity-60',
        location: 'mt-0.5 text-xs opacity-50',
        honors:
          'mt-1.5 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent',
        description: 'mt-1.5 text-sm leading-relaxed opacity-70',
        credential: 'mt-1.5 font-mono text-[11px] opacity-50',
      }}
    />
  );
}
