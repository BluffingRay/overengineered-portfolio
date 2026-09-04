import type { EntryListDesignProps } from '../types';
import { EntryListSkeleton } from './shared';

/**
 * Default entry list — the quiet card: full block width, hairline
 * bordered cards matching the default grid's chassis, plain medium
 * titles under a low-opacity meta whisper. Nothing decorates; the
 * content carries it.
 */
export default function DefaultEntryList({ block }: EntryListDesignProps) {
  return (
    <EntryListSkeleton
      block={block}
      classes={{
        section: 'space-y-4',
        heading: 'text-2xl font-semibold tracking-tight',
        list: '',
        item: 'rounded-skin border border-current/15 p-4 sm:p-5',
        metaLine: 'text-xs font-medium uppercase tracking-wide opacity-50',
        title: 'mt-1 text-base font-medium',
        link: 'underline-offset-2 hover:text-accent',
        subtitle: 'mt-0.5 text-sm opacity-60',
        location: 'mt-0.5 text-xs opacity-50',
        honors: 'mt-1 text-sm font-medium text-accent',
        description: 'mt-2 text-sm leading-relaxed opacity-70',
        credential: 'mt-2 font-mono text-[11px] opacity-50',
      }}
    />
  );
}
