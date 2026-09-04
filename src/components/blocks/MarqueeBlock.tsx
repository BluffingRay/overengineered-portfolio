'use client';

import type { ComponentType } from 'react';
import type { BlockDesign } from '@/types/schema';
import type { MarqueeDesignProps } from './designs/types';
import DefaultMarquee from './designs/marquee/DefaultMarquee';
import CutieMarquee from './designs/marquee/CutieMarquee';
import EditorialMarquee from './designs/marquee/EditorialMarquee';
import RisoMarquee from './designs/marquee/RisoMarquee';

/**
 * Design registry — opt-in per family (see FeaturedHeroBlock): unlisted
 * designs fall back to DefaultMarquee.
 */
const MARQUEE_DESIGNS: Partial<
  Record<BlockDesign, ComponentType<MarqueeDesignProps>>
> = {
  default: DefaultMarquee,
  cutie: CutieMarquee,
  editorial: EditorialMarquee,
  riso: RisoMarquee,
};

export default function MarqueeBlock(props: MarqueeDesignProps) {
  const Design = MARQUEE_DESIGNS[props.block.design ?? 'default'] ?? DefaultMarquee;
  return <Design {...props} />;
}
