import type { ComponentType } from 'react';
import type { BlockDesign } from '@/types/schema';
import type { EntryListDesignProps } from './designs/types';
import DefaultEntryList from './designs/entry-list/DefaultEntryList';
import CutieEntryList from './designs/entry-list/CutieEntryList';
import EditorialEntryList from './designs/entry-list/EditorialEntryList';
import RisoEntryList from './designs/entry-list/RisoEntryList';

/**
 * Design registry — opt-in per family (see FeaturedHeroBlock): unlisted
 * designs fall back to DefaultEntryList. Server-safe like BlockRenderer
 * itself: the skins are pure markup, no hooks or event handlers, so no
 * client boundary is needed here.
 */
const ENTRY_LIST_DESIGNS: Partial<
  Record<BlockDesign, ComponentType<EntryListDesignProps>>
> = {
  default: DefaultEntryList,
  cutie: CutieEntryList,
  editorial: EditorialEntryList,
  riso: RisoEntryList,
};

export default function EntryListBlock(props: EntryListDesignProps) {
  const Design = ENTRY_LIST_DESIGNS[props.block.design ?? 'default'] ?? DefaultEntryList;
  return <Design {...props} />;
}
