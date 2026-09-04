'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { applySettingsPatch } from '@/lib/portfolioSettings';
import { isDirty, recordLastSaved, LAST_SAVED_AT_KEY, LAST_SAVED_KEY } from '@/lib/hostedDoc';
import { savePortfolioData } from '@/lib/storage';
import { normalizeSlug } from '@/types/schema';
import type { PortfolioData, PortfolioVisibility } from '@/types/schema';
import ShowcaseSection from './ShowcaseSection';
import { CARD } from './styles';
import { useDashboardMeta } from '@/hooks/useDashboardMeta';
import DashboardHeroCard from './DashboardHeroCard';
import PortfolioSettings from './PortfolioSettings';
import ImportExportBlock from './ImportExportBlock';
import DeleteGuard from './DeleteGuard';
import WelcomeCard from './WelcomeCard';
import NoPortfolioCard from './NoPortfolioCard';

/**
 * 5e-c — the hosted dashboard (Product A shell): calm app chrome with a
 * FIXED neutral admin theme, not the visitor's skin. The `data-admin-theme`
 * attribute is applied HERE and nowhere else — the matching block in
 * globals.css re-declares the full var contract for this subtree, so a user
 * browsing in "hud" still gets a white admin panel (the layout's pre-paint
 * script skips /dashboard anyway; this wrapper is defense in depth).
 *
 * The client reflects the server, never decides: meta + showcase arrive
 * from their own endpoints in parallel once auth resolves, and the hero
 * title rides a ?full=1 doc fetch only when a doc exists. All fetches are
 * plain with loading + inline error states — no optimistic writes.
 *
 * 5e-f — the hero card's Settings toggle (slug / visibility / showcase):
 * save = FRESH ?full=1 fetch -> pure applySettingsPatch -> PUT, and the
 * UI updates ONLY from the confirmed doc. Local draft + last-saved keys
 * are touched ONLY when the local draft is clean (!isDirty) — a dirty
 * editor tab keeps its unsaved work (last-save-wins, accepted MVP limit).
 *
 * Sections ("yours" first, user-locked design): Your portfolio (the hero
 * card) then Other portfolios (the showcase). No dnd, no editor components,
 * no skin classes — admin accent only.
 *
 * 5e-h — the dashboard is a hub: its DESTINATION links (View, Edit →
 * /?edit=true, showcase cards) open in new tabs so the user never loses
 * their place; same-surface flows (Settings toggle, Save/Cancel, Get
 * started) stay in-tab.
 *
 * 5e-i — danger zone (below Settings, only when a doc exists): typed-
 * DELETE confirm, then DELETE /api/portfolio. Success clears ALL THREE
 * local keys unconditionally — the doc is gone server-side, and a kept
 * draft/last-saved snapshot would let an editor tab resurrect it on the
 * next save — then resets meta so the Get-started card renders naturally.
 * The client reflects only after the server confirms; any failure keeps
 * the confirm row (and local state) fully intact.
 *
 * 5f-b — the portability bridge (pure UI wiring on the 5f-a endpoints):
 * a "Content" section in the settings panel (Export JSON = read-only
 * ?full=1 download; Import from file = client-side size/parse guards,
 * then a confirm disclosure, then POST /api/portfolio/import) plus a
 * secondary import entry on the Get-started card — the B→A migration
 * moment. ONE flow/state/disclosure for both entry points. Success
 * reflects the confirmed doc through the SAME reflect step as
 * settings-save (meta chip + hero title + local-key hygiene).
 *
 * 5g-a — the front door is now the PUBLIC dashboard: the showcase is
 * browsable signed-out (public paginated feed + Load more) and the
 * welcome card (where the hero card sits) pitches the product in the
 * README's own words, toggling the existing FirebaseLoginCard inline.
 * Sign-in flips `auth.authenticated` — already a dependency of the
 * meta-load effect — so the authed dashboard (meta + hero card +
 * caller-excluded feed) swaps in without a reload. /dashboard is A-only
 * (the page redirects home in B), so the signed-out render is
 * hosted-only by construction. Signed-out and authed feeds share ONE
 * ShowcaseSection implementation — same cards, same Load more; only the
 * empty-state copy differs.
 */

/** Client shape of GET /api/portfolio/showcase items (updatedAt is server-side ordering; not displayed). */
interface ShowcaseCard {
  slug: string;
  title: string | null;
}

/** 5g-a — client shape of GET /api/portfolio/showcase. The wire body is { entries, page, hasMore }; the client keeps only entries + hasMore (it owns its own page counter). `hasMore` drives the Load more button. */
interface ShowcasePage {
  entries: ShowcaseCard[];
  hasMore: boolean;
}


/**
 * 5g-a — parse the showcase response body (was: a bare array; now the
 * paginated envelope). Card-item rules unchanged: only entries with a
 * non-empty slug survive; title passes through only as a non-empty
 * string. Returns null for a body we don't trust (never cast blindly —
 * the caller shows its error state).
 */
function parseShowcasePage(data: unknown): ShowcasePage | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const rec = data as { entries?: unknown; hasMore?: unknown };
  if (!Array.isArray(rec.entries)) return null;
  const cards: ShowcaseCard[] = [];
  for (const item of rec.entries) {
    if (typeof item !== 'object' || item === null) continue;
    const entry = item as { slug?: unknown; title?: unknown };
    if (typeof entry.slug !== 'string' || entry.slug === '') continue;
    cards.push({
      slug: entry.slug,
      title: typeof entry.title === 'string' && entry.title !== '' ? entry.title : null,
    });
  }
  return { entries: cards, hasMore: rec.hasMore === true };
}

/** 5f-b — import size guard: rejected client-side, before any read or request. */
const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

/** Same shape + stale-response discipline as OnboardingView's slug status (duplication accepted, unification later). */
type SlugStatus =
  | { kind: 'idle' }
  | { kind: 'checking'; for: string }
  | { kind: 'available'; for: string }
  | { kind: 'taken'; for: string }
  | { kind: 'reserved'; for: string }
  | { kind: 'invalid'; for: string }
  | { kind: 'error'; for: string };

export default function DashboardView() {
  const auth = useAuth();

  const { meta, setMeta, metaError, heroTitle, setHeroTitle, heroTitleReady, setHeroTitleReady, extractDocTitle } =
    useDashboardMeta(auth.authReady, auth.authenticated);
  const [showcase, setShowcase] = useState<ShowcaseCard[] | null>(null);
  const [showcaseError, setShowcaseError] = useState<string | null>(null);
  // 5g-a — the feed is paginated: page 1 loads in the meta-load effect
  // (signed-out public OR authed), Load more appends page+1 in its click
  // handler. showcasePage tracks the last loaded page (0 = none yet);
  // the epoch ref lets a stale Load-more response detect that the effect
  // replaced the feed meanwhile (sign-in swap) and discard itself.
  const [showcasePage, setShowcasePage] = useState(0);
  const [showcaseHasMore, setShowcaseHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const feedEpochRef = useRef(0);
  // 5g-a — the welcome card's inline sign-in toggle. Ephemeral disclosure
  // state — nothing persisted, nothing in the document.
  const [signInOpen, setSignInOpen] = useState(false);
  // 5g-a (review finding) — close the swap window: the meta-load effect
  // bumps the epoch before fetching, so a Load-more clicked AFTER the
  // sign-in swap's effect started would capture the new epoch and append
  // authed page 2 beneath the still-mounted public page 1. Resetting the
  // feed synchronously when the feed's OWNER changes (the React
  // "adjust state during render" pattern, same family as UtilityBar's hex
  // draft) closes that window: from the swap render on, the feed is empty
  // and belongs to the new owner. The effect then fills it exactly once.
  const [feedOwner, setFeedOwner] = useState(auth.authenticated);
  if (feedOwner !== auth.authenticated) {
    setFeedOwner(auth.authenticated);
    setShowcase([]);
    setShowcasePage(0);
    setShowcaseHasMore(false);
    setLoadingMore(false);
  }
  const [copied, setCopied] = useState(false);

  // 5e-f settings panel (hero card only). Ephemeral form state — never
  // stored; re-seeded from meta on open.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSlug, setSettingsSlug] = useState('');
  const [settingsVisibility, setSettingsVisibility] = useState<PortfolioVisibility>('private');
  const [settingsShowcase, setSettingsShowcase] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // 5e-i danger zone. Ephemeral disclosure state — the typed confirm is
  // required UX for an irreversible action.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 5f-b — Content portability (export/import). All ephemeral: the stash
  // holds the parsed file for ONE confirm cycle, wrapped as { doc } so a
  // literal-null JSON body stays distinguishable from "nothing stashed".
  // Component state only — never written into the document.
  const [exporting, setExporting] = useState(false);
  const [importStash, setImportStash] = useState<{ doc: unknown } | null>(null);
  const [importing, setImporting] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  // One file-input ref serves both entry points — the surfaces never
  // coexist, so it can only ever point at the mounted one.
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // 5g-b (followup) — the public hub's tab name is the brand, not
  // "Dashboard": signed-out visitors browsing the showcase wear the
  // product name; signed-in keeps the neutral admin title (matching the
  // page's server metadata). Runs after authReady so it never fights the
  // splash; document.title is a plain side effect, no state.
  useEffect(() => {
    if (!auth.authReady) return;
    document.title = auth.authenticated
      ? 'Dashboard'
      : 'overengineered-portfolio · build yours';
  }, [auth.authReady, auth.authenticated]);

  // Admin chrome is fixed-scale: a view-scale zoom set by a skinned page
  // persists on <html> across SPA navigation (zoom cannot be subtree-
  // overridden — see the pre-paint script's /u/ note), so remove it here;
  // PortfolioView re-applies its own when it mounts again.
  useEffect(() => {
    document.documentElement.style.removeProperty('zoom');
  }, []);

  // Showcase feed loader — meta + hero title now owned by useDashboardMeta.
  // This effect stays the showcase source of truth for both signed-out
  // (public feed) and signed-in (caller-excluded feed). Epoch discipline
  // preserved for Load-more stale-response protection.
  useEffect(() => {
    if (!auth.authReady) return;
    feedEpochRef.current += 1;
    let active = true;
    async function loadShowcase() {
      try {
        const res = await fetch('/api/portfolio/showcase', { credentials: 'same-origin' });
        if (!active) return;
        const page = res.ok ? parseShowcasePage(await res.json()) : null;
        if (!active) return;
        if (page === null) {
          setShowcaseError('Could not load other portfolios.');
          return;
        }
        setShowcase(page.entries);
        setShowcasePage(1);
        setShowcaseHasMore(page.hasMore);
        setShowcaseError(null);
      } catch {
        if (!active) return;
        setShowcaseError('Could not load other portfolios.');
      }
    }
    void loadShowcase();
    return () => {
      active = false;
    };
  }, [auth.authReady, auth.authenticated]);

  // 5g-a — Load more: append the next page in the click handler (user-
  // initiated; never in an effect). The epoch captured at click detects a
  // feed replacement by the meta-load effect (sign-in swap) while this
  // fetch was in flight — a stale append must never mix pages across
  // feeds, so it discards itself.
  async function loadMoreShowcase() {
    if (loadingMore || showcase === null || !showcaseHasMore) return;
    const epoch = feedEpochRef.current;
    const targetPage = showcasePage + 1;
    setLoadingMore(true);
    setShowcaseError(null);
    try {
      const res = await fetch(`/api/portfolio/showcase?page=${targetPage}`, { credentials: 'same-origin' });
      const page = res.ok ? parseShowcasePage(await res.json()) : null;
      if (epoch !== feedEpochRef.current) return;
      if (page === null) {
        setShowcaseError('Could not load more portfolios.');
        return;
      }
      setShowcase((prev) => (prev === null ? page.entries : [...prev, ...page.entries]));
      setShowcasePage(targetPage);
      setShowcaseHasMore(page.hasMore);
    } catch {
      if (epoch === feedEpochRef.current) {
        setShowcaseError('Could not load more portfolios.');
      }
    } finally {
      // This handler owns the busy flag it set — clear it even when the
      // epoch check discarded the response.
      setLoadingMore(false);
    }
  }

  async function copyShareLink(slug: string) {
    // Clipboard can reject (permission denied / insecure origin) — keep it
    // silent, the button just never shows "Copied".
    await navigator.clipboard.writeText(`${window.location.origin}/u/${slug}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Live slug availability for the settings panel (debounced). Same
  // stale-response discipline as onboarding: the status carries the query
  // it belongs to, so a late response for an older input can never win —
  // the render below derives "checking" until the current value's answer
  // arrives. Only runs while the panel is open.
  useEffect(() => {
    if (!settingsOpen || !auth.authenticated) return;
    const trimmed = settingsSlug.trim();
    if (trimmed === '') return;
    const timer = setTimeout(() => {
      setSlugStatus({ kind: 'checking', for: trimmed });
      void (async () => {
        try {
          const res = await fetch(
            `/api/portfolio/slug?slug=${encodeURIComponent(trimmed)}`,
          );
          const data: { available?: unknown; reason?: unknown } | null =
            await res.json().catch(() => null);
          if (data === null || typeof data !== 'object') {
            setSlugStatus({ kind: 'error', for: trimmed });
            return;
          }
          if (data.available === true) setSlugStatus({ kind: 'available', for: trimmed });
          else if (data.reason === 'taken') setSlugStatus({ kind: 'taken', for: trimmed });
          else if (data.reason === 'reserved') setSlugStatus({ kind: 'reserved', for: trimmed });
          else if (data.reason === 'invalid') setSlugStatus({ kind: 'invalid', for: trimmed });
          else setSlugStatus({ kind: 'error', for: trimmed });
        } catch {
          setSlugStatus({ kind: 'error', for: trimmed });
        }
      })();
    }, 350);
    return () => clearTimeout(timer);
  }, [settingsSlug, settingsOpen, auth.authenticated]);

  function openSettings() {
    if (!meta?.exists) return;
    setSettingsSlug(meta.slug ?? '');
    setSettingsVisibility(meta.visibility);
    setSettingsShowcase(meta.showcase);
    setSlugStatus({ kind: 'idle' });
    setSaveError(null);
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
    setSlugStatus({ kind: 'idle' });
    setSaveError(null);
  }

  // Effective status for the CURRENT input: empty = idle; anything whose
  // answer belongs to an older query reads as still-checking.
  const trimmedSettingsSlug = settingsSlug.trim();
  const normalizedSettingsSlug = normalizeSlug(settingsSlug);
  const availability: SlugStatus =
    trimmedSettingsSlug === ''
      ? { kind: 'idle' }
      : slugStatus.kind === 'idle' || slugStatus.for !== trimmedSettingsSlug
        ? { kind: 'checking', for: trimmedSettingsSlug }
        : slugStatus;
  // Save gate: valid slug AND (available for this exact input OR the
  // unchanged own slug — the server short-circuits re-claims anyway) AND
  // nothing mid-flight.
  const slugUnchanged =
    meta?.slug != null && normalizedSettingsSlug !== null && normalizedSettingsSlug === meta.slug;
  const canSave =
    normalizedSettingsSlug !== null && (availability.kind === 'available' || slugUnchanged) && !saving;

  // 5f-b — the reflect step shared by settings-save and file-import: the
  // UI updates ONLY from the server's confirmed doc (meta chip, hero
  // title, saved feedback), and the local keys are touched ONLY when the
  // editor's local draft is clean — a dirty editor tab's unsaved work is
  // never clobbered (last-save-wins, accepted MVP limit).
  function reflectConfirmedDoc(confirmed: PortfolioData) {
    setMeta({
      exists: true,
      slug:
        typeof confirmed.slug === 'string' && confirmed.slug !== '' ? confirmed.slug : null,
      visibility: confirmed.visibility === 'public' ? 'public' : 'private',
      showcase: confirmed.showcase === true,
    });
    setHeroTitle(extractDocTitle(confirmed));
    setHeroTitleReady(true);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
    // Local-key hygiene: only a CLEAN local draft may be overwritten.
    // When the editor tab is dirty, touch NOTHING local — its unsaved
    // work wins later (last-save-wins, accepted MVP limit).
    if (!isDirty()) {
      savePortfolioData(confirmed);
      recordLastSaved(confirmed);
    }
  }

  async function handleSaveSettings() {
    if (!meta?.exists) return;
    const normalized = normalizeSlug(settingsSlug);
    const trimmed = settingsSlug.trim();
    const unchanged = meta.slug !== null && normalized !== null && normalized === meta.slug;
    if (normalized === null || (availability.kind !== 'available' && !unchanged) || saving) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      // Write model (5e-f): fetch a FRESH doc — never PATCH a stale
      // mount-time one — apply the pure patch, PUT, reflect only the
      // confirmed result.
      const freshRes = await fetch('/api/portfolio?full=1', { credentials: 'same-origin' });
      if (!freshRes.ok) {
        setSaveError('Could not save settings — try again.');
        return;
      }
      const fresh: unknown = await freshRes.json();
      if (
        typeof fresh !== 'object' ||
        fresh === null ||
        !Array.isArray((fresh as PortfolioData).tabs)
      ) {
        setSaveError('Could not save settings — try again.');
        return;
      }
      const patched = applySettingsPatch(fresh as PortfolioData, {
        slug: normalized,
        visibility: settingsVisibility,
        showcase: settingsShowcase,
      });
      if (patched === null) {
        setSlugStatus({ kind: 'invalid', for: trimmed });
        setSaveError('That link is not valid — pick another one.');
        return;
      }
      const res = await fetch('/api/portfolio', { credentials: 'same-origin',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patched),
      });
      if (res.status === 409) {
        setSlugStatus({ kind: 'taken', for: trimmed });
        setSaveError('That link was just claimed — pick another one.');
        return;
      }
      if (res.status === 400) {
        const err: unknown = await res.json().catch(() => null);
        if (
          err !== null &&
          typeof err === 'object' &&
          (err as { error?: unknown }).error === 'invalid-slug'
        ) {
          setSlugStatus({ kind: 'invalid', for: trimmed });
          setSaveError('That link is not valid — pick another one.');
        } else {
          setSaveError('Could not save settings — try again.');
        }
        return;
      }
      if (!res.ok) {
        setSaveError('Could not save settings — try again.');
        return;
      }
      const confirmed: PortfolioData | null = await res
        .json()
        .then((data: unknown) =>
          typeof data === 'object' &&
          data !== null &&
          Array.isArray((data as PortfolioData).tabs)
            ? (data as PortfolioData)
            : null,
        );
      if (!confirmed) {
        setSaveError('Could not save settings — try again.');
        return;
      }
      // Reflect the CONFIRMED doc: chip + share link show the new slug at
      // once, hero title re-extracted from the same source of truth.
      reflectConfirmedDoc(confirmed);
      closeSettings();
    } catch {
      setSaveError('Could not save settings — try again.');
    } finally {
      setSaving(false);
    }
  }

  // 5e-i — irreversible deletion. The client reflects, never decides:
  // local keys + meta are only touched after the server confirms 200.
  async function handleDeletePortfolio() {
    if (!meta?.exists || deleting || deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/portfolio', { credentials: 'same-origin', method: 'DELETE' });
      if (!res.ok) {
        setDeleteError(
          res.status === 401
            ? 'Your session expired — sign in again, then retry.'
            : 'Could not delete your portfolio — try again.',
        );
        return;
      }
      // Server confirmed the doc is gone. Clear ALL THREE local keys
      // unconditionally: a kept draft ('portfolio-data', storage.ts's
      // private STORAGE_KEY) or last-saved snapshot would resurrect the
      // deleted portfolio on the next editor save.
      localStorage.removeItem('portfolio-data');
      localStorage.removeItem(LAST_SAVED_KEY);
      localStorage.removeItem(LAST_SAVED_AT_KEY);
      // Reset to the no-doc shape — the Get-started card renders
      // naturally. The showcase list stays as-is (the deleted entry
      // disappears from OTHERS' feeds automatically — filtered on read).
      setMeta({ exists: false, slug: null, visibility: 'private', showcase: false });
      setHeroTitleReady(false);
      setDeleteOpen(false);
      setDeleteConfirm('');
      closeSettings();
    } catch {
      setDeleteError('Could not delete your portfolio — try again.');
    } finally {
      setDeleting(false);
    }
  }

  // 5f-b — export is READ-ONLY: download the confirmed doc (?full=1 is
  // caller-keyed — works with or without a slug; drafts included) and
  // reflect NOTHING. Blob + object URL, revoked right after the click.
  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setContentError(null);
    try {
      const res = await fetch('/api/portfolio?full=1', { credentials: 'same-origin' });
      if (!res.ok) {
        setContentError('Export failed — try again.');
        return;
      }
      const data: unknown = await res.json();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data)], { type: 'application/json' }),
      );
      const anchor = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      anchor.href = url;
      anchor.download = meta?.slug
        ? `portfolio-${meta.slug}-${date}.json`
        : `portfolio-export-${date}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setContentError('Export failed — try again.');
    } finally {
      setExporting(false);
    }
  }

  // 5f-b — pick: size + parse guards BEFORE any request; the parsed
  // object is stashed until the confirm disclosure resolves it. Clearing
  // input.value lets the same file be re-picked after a cancel.
  function handleImportFilePicked(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    setContentError(null);
    if (file.size > IMPORT_MAX_BYTES) {
      setContentError('That file is too large — exports stay under 5 MB.');
      return;
    }
    void (async () => {
      try {
        setImportStash({ doc: JSON.parse(await file.text()) });
      } catch {
        setContentError("That file isn't valid JSON.");
      }
    })();
  }

  // 5f-b — confirm: POST the stashed file, reflect ONLY the server's
  // confirmed doc (same template as the PUT path). Error copy is fixed by
  // the 5f-a contract: 401 session, 400 not-a-portfolio, else retry.
  async function handleImportConfirmed() {
    if (importStash === null || importing) return;
    setImporting(true);
    setContentError(null);
    try {
      const res = await fetch('/api/portfolio/import', { credentials: 'same-origin',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importStash.doc),
      });
      if (res.status === 401) {
        setContentError('Your session expired — sign in again.');
        return;
      }
      if (res.status === 400) {
        setContentError("That file isn't a portfolio export.");
        return;
      }
      if (!res.ok) {
        setContentError('Import failed — try again.');
        return;
      }
      const confirmed: PortfolioData | null = await res
        .json()
        .then((data: unknown) =>
          typeof data === 'object' &&
          data !== null &&
          Array.isArray((data as PortfolioData).tabs)
            ? (data as PortfolioData)
            : null,
        );
      if (!confirmed) {
        setContentError('Import failed — try again.');
        return;
      }
      reflectConfirmedDoc(confirmed);
      setImportStash(null);
    } catch {
      setContentError('Import failed — try again.');
    } finally {
      setImporting(false);
    }
  }

  // Cancel clears ALL stashed import state — the disclosure's only exit
  // besides success.
  function cancelImport() {
    setImportStash(null);
    setContentError(null);
  }

  // House splash (hydration-safe): both auth fetches must settle first.
  if (!auth.authReady) {
    return (
      <main data-admin-theme="" className="grid min-h-dvh place-items-center">
        <p className="animate-pulse font-mono text-sm opacity-40">~/loading…</p>
      </main>
    );
  }

  // 5g-a — the front door is the PUBLIC dashboard: browsable showcase +
  // a welcome card that pitches the product and toggles the login card
  // inline. No editor organs, no document data — the feed is the public
  // endpoint's entries (slug/title only). /dashboard is A-only (the page
  // redirects home in B), so this branch runs hosted-only by construction.
  // Sign-in success flips auth.authenticated: the meta-load effect re-runs
  // (it is keyed on that flag) and the authed dashboard swaps in below —
  // no manual reload.
  if (!auth.authenticated) {
    return (
      <main data-admin-theme="" className="relative min-h-dvh overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div className="relative mx-auto w-full max-w-3xl px-6 py-16">
          <WelcomeCard signInOpen={signInOpen} setSignInOpen={setSignInOpen} onLoginWithIdToken={auth.loginWithIdToken} />
          <ShowcaseSection
            heading="Live portfolios"
            items={showcase}
            error={showcaseError}
            emptyCopy="No public portfolios yet — yours could be first."
            hasMore={showcaseHasMore}
            loadingMore={loadingMore}
            onLoadMore={() => void loadMoreShowcase()}
          />
        </div>
      </main>
    );
  }

  const slug = meta?.slug ?? null;

  return (
    // 5g-b (followup) — the authed dashboard wears the same stagecraft as
    // the public hub: dot-grid backdrop + terminal header, one identity.
    <main data-admin-theme="" className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <div className="relative mx-auto w-full max-w-3xl px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-mono text-xl font-semibold sm:text-2xl">
            ~/
            <span className="text-accent">dashboard</span>
            <span className="caret-blink text-accent">▌</span>
          </h1>
          {/* 5g-b (followup) — signed-in users get the same quiet exit as
              the hub's welcome card. 6-e pivot: the how-to link targets
              /playground (the demo is editable there, unsaved). */}
          <div className="flex items-center gap-2">
            <Link
              href="/playground"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-skin border border-accent/50 px-2.5 py-1 font-mono text-xs font-medium text-accent hover:bg-accent hover:text-background"
            >
              How to build ↗
            </Link>
            <a
              href="https://github.com/BluffingRay/overengineered-portfolio"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs opacity-40 hover:opacity-70"
            >
              fork it on GitHub ↗
            </a>
            <button
              type="button"
              onClick={() => {
                void auth.logout().then(() => window.location.reload());
              }}
              title="End this session and return to the public hub"
              className="rounded-skin border border-[var(--border)] px-2.5 py-1 font-mono text-xs opacity-60 hover:opacity-100"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Your portfolio — the hero of the page. */}
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide opacity-50">
            Your portfolio
          </h2>
          {metaError ? (
            <p role="alert" className={`mt-3 text-sm text-red-500 ${CARD}`}>
              {metaError}
            </p>
          ) : meta === null ? (
            <div className={`mt-3 ${CARD}`}>
              <p className="text-sm opacity-50">Loading…</p>
            </div>
          ) : !meta.exists ? (
            <NoPortfolioCard
              importing={importing}
              importStash={importStash}
              contentError={contentError}
              importInputRef={importInputRef}
              onImportFilePicked={handleImportFilePicked}
              onImportConfirmed={() => void handleImportConfirmed()}
              onCancelImport={cancelImport}
              extractDocTitle={extractDocTitle}
            />
          ) : (
            <div className={`settle-in mt-3 ${CARD}`}>
              <DashboardHeroCard
                heroTitle={heroTitle}
                heroTitleReady={heroTitleReady}
                slug={slug}
                visibility={meta.visibility}
                showcase={meta.showcase}
                copied={copied}
                settingsOpen={settingsOpen}
                justSaved={justSaved}
                onCopyShareLink={(s) => void copyShareLink(s)}
                onToggleSettings={() => (settingsOpen ? closeSettings() : openSettings())}
              />

              {settingsOpen && (
                <>
                  <PortfolioSettings
                    settingsSlug={settingsSlug}
                    setSettingsSlug={setSettingsSlug}
                    settingsVisibility={settingsVisibility}
                    setSettingsVisibility={setSettingsVisibility}
                    settingsShowcase={settingsShowcase}
                    setSettingsShowcase={setSettingsShowcase}
                    availability={availability}
                    normalizedSettingsSlug={normalizedSettingsSlug}
                    trimmedSettingsSlug={trimmedSettingsSlug}
                    canSave={canSave}
                    saving={saving}
                    saveError={saveError}
                    onSave={() => void handleSaveSettings()}
                    onCancel={closeSettings}
                    setSaveError={setSaveError}
                  />

                  <ImportExportBlock
                    exporting={exporting}
                    importing={importing}
                    importStash={importStash}
                    contentError={contentError}
                    importInputRef={importInputRef}
                    onExport={() => void handleExport()}
                    onImportFilePicked={handleImportFilePicked}
                    onImportConfirmed={() => void handleImportConfirmed()}
                    onCancelImport={cancelImport}
                    extractDocTitle={extractDocTitle}
                  />

                  <DeleteGuard
                    deleteOpen={deleteOpen}
                    deleteConfirm={deleteConfirm}
                    deleting={deleting}
                    deleteError={deleteError}
                    setDeleteOpen={setDeleteOpen}
                    setDeleteConfirm={setDeleteConfirm}
                    setDeleteError={setDeleteError}
                    onDelete={() => void handleDeletePortfolio()}
                  />
                </>
              )}
            </div>
          )}
        </section>

        {/* Other portfolios — the showcase (server-filtered, client
            reflects). ONE section implementation shared with the signed-out
            public dashboard (5g-a); the Load more button lives inside it. */}
        <ShowcaseSection
          items={showcase}
          error={showcaseError}
          emptyCopy="Nothing here yet. Portfolios published to the showcase will appear here."
          hasMore={showcaseHasMore}
          loadingMore={loadingMore}
          onLoadMore={() => void loadMoreShowcase()}
        />
      </div>
    </main>
  );
}
