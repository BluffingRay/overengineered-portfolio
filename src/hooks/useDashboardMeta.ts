'use client';

import { useEffect, useState } from 'react';

export interface PortfolioMeta {
  exists: boolean;
  slug: string | null;
  visibility: 'private' | 'public';
  showcase: boolean;
}

function parseMeta(data: unknown): PortfolioMeta {
  const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  return {
    exists: d.exists === true,
    slug: typeof d.slug === 'string' && d.slug !== '' ? d.slug : null,
    visibility: d.visibility === 'public' ? 'public' : 'private',
    showcase: d.showcase === true,
  };
}

function extractDocTitle(doc: unknown): string {
  if (typeof doc !== 'object' || doc === null) return 'Untitled portfolio';
  const tabs = (doc as { tabs?: unknown }).tabs;
  if (!Array.isArray(tabs)) return 'Untitled portfolio';
  for (const tab of tabs) {
    const blocks = (tab as { blocks?: unknown } | null)?.blocks;
    if (!Array.isArray(blocks)) continue;
    for (const block of blocks) {
      if (typeof block !== 'object' || block === null) continue;
      const b = block as { type?: unknown; name?: unknown; heading?: unknown };
      if (b.type !== 'featured_hero') continue;
      if (typeof b.name === 'string' && b.name.trim() !== '') return b.name;
      if (typeof b.heading === 'string' && b.heading.trim() !== '') return b.heading;
      return 'Untitled portfolio';
    }
  }
  return 'Untitled portfolio';
}

/**
 * H5 — meta hook: owns GET /api/portfolio/meta + ?full=1 hero title fetch.
 * Showcase stays in DashboardView (5g-a epoch discipline). This hook mirrors
 * the exact fetch/error/ready semantics DashboardView had inline.
 */
export function useDashboardMeta(authReady: boolean, authenticated: boolean) {
  const [meta, setMeta] = useState<PortfolioMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [heroTitle, setHeroTitle] = useState<string | null>(null);
  const [heroTitleReady, setHeroTitleReady] = useState(false);

  useEffect(() => {
    if (!authReady || !authenticated) return;
    let active = true;
    async function load() {
      try {
        const metaRes = await fetch('/api/portfolio/meta');
        if (!active) return;
        let parsedMeta: PortfolioMeta | null = null;
        if (metaRes.ok) {
          parsedMeta = parseMeta(await metaRes.json());
          setMeta(parsedMeta);
          setMetaError(null);
        } else {
          setMetaError('Could not load your portfolio.');
        }
        if (parsedMeta?.exists) {
          const fullRes = await fetch('/api/portfolio?full=1');
          if (!active) return;
          setHeroTitle(extractDocTitle(fullRes.ok ? await fullRes.json() : null));
          setHeroTitleReady(true);
        }
      } catch {
        if (!active) return;
        setMetaError('Could not load your portfolio.');
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [authReady, authenticated]);

  return {
    meta,
    setMeta,
    metaError,
    setMetaError,
    heroTitle,
    setHeroTitle,
    heroTitleReady,
    setHeroTitleReady,
    extractDocTitle,
  };
}
