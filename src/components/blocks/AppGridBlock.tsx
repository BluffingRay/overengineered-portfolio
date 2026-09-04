'use client';

import type { ComponentType } from 'react';
import type { BlockDesign } from '@/types/schema';
import type { GridDesignProps } from './designs/types';
import DefaultGrid from './designs/grid/DefaultGrid';
import CutieGrid from './designs/grid/CutieGrid';
import EditorialGrid from './designs/grid/EditorialGrid';
import RisoGrid from './designs/grid/RisoGrid';

/**
 * Design registry — opt-in per family (see FeaturedHeroBlock): unlisted
 * designs fall back to DefaultGrid.
 */
const GRID_DESIGNS: Partial<Record<BlockDesign, ComponentType<GridDesignProps>>> = {
  default: DefaultGrid,
  cutie: CutieGrid,
  editorial: EditorialGrid,
  riso: RisoGrid,
};

export default function AppGridBlock(props: GridDesignProps) {
  const Design = GRID_DESIGNS[props.block.design ?? 'default'] ?? DefaultGrid;
  return <Design {...props} />;
}
