'use client';

import type { ComponentType } from 'react';
import type { BlockDesign } from '@/types/schema';
import type { MarqueeDesignProps } from './designs/types';
import DefaultMarquee from './designs/marquee/DefaultMarquee';
import CutieMarquee from './designs/marquee/CutieMarquee';
import EditorialMarquee from './designs/marquee/EditorialMarquee';
import RisoMarquee from './designs/marquee/RisoMarquee';

/**
 * Design registry — exhaustive on purpose: adding a BlockDesign breaks
 * this record until a renderer exists (same tripwire as BLOCK_LABELS).
 */
const MARQUEE_DESIGNS: Record<
  BlockDesign,
  ComponentType<MarqueeDesignProps>
> = {
  default: DefaultMarquee,
  cutie: CutieMarquee,
  editorial: EditorialMarquee,
  riso: RisoMarquee,
};

export default function MarqueeBlock(props: MarqueeDesignProps) {
  const Design = MARQUEE_DESIGNS[props.block.design ?? 'default'];
  return <Design {...props} />;
}
