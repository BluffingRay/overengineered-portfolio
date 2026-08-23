import type { AppCardItem, Block, BlockSpacing, Post, SocialLink } from '@/types/schema';
import FeaturedHeroBlock from './FeaturedHeroBlock';
import AppGridBlock from './AppGridBlock';
import BlogBlock from './BlogBlock';
import RichTextBlock from './RichTextBlock';
import CustomHtmlBlock from './CustomHtmlBlock';
import MarqueeBlock from './MarqueeBlock';
import Reveal from './Reveal';

const SPACING_CLASSES: Record<BlockSpacing, string> = {
  none: 'py-0',
  compact: 'py-3 md:py-4',
  normal: 'py-8 md:py-10',
  spacious: 'py-10 md:py-14',
};

function renderBlock(
  block: Block,
  socials?: SocialLink[],
  cards?: AppCardItem[],
  posts?: Post[],
  onNavigate?: (href: string) => boolean,
  onOpenPost?: (id: string) => void,
) {
  switch (block.type) {
    case 'featured_hero':
      return (
        <FeaturedHeroBlock
          block={block}
          socials={socials}
          onNavigate={onNavigate}
        />
      );
    case 'app_grid':
      return (
        <AppGridBlock
          block={block}
          cards={cards}
          posts={posts}
          onOpenPost={onOpenPost}
        />
      );
    case 'blog':
      return (
        <BlogBlock block={block} posts={posts} onOpenPost={onOpenPost} />
      );
    case 'rich_text':
      return <RichTextBlock block={block} />;
    case 'custom_html':
      return <CustomHtmlBlock block={block} />;
    case 'marquee':
      return <MarqueeBlock block={block} />;
    default: {
      const unhandled: never = block;
      return unhandled;
    }
  }
}

interface Props {
  block: Block;
  socials?: SocialLink[];
  cards?: AppCardItem[];
  /** Published posts (newest first) for blog blocks + card post-links. */
  posts?: Post[];
  /** Resolves in-page hrefs to tab navigation (see FeaturedHeroBlock). */
  onNavigate?: (href: string) => boolean;
  /** Opens a post as a floating reader instead of navigating. */
  onOpenPost?: (id: string) => void;
}

export default function BlockRenderer({
  block,
  socials,
  cards,
  posts,
  onNavigate,
  onOpenPost,
}: Props) {
  return (
    <div className={SPACING_CLASSES[block.spacing ?? 'normal']}>
      <Reveal>
        {renderBlock(block, socials, cards, posts, onNavigate, onOpenPost)}
      </Reveal>
    </div>
  );
}
