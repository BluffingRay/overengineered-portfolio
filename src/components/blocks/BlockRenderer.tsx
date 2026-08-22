import type { Block, BlockSpacing } from '@/types/schema';
import FeaturedHeroBlock from './FeaturedHeroBlock';
import AppGridBlock from './AppGridBlock';
import RichTextBlock from './RichTextBlock';
import CustomHtmlBlock from './CustomHtmlBlock';

const SPACING_CLASSES: Record<BlockSpacing, string> = {
  none: 'py-0',
  compact: 'py-4 md:py-6',
  normal: 'py-8 md:py-12',
  spacious: 'py-14 md:py-20',
};

function renderBlock(block: Block) {
  switch (block.type) {
    case 'featured_hero':
      return <FeaturedHeroBlock block={block} />;
    case 'app_grid':
      return <AppGridBlock block={block} />;
    case 'rich_text':
      return <RichTextBlock block={block} />;
    case 'custom_html':
      return <CustomHtmlBlock block={block} />;
    default: {
      const unhandled: never = block;
      return unhandled;
    }
  }
}

export default function BlockRenderer({ block }: { block: Block }) {
  return (
    <div className={SPACING_CLASSES[block.spacing ?? 'normal']}>
      {renderBlock(block)}
    </div>
  );
}
