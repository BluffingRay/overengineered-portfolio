'use client';

import type { ComponentType } from 'react';
import type { BlockDesign } from '@/types/schema';
import type { HeroDesignProps } from './designs/types';
import DefaultHero from './designs/hero/DefaultHero';
import CutieHero from './designs/hero/CutieHero';
import EditorialHero from './designs/hero/EditorialHero';
import RisoHero from './designs/hero/RisoHero';

/**
 * Design registry — exhaustive on purpose: adding a BlockDesign breaks
 * this record until a renderer exists (same tripwire as BLOCK_LABELS).
 */
const HERO_DESIGNS: Record<BlockDesign, ComponentType<HeroDesignProps>> = {
  default: DefaultHero,
  cutie: CutieHero,
  editorial: EditorialHero,
  riso: RisoHero,
};

export default function FeaturedHeroBlock(props: HeroDesignProps) {
  const Design = HERO_DESIGNS[props.block.design ?? 'default'];
  return <Design {...props} />;
}
