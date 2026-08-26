'use client';

import type { ComponentType } from 'react';
import type { BlockDesign } from '@/types/schema';
import type { RichDesignProps } from './designs/types';
import DefaultRichText from './designs/rich/DefaultRichText';
import CutieRichText from './designs/rich/CutieRichText';
import EditorialRichText from './designs/rich/EditorialRichText';
import RisoRichText from './designs/rich/RisoRichText';

/**
 * Design registry — exhaustive on purpose: adding a BlockDesign breaks
 * this record until a renderer exists (same tripwire as BLOCK_LABELS).
 */
const RICH_TEXT_DESIGNS: Record<BlockDesign, ComponentType<RichDesignProps>> = {
  default: DefaultRichText,
  cutie: CutieRichText,
  editorial: EditorialRichText,
  riso: RisoRichText,
};

export default function RichTextBlock(props: RichDesignProps) {
  const Design = RICH_TEXT_DESIGNS[props.block.design ?? 'default'];
  return <Design {...props} />;
}
