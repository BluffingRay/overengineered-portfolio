'use client';

import type { ComponentType } from 'react';
import type { BlockDesign } from '@/types/schema';
import type { BlogDesignProps } from './designs/types';
import DefaultBlog from './designs/blog/DefaultBlog';
import CutieBlog from './designs/blog/CutieBlog';
import EditorialBlog from './designs/blog/EditorialBlog';
import RisoBlog from './designs/blog/RisoBlog';

/**
 * Design registry — exhaustive on purpose: adding a BlockDesign breaks
 * this record until a renderer exists (same tripwire as BLOCK_LABELS).
 */
const BLOG_DESIGNS: Record<BlockDesign, ComponentType<BlogDesignProps>> = {
  default: DefaultBlog,
  cutie: CutieBlog,
  editorial: EditorialBlog,
  riso: RisoBlog,
};

export default function BlogBlock(props: BlogDesignProps) {
  const Design = BLOG_DESIGNS[props.block.design ?? 'default'];
  return <Design {...props} />;
}
