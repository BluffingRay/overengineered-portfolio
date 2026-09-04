import type { EntryListDesignProps } from '../types';
import { EntryListSkeleton } from './shared';

/**
 * Riso entry list — poster index: full block width, one hard
 * 2px-bordered plate with an offset shadow, numbered entries stamped
 * in mono caps above black uppercase titles. All Tailwind — no new
 * decoration CSS.
 */
export default function RisoEntryList({ block }: EntryListDesignProps) {
  return (
    <EntryListSkeleton
      block={block}
      number={{
        className: 'mr-2 text-accent',
        format: (index) => String(index + 1).padStart(2, '0'),
      }}
      classes={{
        section:
          'dsn-riso space-y-4 border-2 border-current p-5 shadow-[4px_4px_0_0_currentColor] sm:p-6',
        heading:
          'riso-misprint text-2xl font-black uppercase leading-tight tracking-tight',
        list: '',
        item: 'border-2 border-current bg-background p-3.5 shadow-[3px_3px_0_0_currentColor]',
        metaLine: 'font-mono text-[11px] font-bold uppercase tracking-widest opacity-80',
        title: 'riso-misprint mt-1 text-lg font-black uppercase leading-tight',
        link: 'hover:text-accent',
        subtitle: 'mt-0.5 font-mono text-xs opacity-70',
        location: 'mt-0.5 font-mono text-[11px] uppercase opacity-60',
        honors: 'mt-1 font-mono text-xs font-bold uppercase text-accent',
        description: 'mt-1.5 font-mono text-xs leading-relaxed opacity-70',
        credential: 'mt-1.5 font-mono text-[11px] opacity-60',
      }}
    />
  );
}
