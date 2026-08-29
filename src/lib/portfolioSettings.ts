/**
 * 5e-f — the dashboard settings patch, PURE (imports schema types only).
 *
 * Dashboard "Settings" saves doc-level metadata (slug / visibility /
 * showcase) by PUTting the WHOLE document: fetch a fresh doc from
 * GET /api/portfolio?full=1, apply THIS patch, PUT it back (the server
 * re-validates the slug — 400/409 — and maintains the registry). This
 * module is the pure middle step so the verify script can pin its exact
 * behavior without any wiring.
 *
 * Stored shape: the patcher writes the SAME absent-defaults shape
 * `prepareDocument` produces (private -> key absent, showcase false ->
 * key absent — never null, never an explicit undefined), so a patched
 * doc round-trips byte-stably through prepareDocument/JSON just like a
 * server-sanitized one. Only non-defaults are ever stored.
 */

import { normalizeSlug } from '../types/schema';
import type { PortfolioData, PortfolioVisibility } from '../types/schema';

export interface PortfolioSettingsPatch {
  slug: string;
  visibility: PortfolioVisibility;
  showcase: boolean;
}

/**
 * Validate + apply a settings patch onto `doc` WITHOUT mutating it.
 * Returns a NEW document with exactly three keys replaced — every other
 * field is carried over by reference, untouched:
 * - `slug`: normalizeSlug'd (trim -> lowercase -> pattern+reserved);
 *   invalid -> null (the caller stops, no PUT happens).
 * - `visibility`: 'public' -> key stored as 'public'; anything else
 *   (private) -> key ABSENT (absent = private, never null).
 * - `showcase`: true -> key stored as true; false -> key ABSENT.
 */
export function applySettingsPatch(
  doc: PortfolioData,
  next: PortfolioSettingsPatch,
): PortfolioData | null {
  const slug = normalizeSlug(next.slug);
  if (slug === null) return null;

  // Shallow copy: nested fields (tabs/theme/cards/...) stay shared with
  // the input by reference; only the three root keys differ.
  const out: PortfolioData = { ...doc };
  out.slug = slug;
  if (next.visibility === 'public') out.visibility = 'public';
  else delete out.visibility;
  if (next.showcase === true) out.showcase = true;
  else delete out.showcase;
  return out;
}
