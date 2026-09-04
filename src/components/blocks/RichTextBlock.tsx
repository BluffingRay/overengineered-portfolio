'use client';

import type { ComponentType } from 'react';
import type { BlockDesign } from '@/types/schema';
import type { RichDesignProps } from './designs/types';
import DefaultRichText from './designs/rich/DefaultRichText';
import CutieRichText from './designs/rich/CutieRichText';
import EditorialRichText from './designs/rich/EditorialRichText';
import RisoRichText from './designs/rich/RisoRichText';

/**
 * Design registry — opt-in per family (see FeaturedHeroBlock): unlisted
 * designs fall back to DefaultRichText.
 */
const RICH_TEXT_DESIGNS: Partial<Record<BlockDesign, ComponentType<RichDesignProps>>> = {
  default: DefaultRichText,
  cutie: CutieRichText,
  editorial: EditorialRichText,
  riso: RisoRichText,
};

export default function RichTextBlock(props: RichDesignProps) {
  const Design = RICH_TEXT_DESIGNS[props.block.design ?? 'default'] ?? DefaultRichText;
  return <Design {...props} />;
}
