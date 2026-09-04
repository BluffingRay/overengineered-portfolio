export const SPACINGS = ['none', 'compact', 'normal', 'spacious'] as const;

export type BlockSpacing = (typeof SPACINGS)[number];

export const BLOCK_WIDTHS = ['narrow', 'wide', 'full'] as const;

export type BlockWidth = (typeof BLOCK_WIDTHS)[number];

/**
 * Per-block art direction. Designs are siblings, not skins: same data
 * contract, entirely different rendering behavior (the default hero's
 * typewriter has no place in the cutie hero). Absent = `default` =
 * the original rendering. `custom_html` deliberately has no design.
 */
export const BLOCK_DESIGNS = ['default', 'cutie', 'editorial', 'riso'] as const;

export type BlockDesign = (typeof BLOCK_DESIGNS)[number];

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
  /** Art direction — see BLOCK_DESIGNS. Absent = default. */
  design?: BlockDesign;
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
  /** Art direction — cascades onto every card rendered by this grid. */
  design?: BlockDesign;
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
  design?: BlockDesign;
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
  design?: BlockDesign;
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
  /** Art direction for the post cards (variant stays latest/all). */
  design?: BlockDesign;
  title: string;
  variant?: BlogVariant;
}

export const ENTRY_LIST_PRESETS = ['experience', 'education', 'certifications', 'affiliations'] as const;

export type EntryListPreset = (typeof ENTRY_LIST_PRESETS)[number];

export const ENTRY_LIST_COLUMNS = [1, 2, 3] as const;

export type EntryListColumns = (typeof ENTRY_LIST_COLUMNS)[number];

export interface EntryListItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Period line, e.g. "2024 — Now". */
  meta?: string;
  /** City / Remote / campus / chapter — fine print by the subtitle. */
  location?: string;
  /** GPA / latin honors / awards (education). */
  honors?: string;
  /** Cert expiry — renders on the meta line as "· Expires X". */
  expiry?: string;
  /** Credential / license ID (certifications) — mono fine print. */
  credentialId?: string;
  description?: string;
  /** Rendered on the title as an external anchor; https or root-relative. */
  link?: string;
}

/**
 * Experience / Education / Certifications / Affiliations — one block,
 * four label sets.
 * The preset restores the FORM's field labels only; the renderer never
 * reads it. `title` (section heading) is the one addition beyond the
 * locked entry shape: sibling blocks all carry a title and a headingless
 * entry list floats.
 */
export interface EntryListBlock extends BlockBase {
  type: 'entry_list';
  /** Art direction — see BLOCK_DESIGNS. */
  design?: BlockDesign;
  preset?: EntryListPreset;
  /** Optional section heading — absent = no heading. */
  title?: string;
  /** 1 (default), 2, or 3 — multi-column modes render the cards in a responsive grid. */
  columns?: EntryListColumns;
  entries: EntryListItem[];
}

export type Block =
  | FeaturedHeroBlock
  | AppGridBlock
  | RichTextBlock
  | CustomHtmlBlock
  | MarqueeBlock
  | BlogBlock
  | EntryListBlock;

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
  /** When true, visitors can't switch skins — the official skin is forced. */
  lockSkin?: boolean;
  /** Admin's default view scale (desktop zoom, 1 = 100%). Additive optional —
      no version bump; visitors override it locally, never in the document. */
  viewScale?: number;
}

export const VIEW_SCALE_MIN = 0.8;
export const VIEW_SCALE_MAX = 1.2;

export function clampViewScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(VIEW_SCALE_MAX, Math.max(VIEW_SCALE_MIN, Math.round(value * 100) / 100));
}

export interface FooterConfig {
  enabled: boolean;
  copyrightText?: string;
  showSocials?: boolean;
}

/**
 * 5e — hosted portfolio metadata. All additive optional root fields, no
 * version bump. Only NON-defaults are stored (absent = unset slug, private,
 * not showcased) — same precedent as viewScale ("absent at 1").
 */
export const PORTFOLIO_VISIBILITIES = ['private', 'public'] as const;

export type PortfolioVisibility = (typeof PORTFOLIO_VISIBILITIES)[number];

/** Public slug contract: lowercase letters/digits/hyphens, 3–40, no edge hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$/;

/** Route paths that win over /u/<slug> — never assignable as a slug. */
export const RESERVED_SLUGS = [
  'u', 'api', 'dashboard', 'write', 'blog', 'admin', 'login', 'signup',
  'edit', 'assets', 'uploads', 'images', 'public', 'static', '_next',
  'favicon.ico',
] as const;

/**
 * Normalize a user-supplied slug candidate: trim → lowercase → validate
 * against the pattern + reserved list. Returns the canonical slug or null
 * (invalid/reserved) — the single source used by the doc sanitizer and the
 * API's availability/conflict checks.
 */
export function normalizeSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) return null;
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) return null;
  return slug;
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
  /**
   * 5e hosted metadata — additive optional root fields, no version bump.
   * Absent = defaults (slug unset, private, not showcased); only
   * non-defaults are ever stored.
   */
  slug?: string;
  visibility?: PortfolioVisibility;
  showcase?: boolean;
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
