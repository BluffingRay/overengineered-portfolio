'use client';

import type { ComponentType } from 'react';
import type { BlockDesign } from '@/types/schema';
import type { GridDesignProps } from './designs/types';
import DefaultGrid from './designs/grid/DefaultGrid';
import CutieGrid from './designs/grid/CutieGrid';
import EditorialGrid from './designs/grid/EditorialGrid';
import RisoGrid from './designs/grid/RisoGrid';

/**
 * Design registry — exhaustive on purpose: adding a BlockDesign breaks
 * this record until a renderer exists (same tripwire as BLOCK_LABELS).
 */
const GRID_DESIGNS: Record<BlockDesign, ComponentType<GridDesignProps>> = {
  default: DefaultGrid,
  cutie: CutieGrid,
  editorial: EditorialGrid,
  riso: RisoGrid,
};

export default function AppGridBlock(props: GridDesignProps) {
  const Design = GRID_DESIGNS[props.block.design ?? 'default'];
  return <Design {...props} />;
}
