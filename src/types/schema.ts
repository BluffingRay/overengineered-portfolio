export const SPACINGS = ['none', 'compact', 'normal', 'spacious'] as const;

export type BlockSpacing = (typeof SPACINGS)[number];

interface BlockBase {
  id: string;
  spacing?: BlockSpacing;
}

export const IMAGE_ALIGNMENTS = ['left', 'right', 'top', 'backdrop'] as const;

export type ImageAlignment = (typeof IMAGE_ALIGNMENTS)[number];

export interface FeaturedHeroBlock extends BlockBase {
  type: 'featured_hero';
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
  thumbnail: string;
  imageAlign?: ImageAlignment;
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
  category?: string;
  primaryAction?: PrimaryAction;
}

export const PRIMARY_ACTIONS = ['demo', 'github', 'href'] as const;

export type PrimaryAction = (typeof PRIMARY_ACTIONS)[number];

export interface AppGridBlock extends BlockBase {
  type: 'app_grid';
  title: string;
  apps: AppCardItem[];
}

export interface RichTextBlock extends BlockBase {
  type: 'rich_text';
  content: string;
}

export interface CustomHtmlBlock extends BlockBase {
  type: 'custom_html';
  html: string;
}

export type Block =
  | FeaturedHeroBlock
  | AppGridBlock
  | RichTextBlock
  | CustomHtmlBlock;

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
}

export interface PortfolioData {
  version: 2;
  skin: ThemeSkin;
  theme: ThemeConfig;
  tabs: Tab[];
}
