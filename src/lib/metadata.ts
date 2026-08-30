/**
 * 5d-a — pure portfolio metadata helpers (imports schema types only; no
 * side effects, server-safe, tsx-runnable — the verify script runs these
 * directly). The document is the only input: every tag derives from the
 * hero fields it already carries — no schema changes, no migration.
 *
 * The return value is a plain object shaped like Next's `Metadata` fields
 * (title kept as a plain string — callers decide absolute vs template).
 * Hostile docs are already sanitized upstream (prepareDocument /
 * sanitizePortfolioDocument), but every read stays defensive so a
 * degenerate doc (empty tabs, missing hero, cast garbage) yields the
 * fallbacks — never a throw.
 */

import type { FeaturedHeroBlock, PortfolioData } from '@/types/schema';

/** Hard cap for the rich-text description fallback (meta description ≈ prose). */
const DESCRIPTION_MAX_CHARS = 160;

const TITLE_FALLBACK = 'Portfolio';

/**
 * Shaped like the Metadata fields it maps to. `description` and the
 * optional `openGraph`/`twitter` fields are OMITTED (key absent, never
 * null/undefined) when nothing yields non-empty text — same
 * absent-defaults discipline as the document sanitizers. `twitter` is a
 * discriminated union on `card` so it stays assignable to Next's `Twitter`
 * (a plain `card: A | B` union is not).
 */
export interface PortfolioMetadata {
  title: string;
  description?: string;
  openGraph: {
    title: string;
    description?: string;
    type: 'website';
    url?: string;
    images?: string[];
  };
  twitter:
    | { card: 'summary_large_image'; title: string; description?: string }
    | { card: 'summary'; title: string; description?: string };
}

/**
 * 5e-a default, restated for tags: absent visibility = private. Only an
 * explicit 'public' doc is search-engine material — the /u/[slug] leak
 * rule keys off this single predicate.
 */
export function isPubliclyIndexable(doc: PortfolioData): boolean {
  return doc.visibility === 'public';
}

/** First non-empty (after trim) value — returns the RAW string, matching
 * the registry's deriveDocTitle precedent (trim is the emptiness test,
 * not a normalization). */
function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (value !== undefined && value.trim() !== '') return value;
  }
  return undefined;
}

/** The doc's identity block — the FIRST featured_hero across all tabs. */
function findHero(doc: PortfolioData): FeaturedHeroBlock | undefined {
  for (const tab of doc.tabs ?? []) {
    for (const block of tab.blocks ?? []) {
      if (block.type === 'featured_hero') return block;
    }
  }
  return undefined;
}

/**
 * First rich_text block's visible text: tags become separators, whitespace
 * collapses, hard-capped. The FIRST block decides — one that strips to
 * nothing ends the chain (omitted description), mirroring deriveDocTitle's
 * first-hero-decides rule.
 */
function firstRichTextSummary(doc: PortfolioData): string | undefined {
  for (const tab of doc.tabs ?? []) {
    for (const block of tab.blocks ?? []) {
      if (block.type !== 'rich_text') continue;
      const text = (block.content ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, DESCRIPTION_MAX_CHARS);
      return text || undefined;
    }
  }
  return undefined;
}

/**
 * The doc's SEO metadata.
 *
 * Title chain: hero `name` → hero `heading` → first tab's label →
 * 'Portfolio'. Description chain: hero `subheading` → hero `heading` →
 * first rich_text block's stripped text (capped) → the field is omitted
 * entirely.
 *
 * OG image: the hero thumbnail, but only when it can be expressed
 * ABSOLUTELY — root-relative (`/…`) joins `opts.baseUrl` (trailing slash
 * stripped to avoid `//` joins), http(s) passes through, anything else
 * (or a root-relative value with no baseUrl) is omitted: a relative
 * og:image is invalid. `url` is `opts.baseUrl` when provided.
 */
export function buildPortfolioMetadata(
  doc: PortfolioData,
  opts?: { baseUrl?: string },
): PortfolioMetadata {
  const hero = findHero(doc);
  const firstTabLabel = doc.tabs?.[0]?.label;

  const title =
    firstNonEmpty(hero?.name, hero?.heading, firstTabLabel) ?? TITLE_FALLBACK;

  const description = firstNonEmpty(
    hero?.subheading,
    hero?.heading,
    firstRichTextSummary(doc),
  );

  const rawThumbnail = hero?.thumbnail ?? '';
  const baseUrl = opts?.baseUrl;
  let ogImage: string | undefined;
  if (/^https?:\/\//i.test(rawThumbnail)) {
    ogImage = rawThumbnail;
  } else if (
    // Root-relative only — `//host/…` (protocol-relative) is neither
    // root-relative nor absolute; joining it onto baseUrl makes garbage.
    rawThumbnail.startsWith('/') &&
    !rawThumbnail.startsWith('//') &&
    baseUrl
  ) {
    ogImage = `${baseUrl.replace(/\/+$/, '')}${rawThumbnail}`;
  }

  return {
    title,
    ...(description !== undefined ? { description } : {}),
    openGraph: {
      title,
      ...(description !== undefined ? { description } : {}),
      type: 'website',
      ...(baseUrl !== undefined ? { url: baseUrl } : {}),
      ...(ogImage !== undefined ? { images: [ogImage] } : {}),
    },
    twitter:
      ogImage !== undefined
        ? {
            card: 'summary_large_image',
            title,
            ...(description !== undefined ? { description } : {}),
          }
        : {
            card: 'summary',
            title,
            ...(description !== undefined ? { description } : {}),
          },
  };
}

// 5d-b — OG image inputs. Satori cannot resolve CSS variables or arbitrary
// color syntaxes: the card paints `accent` literally, so only a clean hex
// literal may pass through — anything else (admins type junk) falls back to
// the neutral constant. Kept beside the 5d-a helpers so the card data rides
// the SAME title/description derivation — no second chain to keep in sync.

/** Neutral-900 fallback for the card accent + the generic (non-public) render. */
export const OG_ACCENT = '#171717';

/** The only accent shape satori can paint — a hex literal (3–8 digits). */
const OG_ACCENT_PATTERN = /^#[0-9a-f]{3,8}$/i;

/**
 * Shape fed to the shared satori card (`src/components/og/OgCard.tsx`).
 * Same absent-defaults discipline as `PortfolioMetadata`: `subtitle` is
 * OMITTED (key absent, never null/undefined) when the description chain
 * yields nothing, so the card renders without a muted row.
 */
export interface OgCardData {
  title: string;
  subtitle?: string;
  accent: string;
}

/**
 * 5d-b — pure card-data derivation for the OG image routes. title/subtitle
 * ARE `buildPortfolioMetadata(doc)`'s title/description (the 5d-a chains —
 * deliberately not re-derived); `accent` is the doc's accentColor only when
 * it is a clean hex literal, else `OG_ACCENT`. Defensive like everything in
 * this module: a degenerate doc yields the fallbacks, never a throw.
 */
export function buildOgCardData(doc: PortfolioData): OgCardData {
  const meta = buildPortfolioMetadata(doc);
  const rawAccent = doc.theme?.accentColor;
  const accent =
    typeof rawAccent === 'string' && OG_ACCENT_PATTERN.test(rawAccent)
      ? rawAccent
      : OG_ACCENT;
  return {
    title: meta.title,
    ...(meta.description !== undefined ? { subtitle: meta.description } : {}),
    accent,
  };
}
