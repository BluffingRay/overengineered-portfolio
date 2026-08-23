export const SPACINGS = ['none', 'compact', 'normal', 'spacious'] as const;

export type BlockSpacing = (typeof SPACINGS)[number];

export const BLOCK_WIDTHS = ['narrow', 'wide', 'full'] as const;

export type BlockWidth = (typeof BLOCK_WIDTHS)[number];

interface BlockBase {
  id: string;
  spacing?: BlockSpacing;
}

export const IMAGE_ALIGNMENTS = ['left', 'right', 'top', 'backdrop'] as const;

export type ImageAlignment = (typeof IMAGE_ALIGNMENTS)[number];

export const HERO_LAYOUTS = ['centered', 'split', 'banner'] as const;

export type HeroLayout = (typeof HERO_LAYOUTS)[number];

export const HERO_MEDIA_RATIOS = ['circle', 'square', 'landscape', 'portrait'] as const;

export type HeroMediaRatio = (typeof HERO_MEDIA_RATIOS)[number];

export const HERO_MEDIA_RADIUS = ['theme', 'none', 'sm', 'lg', 'full', 'squircle'] as const;

export type HeroMediaRadius = (typeof HERO_MEDIA_RADIUS)[number];

export const HERO_MEDIA_SIZES = ['xs', 'sm', 'md', 'lg'] as const;

export type HeroMediaSize = (typeof HERO_MEDIA_SIZES)[number];

export const HERO_MEDIA_FRAMES = ['none', 'subtle', 'accent-glow', 'window'] as const;

export type HeroMediaFrame = (typeof HERO_MEDIA_FRAMES)[number];

export const MEDIA_SIDES = ['left', 'right'] as const;

export type MediaSide = (typeof MEDIA_SIDES)[number];

export const MEDIA_POSITIONS = ['top', 'bottom'] as const;

export type MediaPosition = (typeof MEDIA_POSITIONS)[number];

export const NAME_FITS = ['compact', 'free'] as const;

export type NameFit = (typeof NAME_FITS)[number];

export const STATUS_COLORS = ['green', 'blue', 'amber', 'purple'] as const;

export type StatusColor = (typeof STATUS_COLORS)[number];

export interface HeroStatusBadge {
  enabled: boolean;
  text: string;
  color?: StatusColor;
}

export interface HeroSecondaryAction {
  label: string;
  url: string;
  target?: '_blank' | '_self';
}

export interface FeaturedHeroBlock extends BlockBase {
  type: 'featured_hero';
  /** Small uppercase kicker above the heading (site/path identity). */
  eyebrow?: string;
  /** Display name — promoted to the H1 when present. */
  name?: string;
  /**
   * How the name behaves at tight widths: `compact` wraps onto extra
   * lines, `free` auto-fits its font down to stay on one line.
   * Absent = `free`.
   */
  nameFit?: NameFit;
  /** Cycled with a typewriter effect under the name (e.g. job titles). */
  roles?: string[];
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
  thumbnail: string;
  imageAlign?: ImageAlignment;
  layout?: HeroLayout;
  mediaSide?: MediaSide;
  mediaPosition?: MediaPosition;
  statusBadge?: HeroStatusBadge;
  secondaryAction?: HeroSecondaryAction;
  showSocials?: boolean;
  mediaRatio?: HeroMediaRatio;
  mediaRadius?: HeroMediaRadius;
  mediaSize?: HeroMediaSize;
  mediaFrame?: HeroMediaFrame;
}

export const SOCIAL_PLATFORMS = [
  'github',
  'linkedin',
  'twitter',
  'email',
  'discord',
  'custom',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  label?: string;
  customIcon?: string;
}

export interface AppCardItem {
  id: string;
  name: string;
  description: string;
  href: string;
  coverImage?: string;
  icon?: string;
  tags?: string[];
  demoUrl?: string;
  githubUrl?: string;
  /** Extra free-form link shown next to Demo/GitHub ("Paper", "Blog", "View"...). */
  customLabel?: string;
  customUrl?: string;
  /** When set, resolves internally to a blog post (?post=<id>); wins over customUrl. */
  customPostId?: string;
  category?: string;
  primaryAction?: PrimaryAction;
}

export const PRIMARY_ACTIONS = ['demo', 'github', 'href'] as const;

export type PrimaryAction = (typeof PRIMARY_ACTIONS)[number];

export interface AppGridBlock extends BlockBase {
  type: 'app_grid';
  title: string;
  /**
   * Ordered references into the root `cards` library (v3). The same card
   * id may appear in any number of grids; edits to a library card
   * propagate everywhere it is referenced.
   */
  apps: string[];
}

export interface RichTextBlock extends BlockBase {
  type: 'rich_text';
  content: string;
  width?: BlockWidth;
}

export interface CustomHtmlBlock extends BlockBase {
  type: 'custom_html';
  html: string;
  width?: BlockWidth;
}

export const MARQUEE_SPEEDS = ['slow', 'normal', 'fast'] as const;

export type MarqueeSpeed = (typeof MARQUEE_SPEEDS)[number];

export interface MarqueeBlock extends BlockBase {
  type: 'marquee';
  items: string[];
  /** Glyph rendered between items; defaults to '·'. */
  separator?: string;
  speed?: MarqueeSpeed;
  reverse?: boolean;
}

export const BLOG_VARIANTS = ['latest', 'all'] as const;

export type BlogVariant = (typeof BLOG_VARIANTS)[number];

/**
 * Blog section rendered inside a tab — the user composes their own blog
 * area from these. `latest` = grid of the 3 newest posts; `all` =
 * horizontal stacked rows of everything published. Absent = `latest`.
 */
export interface BlogBlock extends BlockBase {
  type: 'blog';
  title: string;
  variant?: BlogVariant;
}

export type Block =
  | FeaturedHeroBlock
  | AppGridBlock
  | RichTextBlock
  | CustomHtmlBlock
  | MarqueeBlock
  | BlogBlock;

export type BlockType = Block['type'];

export interface Tab {
  id: string;
  label: string;
  blocks: Block[];
}

export const THEME_SKINS = ['hud', 'notebook', 'clean'] as const;

export type ThemeSkin = (typeof THEME_SKINS)[number];

export interface ThemeConfig {
  accentColor?: string;
  fontFamily?: string;
}

export interface FooterConfig {
  enabled: boolean;
  copyrightText?: string;
  showSocials?: boolean;
}

export interface PortfolioData {
  version: 3;
  skin: ThemeSkin;
  theme: ThemeConfig;
  /** Global card library — single source of truth for app cards (v3). */
  cards: AppCardItem[];
  tabs: Tab[];
  socials?: SocialLink[];
  footer?: FooterConfig;
  /**
   * Media library registry. Stores **URL references only** — the bytes
   * live in storage (/public/uploads today, S3/CDN later). Additive
   * optional field, so no document version bump.
   */
  assets?: AssetItem[];
  /** Blog posts (budget Medium). Additive optional — no version bump. */
  posts?: Post[];
}

export const POST_STATUSES = ['draft', 'published'] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export interface Post {
  id: string;
  title: string;
  /** Rich HTML authored through the shared RichTextEditor. */
  content: string;
  coverImage?: string;
  status: PostStatus;
  /** ISO date set on first publish; drafts have none. */
  publishedAt?: string;
}

export interface AssetItem {
  id: string;
  url: string;
  /** Display name (original filename) for the picker grid. */
  name?: string;
}
