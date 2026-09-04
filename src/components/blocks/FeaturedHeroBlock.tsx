'use client';

import type { ComponentType } from 'react';
import type { BlockDesign } from '@/types/schema';
import type { HeroDesignProps } from './designs/types';
import DefaultHero from './designs/hero/DefaultHero';
import CutieHero from './designs/hero/CutieHero';
import EditorialHero from './designs/hero/EditorialHero';
import RisoHero from './designs/hero/RisoHero';

/**
 * Design registry — opt-in per family: a new BlockDesign renders here
 * ONLY when listed; every other design falls back to DefaultHero. So a
 * hero-only design touches this file + one module, never all 6
 * dispatchers (see docs/specs/design-skeletons.md).
 */
const HERO_DESIGNS: Partial<Record<BlockDesign, ComponentType<HeroDesignProps>>> = {
  default: DefaultHero,
  cutie: CutieHero,
  editorial: EditorialHero,
  riso: RisoHero,
};

export default function FeaturedHeroBlock({
  block,
  socials,
  onNavigate,
  showMediaPlaceholder,
}: HeroDesignProps) {
  const Design = HERO_DESIGNS[block.design ?? 'default'] ?? DefaultHero;
  return (
    <Design
      block={block}
      socials={socials}
      onNavigate={onNavigate}
      showMediaPlaceholder={showMediaPlaceholder}
    />
  );
}
