import { initialData } from '@/data/initialData';
import {
  BLOCK_DESIGNS,
  BLOCK_WIDTHS,
  BLOG_VARIANTS,
  clampViewScale,
  HERO_MEDIA_FRAMES,
  MARQUEE_SPEEDS,
  MEDIA_POSITIONS,
  MEDIA_SIDES,
  NAME_FITS,
  normalizeSlug,
  POST_STATUSES,
  HERO_MEDIA_RATIOS,
  HERO_MEDIA_RADIUS,
  HERO_MEDIA_SIZES,
  SOCIAL_PLATFORMS,
  THEME_SKINS,
} from '@/types/schema';
import type {
  AppCardItem,
  AssetItem,
  FooterConfig,
  PortfolioData,
  Post,
  SocialLink,
  Tab,
} from '@/types/schema';

const STORAGE_KEY = 'portfolio-data';
const CHANGE_EVENT = 'portfolio-data:changed';

const CURRENT_VERSION = 3;

interface SnapshotCache {
  raw: string | null;
  data: PortfolioData;
}

let snapshotCache: SnapshotCache | null = null;
const listeners = new Set<() => void>();

const HISTORY_LIMIT = 25;
const undoStack: PortfolioData[] = [];
let redoStack: PortfolioData[] = [];

interface HistorySnapshot {
  canUndo: boolean;
  canRedo: boolean;
}

const EMPTY_HISTORY: HistorySnapshot = { canUndo: false, canRedo: false };
let historySnapshot: HistorySnapshot = EMPTY_HISTORY;

function syncHistorySnapshot(): void {
  const next: HistorySnapshot = {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };

  if (next.canUndo !== historySnapshot.canUndo || next.canRedo !== historySnapshot.canRedo) {
    historySnapshot = next;
  }
}

export function getHistorySnapshot(): HistorySnapshot {
  return historySnapshot;
}

export function getHistoryServerSnapshot(): HistorySnapshot {
  return EMPTY_HISTORY;
}

function pristine(): PortfolioData {
  return structuredClone(initialData);
}

function isValidAppCard(value: unknown): value is AppCardItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AppCardItem).id === 'string' &&
    typeof (value as AppCardItem).name === 'string' &&
    typeof (value as AppCardItem).href === 'string'
  );
}

function isPortfolioData(value: unknown): value is PortfolioData {
  if (typeof value !== 'object' || value === null) return false;

  const data = value as Record<string, unknown>;
  if (data.version !== CURRENT_VERSION) return false;
  if (typeof data.skin !== 'string' || !THEME_SKINS.some((s) => s === data.skin))
    return false;
  if (!Array.isArray(data.cards)) return false;
  if (!data.cards.every(isValidAppCard)) return false;
  if (!Array.isArray(data.tabs)) return false;

  const knownIds = new Set((data.cards as AppCardItem[]).map((c) => c.id));

  return data.tabs.every((tab): tab is Tab => {
    if (typeof tab !== 'object' || tab === null) return false;
    const t = tab as Record<string, unknown>;
    if (
      typeof t.id !== 'string' ||
      typeof t.label !== 'string' ||
      !Array.isArray(t.blocks)
    ) {
      return false;
    }
    return (t.blocks as Record<string, unknown>[]).every(
      (block) =>
        block.type !== 'app_grid' ||
        (Array.isArray(block.apps) &&
          block.apps.every(
            (ref) => typeof ref === 'string' && knownIds.has(ref),
          )),
    );
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function migrateRichTextContent(content: string): string {
  if (/<\/?[a-z][^>]*>/i.test(content)) return content;

  return content
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');
}

function sanitizeSocials(candidate: unknown): SocialLink[] | undefined {
  if (candidate === undefined) return undefined;
  if (!Array.isArray(candidate)) return undefined;

  const socials = candidate.filter(
    (entry): entry is SocialLink =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as SocialLink).id === 'string' &&
      typeof (entry as SocialLink).url === 'string' &&
      SOCIAL_PLATFORMS.some((p) => p === (entry as SocialLink).platform),
  );

  return socials.length > 0 ? socials : undefined;
}

function sanitizeFooter(candidate: unknown): FooterConfig | undefined {
  if (typeof candidate !== 'object' || candidate === null) return undefined;

  const footer = candidate as Partial<FooterConfig>;
  if (typeof footer.enabled !== 'boolean') return undefined;

  return {
    enabled: footer.enabled,
    copyrightText:
      typeof footer.copyrightText === 'string' && footer.copyrightText
        ? footer.copyrightText
        : undefined,
    showSocials: footer.showSocials === true ? true : undefined,
  };
}

function pickEnum<T extends string>(
  values: readonly T[],
  value: unknown,
): T | undefined {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function sanitizeHeroMedia(block: Record<string, unknown>): Record<string, unknown> {
  if (block.type !== 'featured_hero') return block;

  const media = {
    mediaRatio: pickEnum(HERO_MEDIA_RATIOS, block.mediaRatio),
    mediaRadius: pickEnum(HERO_MEDIA_RADIUS, block.mediaRadius),
    mediaSize: pickEnum(HERO_MEDIA_SIZES, block.mediaSize),
    mediaFrame: pickEnum(HERO_MEDIA_FRAMES, block.mediaFrame),
    mediaSide: pickEnum(MEDIA_SIDES, block.mediaSide),
    mediaPosition: pickEnum(MEDIA_POSITIONS, block.mediaPosition),
  };

  const cleaned = Object.fromEntries(
    Object.entries(media).filter(([, value]) => value !== undefined),
  );

  const hadAny =
    block.mediaRatio !== undefined ||
    block.mediaRadius !== undefined ||
    block.mediaSize !== undefined ||
    block.mediaFrame !== undefined ||
    block.mediaSide !== undefined ||
    block.mediaPosition !== undefined;

  if (!hadAny) return block;

  return { ...block, ...cleaned };
}

function sanitizeBlockWidth(block: Record<string, unknown>): Record<string, unknown> {
  if (block.type !== 'rich_text' && block.type !== 'custom_html') return block;
  if (block.width === undefined) return block;

  const width = pickEnum(BLOCK_WIDTHS, block.width);
  if (width !== undefined) return { ...block, width };

  return Object.fromEntries(
    Object.entries(block).filter(([key]) => key !== 'width'),
  );
}

function sanitizeHeroEyebrow(block: Record<string, unknown>): Record<string, unknown> {
  if (block.type !== 'featured_hero' || block.eyebrow === undefined) return block;
  if (typeof block.eyebrow === 'string' && block.eyebrow.trim() !== '') {
    return { ...block, eyebrow: block.eyebrow.slice(0, 80) };
  }
  return Object.fromEntries(
    Object.entries(block).filter(([key]) => key !== 'eyebrow'),
  );
}

function sanitizeHeroIdentity(block: Record<string, unknown>): Record<string, unknown> {
  if (block.type !== 'featured_hero') return block;

  const clean: Record<string, unknown> = { ...block };

  if (typeof clean.name === 'string' && clean.name.trim() !== '') {
    clean.name = clean.name.trim().slice(0, 60);
  } else {
    delete clean.name;
  }

  clean.nameFit = pickEnum(NAME_FITS, clean.nameFit);

  if (Array.isArray(clean.roles)) {
    const roles = clean.roles.filter(
      (role): role is string => typeof role === 'string' && role.trim() !== '',
    );
    clean.roles = roles.length > 0 ? roles.slice(0, 8) : undefined;
  } else {
    delete clean.roles;
  }

  return Object.fromEntries(
    Object.entries(clean).filter(([, value]) => value !== undefined),
  );
}

function sanitizeMarquee(block: Record<string, unknown>): Record<string, unknown> {
  if (block.type !== 'marquee') return block;

  const clean: Record<string, unknown> = { ...block };

  if (!Array.isArray(clean.items)) {
    clean.items = [];
  } else {
    clean.items = clean.items.filter(
      (item): item is string => typeof item === 'string' && item.trim() !== '',
    );
  }

  clean.speed = pickEnum(MARQUEE_SPEEDS, clean.speed);
  clean.reverse = clean.reverse === true ? true : undefined;

  if (typeof clean.separator !== 'string' || clean.separator.length > 3) {
    delete clean.separator;
  }

  return Object.fromEntries(
    Object.entries(clean).filter(([, value]) => value !== undefined),
  );
}

function sanitizeBlogBlock(block: Record<string, unknown>): Record<string, unknown> {
  if (block.type !== 'blog') return block;

  const clean: Record<string, unknown> = { ...block };

  clean.title =
    typeof clean.title === 'string' && clean.title.trim() !== ''
      ? clean.title.trim()
      : 'Blog';

  clean.variant = pickEnum(BLOG_VARIANTS, clean.variant);

  // Legacy from the briefly-lived limit field — always stripped.
  delete clean.limit;

  return Object.fromEntries(
    Object.entries(clean).filter(([, value]) => value !== undefined),
  );
}

/**
 * Art direction (`design?`) exists on every block except custom_html.
 * Unknown values are stripped — absent falls back to the default design.
 * Legacy `coder` (pre-rename) maps to `default`.
 */
function sanitizeBlockDesign(block: Record<string, unknown>): Record<string, unknown> {
  if (
    block.type !== 'featured_hero' &&
    block.type !== 'app_grid' &&
    block.type !== 'rich_text' &&
    block.type !== 'marquee' &&
    block.type !== 'blog'
  ) {
    return block;
  }
  if (block.design === undefined) return block;
  if (block.design === 'coder') return { ...block, design: 'default' };

  const design = pickEnum(BLOCK_DESIGNS, block.design);
  if (design !== undefined) return { ...block, design };

  return Object.fromEntries(
    Object.entries(block).filter(([key]) => key !== 'design'),
  );
}

function sanitizeBlock(block: Record<string, unknown>): Record<string, unknown> {
  return sanitizeBlockDesign(
    sanitizeBlogBlock(
      sanitizeMarquee(
        sanitizeHeroIdentity(
          sanitizeHeroEyebrow(sanitizeBlockWidth(sanitizeHeroMedia(block))),
        ),
      ),
    ),
  );
}

function migrateV1ToV2(
  document: Record<string, unknown>,
): Record<string, unknown> {
  const tabs: Array<Record<string, unknown>> = Array.isArray(document.tabs)
    ? document.tabs
    : [];

  return {
    ...document,
    version: CURRENT_VERSION,
    tabs: tabs.map((tab) => ({
      ...tab,
      blocks: Array.isArray(tab.blocks)
        ? (tab.blocks as Array<Record<string, unknown>>).map((block) =>
            block.type === 'rich_text' && typeof block.content === 'string'
              ? {
                  ...block,
                  content: migrateRichTextContent(block.content),
                }
              : block,
          )
        : [],
    })),
  };
}

function sanitizeThemeFont(theme: unknown): Record<string, unknown> {
  if (typeof theme !== 'object' || theme === null) return {};
  const clean = { ...(theme as Record<string, unknown>) };
  if (typeof clean.fontFamily !== 'string' || clean.fontFamily.trim() === '') {
    delete clean.fontFamily;
  } else {
    clean.fontFamily = clean.fontFamily.slice(0, 200);
  }
  // Additive optional — no version bump.
  if (clean.lockSkin !== true) delete clean.lockSkin;
  if (typeof clean.accentColor === 'string' && clean.accentColor.trim() === '') {
    delete clean.accentColor;
  } else if (typeof clean.accentColor === 'string') {
    clean.accentColor = clean.accentColor.slice(0, 32);
  }
  // Additive optional — no version bump. Absent at the default (1).
  if (typeof clean.viewScale === 'number' && Number.isFinite(clean.viewScale) && clean.viewScale !== 1) {
    clean.viewScale = clampViewScale(clean.viewScale);
  } else {
    delete clean.viewScale;
  }
  return clean;
}

/**
 * v2 -> v3: hoist every inline app card into the root library and swap
 * each grid's embedded list for ordered id references. Cards sharing an
 * id but diverging in content get a fresh id on the later copy.
 */
function migrateV2ToV3(
  document: Record<string, unknown>,
): Record<string, unknown> {
  const library: Record<string, unknown>[] = [];
  const indexById = new Map<string, number>();

  const tabs = Array.isArray(document.tabs) ? document.tabs : [];
  const nextTabs = (tabs as Record<string, unknown>[]).map((tab) => ({
    ...tab,
    blocks: Array.isArray(tab.blocks) ? tab.blocks : [],
  }));

  for (const tab of nextTabs) {
    tab.blocks = (tab.blocks as Record<string, unknown>[]).map((block) => {
      if (block.type !== 'app_grid' || !Array.isArray(block.apps)) {
        return block;
      }

      const refs: string[] = [];
      for (const app of block.apps as Record<string, unknown>[]) {
        if (
          typeof app !== 'object' ||
          app === null ||
          typeof app.id !== 'string'
        ) {
          continue;
        }

        let id = app.id;
        const existingIndex = indexById.get(id);
        if (
          existingIndex !== undefined &&
          JSON.stringify(library[existingIndex]) !== JSON.stringify(app)
        ) {
          // Same id, different content: keep both, re-id this one.
          id = crypto.randomUUID();
        }
        if (existingIndex === undefined) {
          indexById.set(id, library.length);
          library.push({ ...app, id });
        }
        refs.push(id);
      }

      return { ...block, apps: refs };
    });
  }

  return { ...document, version: CURRENT_VERSION, cards: library, tabs: nextTabs };
}

function sanitizeAssets(
  candidate: unknown,
): AssetItem[] | undefined {
  if (!Array.isArray(candidate)) return undefined;

  const seenUrls = new Set<string>();
  const assets: AssetItem[] = [];

  for (const raw of candidate) {
    if (typeof raw !== 'object' || raw === null) continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== 'string' || item.id.trim() === '') continue;
    // URL references only: absolute http(s) or root-relative paths.
    if (
      typeof item.url !== 'string' ||
      !/^(https?:\/\/|\/)/.test(item.url)
    ) {
      continue;
    }
    if (seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);

    assets.push({
      id: item.id.slice(0, 64),
      url: item.url,
      ...(typeof item.name === 'string' && item.name.trim() !== ''
        ? { name: item.name.slice(0, 120) }
        : {}),
    });
    if (assets.length >= 200) break;
  }

  return assets.length > 0 ? assets : undefined;
}

function sanitizePosts(candidate: unknown): Post[] | undefined {
  if (!Array.isArray(candidate)) return undefined;

  const posts: Post[] = [];
  for (const raw of candidate.slice(0, 100)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== 'string' || item.id.trim() === '') continue;
    const status =
      typeof item.status === 'string' &&
      (POST_STATUSES as readonly string[]).includes(item.status)
        ? (item.status as Post['status'])
        : 'draft';

    posts.push({
      id: item.id.slice(0, 64),
      // Kept verbatim (length-capped): the composer owns trimming via its
      // draft buffer — normalizing here would fight typing (spaces,
      // clearing the field). Empty titles render as "Untitled".
      title: typeof item.title === 'string' ? item.title.slice(0, 160) : '',
      content: typeof item.content === 'string' ? item.content : '<p></p>',
      status,
      ...(status === 'published' &&
      typeof item.publishedAt === 'string' &&
      item.publishedAt
        ? { publishedAt: item.publishedAt }
        : {}),
      ...(typeof item.coverImage === 'string' && item.coverImage.trim() !== ''
        ? { coverImage: item.coverImage }
        : {}),
    });
  }

  return posts.length > 0 ? posts : undefined;
}

export function prepareDocument(parsed: unknown): PortfolioData | null {
  if (typeof parsed !== 'object' || parsed === null) return null;

  let candidate = parsed as Record<string, unknown>;

  if (candidate.version === 1) {
    candidate = migrateV1ToV2(candidate);
  }
  if (candidate.version === 2) {
    candidate = migrateV2ToV3(candidate);
  }

  const rawCards = Array.isArray(candidate.cards) ? candidate.cards : [];
  const seenIds = new Set<string>();
  const validCards = rawCards.filter((card): card is AppCardItem => {
    if (!isValidAppCard(card) || seenIds.has(card.id)) return false;
    seenIds.add(card.id);
    return true;
  });

  // Posts resolve first so card custom links can drop dangling references.
  const posts = sanitizePosts(candidate.posts);
  const postIds = new Set((posts ?? []).map((post) => post.id));

  const cards = validCards.map((card) => ({
    ...card,
    ...(typeof card.customLabel === 'string' && card.customLabel.trim() !== ''
      ? { customLabel: card.customLabel.trim().slice(0, 40) }
      : {}),
    ...(typeof card.customUrl === 'string' &&
    /^(https?:\/\/|\/)/.test(card.customUrl.trim())
      ? { customUrl: card.customUrl.trim().slice(0, 500) }
      : {}),
    ...(typeof card.customPostId === 'string' && postIds.has(card.customPostId)
      ? { customPostId: card.customPostId }
      : {}),
  }));

  candidate = {
    ...candidate,
    cards,
    theme: sanitizeThemeFont(candidate.theme),
    socials: sanitizeSocials(candidate.socials),
    tabs: Array.isArray(candidate.tabs)
      ? candidate.tabs.map((tab) => {
          if (typeof tab !== 'object' || tab === null) return tab;
          const t = tab as Record<string, unknown>;
          if (!Array.isArray(t.blocks)) return tab;
          return {
            ...t,
            blocks: t.blocks.map(sanitizeBlock).map((block) => {
              const b = block as Record<string, unknown>;
              if (b.type !== 'app_grid' || !Array.isArray(b.apps)) return b;
              return {
                ...b,
                apps: b.apps.filter(
                  (ref) => typeof ref === 'string' && seenIds.has(ref),
                ),
              };
            }),
          };
        })
      : candidate.tabs,
    footer: sanitizeFooter(candidate.footer),
    assets: sanitizeAssets(candidate.assets),
    posts,
    // 5e-a hosted metadata: explicitly override the raw spread so invalid
    // values never ride through — invalid/dropped = absent = default.
    slug: normalizeSlug(candidate.slug) ?? undefined,
    visibility: candidate.visibility === 'public' ? 'public' : undefined,
    showcase: candidate.showcase === true ? true : undefined,
  };

  return isPortfolioData(candidate) ? candidate : null;
}

export function getPortfolioDataSnapshot(): PortfolioData {
  if (typeof window === 'undefined') return initialData;

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (snapshotCache && snapshotCache.raw === raw) {
    return snapshotCache.data;
  }

  let data = pristine();
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      const prepared = prepareDocument(parsed);
      if (prepared) data = prepared;
    } catch {
      data = pristine();
    }
  }

  snapshotCache = { raw, data };
  return data;
}

export function getPortfolioDataServerSnapshot(): PortfolioData {
  return initialData;
}

export function subscribeToPortfolioData(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  window.addEventListener(CHANGE_EVENT, listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function importPortfolioData(raw: string): PortfolioData | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return prepareDocument(parsed);
  } catch {
    return null;
  }
}

function writeDocument(data: PortfolioData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    console.warn('[storage] could not persist portfolio data');
    return false;
  }
}

export function savePortfolioData(data: PortfolioData): void {
  if (typeof window === 'undefined') return;

  const previous = getPortfolioDataSnapshot();
  if (!writeDocument(data)) return;

  undoStack.push(previous);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  syncHistorySnapshot();

  notify();
}

export function undoPortfolioData(): void {
  if (typeof window === 'undefined' || undoStack.length === 0) return;

  const current = getPortfolioDataSnapshot();
  const target = undoStack.pop();
  if (!target || !writeDocument(target)) {
    if (target) undoStack.push(target);
    return;
  }

  redoStack.push(current);
  syncHistorySnapshot();
  notify();
}

export function redoPortfolioData(): void {
  if (typeof window === 'undefined' || redoStack.length === 0) return;

  const current = getPortfolioDataSnapshot();
  const target = redoStack.pop();
  if (!target || !writeDocument(target)) {
    if (target) redoStack.push(target);
    return;
  }

  undoStack.push(current);
  syncHistorySnapshot();
  notify();
}

export function resetPortfolioData(): void {
  if (typeof window === 'undefined') return;

  const previous = getPortfolioDataSnapshot();
  window.localStorage.removeItem(STORAGE_KEY);

  undoStack.push(previous);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  syncHistorySnapshot();

  notify();
}
