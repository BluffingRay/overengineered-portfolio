/**
 * 5e-d — onboarding doc generator (pure; no React, no editor, no storage).
 *
 * Builds the FRESH initial document for a brand-new hosted portfolio:
 * never seed-derived (the seed's content must not leak into new
 * portfolios — the cards library included), so every field is constructed
 * from scratch to satisfy `schema.ts` + `isPortfolioData`. The server
 * (PUT /api/portfolio) confirms + sanitizes + registers the slug claim;
 * the caller writes the CONFIRMED doc into the local draft store.
 *
 * Hero identity model: `name` renders as the H1 when present, so
 * `heading` carries the tagline and roles cycle underneath it.
 */

import { normalizeSlug } from '@/types/schema';
import type {
  BlockDesign,
  FeaturedHeroBlock,
  PortfolioData,
  RichTextBlock,
  Tab,
} from '@/types/schema';

export interface BuildInitialDocInput {
  name: string;
  /** One role -> hero.roles[0]; blank/whitespace = absent. */
  role: string;
  design: BlockDesign;
  /** Already-normalized slug claim (the caller validates via normalizeSlug). */
  slug: string;
}

/** Escape interpolated user text going into the rich_text HTML template. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHero(input: BuildInitialDocInput): FeaturedHeroBlock {
  const name = input.name.trim();
  const role = input.role.trim();

  return {
    id: crypto.randomUUID(),
    type: 'featured_hero',
    design: input.design,
    // Name becomes the H1; `heading` below renders as the tagline <p>.
    name,
    // Conditional spread: absent when blank — optional fields are never null.
    ...(role !== '' ? { roles: [role] } : {}),
    heading: 'Welcome to my little corner of the internet.',
    subheading: '',
    // The primary CTA renders in every hero design, so carry a usable,
    // honest pair: '#' passes through as a plain anchor (never a tab).
    ctaLabel: 'Welcome',
    ctaHref: '#',
    thumbnail: '',
    // Banner: the one layout whose empty-thumbnail render is CLEAN (the
    // others show the NO IMAGE placeholder slot). A fresh portfolio gets a
    // text-only masthead; adding a photo later grows it into the banner.
    layout: 'banner',
  };
}

function buildIntro(input: BuildInitialDocInput): RichTextBlock {
  const name = escapeHtml(input.name.trim());
  return {
    id: crypto.randomUUID(),
    type: 'rich_text',
    design: input.design,
    content: `<p>Hi, I'm ${name} — this portfolio is brand new. More work is on the way soon.</p>`,
  };
}

/**
 * The generated doc: version 3, clean skin, one "Home" tab with a hero +
 * a short welcome paragraph. Meta = the claimed slug only — visibility/
 * showcase (and socials/footer/cards/assets/posts) stay ABSENT (absent =
 * private / not showcased / empty).
 */
export function buildInitialDoc(input: BuildInitialDocInput): PortfolioData {
  const home: Tab = {
    id: crypto.randomUUID(),
    label: 'Home',
    blocks: [buildHero(input), buildIntro(input)],
  };

  return {
    version: 3,
    skin: 'clean',
    theme: {},
    cards: [],
    tabs: [home],
    slug: input.slug,
  };
}

/**
 * Suggest a slug from a display name: lowercase -> collapse runs of
 * spaces/hyphens -> strip invalid characters -> collapse again (stripping
 * can create new adjacency) -> trim edge hyphens -> clamp to 40 (then
 * re-trim, a clamp can end on a hyphen). Returns '' whenever the result
 * fails normalizeSlug — the caller falls back to manual input.
 */
export function suggestSlug(name: string): string {
  const candidate = name
    .toLowerCase()
    .replace(/[\s-]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '');

  return normalizeSlug(candidate) ?? '';
}
