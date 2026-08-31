/**
 * FIX-C — hosted save layer (Product A only; inert in Product B).
 *
 * Model (decisions locked in AGENTS.md FIX-C):
 * - localStorage `portfolio-data` stays the DRAFT store — every editor
 *   mutation keeps writing it exactly as before.
 * - `portfolio-last-saved` (hosted mode only) holds the last
 *   server-confirmed doc snapshot. Dirty = serialized current doc ≠
 *   serialized last-saved.
 * - Explicit Save for MVP: push the draft via PUT /api/portfolio, get
 *   the SANITIZED confirmed doc back (FIX-A), write it back through the
 *   normal store (draft becomes confirmed) and record last-saved.
 *   The client reflects, never decides.
 * - On failure: keep the draft, stay dirty, surface the error. On 401:
 *   session expired — the caller surfaces re-auth.
 * - Last-save-wins on KV (no version check) — accepted MVP limit.
 */

import type { PortfolioData } from '@/types/schema';
import { saveHostedDoc } from './hosted/fetch';

export const LAST_SAVED_KEY = 'portfolio-last-saved';
export const LAST_SAVED_AT_KEY = 'portfolio-last-saved-at';

export type HostedSaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; savedAt: number }
  | { status: 'error'; message: string; needsAuth: boolean };

export type HostedSaveResult =
  | { ok: true; confirmed: PortfolioData }
  | { ok: false; error: string; needsAuth: boolean };

function readRawDraft(): string | null {
  try {
    return window.localStorage.getItem('portfolio-data');
  } catch {
    return null;
  }
}

function readLastSavedRaw(): string | null {
  try {
    return window.localStorage.getItem(LAST_SAVED_KEY);
  } catch {
    return null;
  }
}

/** Stamp the last-saved snapshot + wall-clock time (hosted mode only). */
export function recordLastSaved(doc: PortfolioData): void {
  try {
    window.localStorage.setItem(LAST_SAVED_KEY, JSON.stringify(doc));
    window.localStorage.setItem(LAST_SAVED_AT_KEY, String(Date.now()));
  } catch {
    // Storage full/blocked — dirty tracking degrades to always-dirty.
  }
}

/**
 * Seed last-saved from a server doc when hosted mode starts and no
 * snapshot exists (first visit on this device / signed in elsewhere).
 * The draft stays whatever localStorage already holds; if that makes
 * them differ, the user is correctly shown as dirty.
 */
export function seedLastSaved(doc: PortfolioData): void {
  if (readLastSavedRaw() !== null) return;
  recordLastSaved(doc);
}

/**
 * True when this device already holds a last-saved snapshot. The mount
 * seeding path needs this to tell "first visit — the baseline is about
 * to come from the cloud" apart from "known device — the snapshot is
 * the truth from the last save": seedLastSaved() silently no-ops when
 * a snapshot exists, so callers must ask BEFORE seeding.
 */
export function hasLastSaved(): boolean {
  return readLastSavedRaw() !== null;
}

/**
 * 5e-e — the FIX-C seed-overwrite offer rule, single-sourced and pure.
 *
 * Offer "Load your hosted portfolio" ONLY when the mount-time seed
 * proves the local draft is unverified:
 * - fetchOk: the mount-time ?full=1 read succeeded (failures keep
 *   today's behavior — no seed, no offer).
 * - !hadSnapshot: no prior last-saved snapshot existed, so the dirty
 *   baseline came from the cloud THIS mount. With a snapshot, dirty
 *   here is a real edit on a device that already knows the truth.
 * - dirtyNow: the local draft differs from the freshly seeded
 *   baseline — the draft is not the user's confirmed content (a fresh
 *   browser starts from the seed), so saving it would silently
 *   overwrite their hosted portfolio. A no-doc account fails this leg
 *   (draft(seed) == saved(seed)) and gets no offer — onboarding owns
 *   those users.
 */
export function resolveLoadOffer(input: {
  hadSnapshot: boolean;
  fetchOk: boolean;
  dirtyNow: boolean;
}): boolean {
  return input.fetchOk && !input.hadSnapshot && input.dirtyNow;
}

/**
 * Dirty = current draft ≠ last server-confirmed doc. Reads raw JSON
 * strings (byte compare is fine: both are produced by JSON.stringify
 * of prepared documents, key order stable within a session).
 * No last-saved yet => treat as dirty until the first save.
 */
export function isDirty(): boolean {
  const draft = readRawDraft();
  const saved = readLastSavedRaw();
  if (saved === null) return draft !== null && draft !== undefined;
  return draft !== saved;
}

/**
 * Module-level flag: when true, the useHostedDoc beforeunload guard
 * skips preventDefault. Used by destructive flows (logout) that do their
 * own dirty-check confirm and then navigate — the native beforeunload
 * would otherwise stack a second "Leave site?" dialog on top.
 *
 * One-shot: the navigation that consumes it is the next unload, so
 * callers should set it immediately before the navigation and a fresh
 * page load resets it naturally (module re-evaluates).
 */
let intentionalNav = false;
export function setIntentionalNav() {
  intentionalNav = true;
}
export function isIntentionalNav() {
  return intentionalNav;
}

export function readLastSavedAt(): number | null {
  try {
    const raw = window.localStorage.getItem(LAST_SAVED_AT_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Push the current draft to the hosted store. Returns the confirmed
 * (sanitized) doc on success — the caller writes it back through the
 * normal store so the draft becomes the confirmed version.
 * Never throws; failures carry `needsAuth` so callers can surface
 * re-auth vs retry distinctly.
 */
export async function saveToHosted(): Promise<HostedSaveResult> {
  const draftRaw = readRawDraft();
  if (draftRaw === null) {
    return { ok: false, error: 'Nothing to save — no local draft.', needsAuth: false };
  }
  return saveHostedDoc(draftRaw);
}
