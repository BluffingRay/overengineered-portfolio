import type { Block } from '@/types/schema';
import FeaturedHeroBlock from './FeaturedHeroBlock';
import AppGridBlock from './AppGridBlock';
import RichTextBlock from './RichTextBlock';
import CustomHtmlBlock from './CustomHtmlBlock';

export default function BlockRenderer({ block }: { block: Block }) {
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
