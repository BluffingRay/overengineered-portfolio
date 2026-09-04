import type { EntryListDesignProps } from '../types';
import { EntryListSkeleton } from './shared';

/**
 * Editorial entry list — a magazine index: full-width bordered cards,
 * serif titles over tiny tracked-out caps meta. Typography does all the
 * work, as ever in this design.
 */
export default function EditorialEntryList({ block }: EntryListDesignProps) {
  return (
    <EntryListSkeleton
      block={block}
      classes={{
        section: 'dsn-editorial space-y-4',
        heading: 'ed-serif text-3xl leading-tight tracking-tight',
        list: '',
        item: 'rounded-skin border border-current/15 p-4 sm:p-5',
        metaLine: 'text-[11px] uppercase tracking-[0.35em] opacity-50',
        title: 'ed-serif mt-1.5 text-xl leading-snug',
        link: 'decoration-current/30 underline-offset-4 hover:underline',
        subtitle: 'mt-1 text-sm italic opacity-60',
        location: 'mt-0.5 text-[11px] uppercase tracking-[0.2em] opacity-50',
        honors: 'ed-serif mt-1 text-base italic text-accent',
        description: 'mt-2 text-sm leading-relaxed opacity-70',
        credential: 'mt-2 font-mono text-[11px] opacity-50',
      }}
    />
  );
}
