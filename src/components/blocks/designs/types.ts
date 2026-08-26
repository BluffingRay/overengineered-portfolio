import type {
  AppCardItem,
  BlogBlock,
  AppGridBlock,
  FeaturedHeroBlock,
  MarqueeBlock,
  Post,
  RichTextBlock,
  SocialLink,
} from '@/types/schema';

/**
 * Per-design prop contracts. Every design within a family receives the
 * exact same data — they are siblings, not skins: same info, entirely
 * different rendering behavior.
 */
export interface HeroDesignProps {
  block: FeaturedHeroBlock;
  socials?: SocialLink[];
  /** Resolves an href to in-page tab navigation; true = handled. */
  onNavigate?: (href: string) => boolean;
}

export interface GridDesignProps {
  block: AppGridBlock;
  cards?: AppCardItem[];
  posts?: Post[];
  onOpenPost?: (id: string) => void;
}

export interface RichDesignProps {
  block: RichTextBlock;
}

export interface MarqueeDesignProps {
  block: MarqueeBlock;
}

export interface BlogDesignProps {
  block: BlogBlock;
  posts?: Post[];
  onOpenPost?: (id: string) => void;
}
