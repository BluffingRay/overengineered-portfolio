'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FirebaseLoginCard from '@/components/auth/FirebaseLoginCard';
import { useAuth } from '@/hooks/useAuth';
import { applySettingsPatch } from '@/lib/portfolioSettings';
import { isDirty, recordLastSaved, LAST_SAVED_AT_KEY, LAST_SAVED_KEY } from '@/lib/hostedDoc';
import { savePortfolioData } from '@/lib/storage';
import { normalizeSlug } from '@/types/schema';
import type { PortfolioData, PortfolioVisibility } from '@/types/schema';

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
 */

interface PortfolioMeta {
  exists: boolean;
  slug: string | null;
  visibility: 'private' | 'public';
  showcase: boolean;
}

/** Client shape of GET /api/portfolio/showcase items (updatedAt is server-side ordering; not displayed). */
interface ShowcaseCard {
  slug: string;
  title: string | null;
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

function parseShowcase(data: unknown): ShowcaseCard[] {
  if (!Array.isArray(data)) return [];
  const cards: ShowcaseCard[] = [];
  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as { slug?: unknown; title?: unknown };
    if (typeof rec.slug !== 'string' || rec.slug === '') continue;
    cards.push({
      slug: rec.slug,
      title: typeof rec.title === 'string' && rec.title !== '' ? rec.title : null,
    });
  }
  return cards;
}

/** First featured_hero's name -> heading, else 'Untitled portfolio'. Same capture order as deriveIndexEntry (the doc is the truth). */
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

const CARD = 'rounded-skin border border-[var(--border)] bg-surface p-5';
const ACTION_BTN =
  'rounded-skin border border-[var(--border)] bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-background disabled:pointer-events-none disabled:opacity-40';
const INPUT =
  'w-full rounded-skin border border-[var(--border)] bg-background px-3 py-2 text-sm outline-none focus:border-accent';
const SEGMENT =
  'rounded-skin border border-[var(--border)] bg-background px-3 py-1.5 text-sm font-medium';

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
  const router = useRouter();

  // null = still loading; errors render inline (never blank).
  const [meta, setMeta] = useState<PortfolioMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [showcase, setShowcase] = useState<ShowcaseCard[] | null>(null);
  const [showcaseError, setShowcaseError] = useState<string | null>(null);
  // Hero title: null until the ?full=1 fetch settles — 'Untitled portfolio'
  // is a real loaded value, hence the separate ready flag.
  const [heroTitle, setHeroTitle] = useState<string | null>(null);
  const [heroTitleReady, setHeroTitleReady] = useState(false);
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

  // Admin chrome is fixed-scale: a view-scale zoom set by a skinned page
  // persists on <html> across SPA navigation (zoom cannot be subtree-
  // overridden — see the pre-paint script's /u/ note), so remove it here;
  // PortfolioView re-applies its own when it mounts again.
  useEffect(() => {
    document.documentElement.style.removeProperty('zoom');
  }, []);

  useEffect(() => {
    if (!auth.authReady || !auth.authenticated) return;
    let active = true;
    async function load() {
      try {
        const [metaRes, showcaseRes] = await Promise.all([
          fetch('/api/portfolio/meta'),
          fetch('/api/portfolio/showcase'),
        ]);
        if (!active) return;
        let parsedMeta: PortfolioMeta | null = null;
        if (metaRes.ok) {
          parsedMeta = parseMeta(await metaRes.json());
          setMeta(parsedMeta);
          setMetaError(null);
        } else {
          setMetaError('Could not load your portfolio.');
        }
        if (showcaseRes.ok) {
          setShowcase(parseShowcase(await showcaseRes.json()));
          setShowcaseError(null);
        } else {
          setShowcaseError('Could not load other portfolios.');
        }
        // The hero title rides the doc — fetched only when one exists.
        if (parsedMeta?.exists) {
          const fullRes = await fetch('/api/portfolio?full=1');
          if (!active) return;
          setHeroTitle(extractDocTitle(fullRes.ok ? await fullRes.json() : null));
          setHeroTitleReady(true);
        }
      } catch {
        if (!active) return;
        setMetaError('Could not load your portfolio.');
        setShowcaseError('Could not load other portfolios.');
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [auth.authReady, auth.authenticated]);

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
      const freshRes = await fetch('/api/portfolio?full=1');
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
      const res = await fetch('/api/portfolio', {
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
      const res = await fetch('/api/portfolio', { method: 'DELETE' });
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

  // House splash (hydration-safe): both auth fetches must settle first.
  if (!auth.authReady) {
    return (
      <main data-admin-theme="" className="grid min-h-dvh place-items-center">
        <p className="animate-pulse font-mono text-sm opacity-40">~/loading…</p>
      </main>
    );
  }

  // The front door: the card's own success handler navigates to
  // /dashboard (FirebaseLoginForm pushes after the server confirms).
  if (!auth.authenticated) {
    return (
      <main data-admin-theme="" className="flex min-h-dvh flex-col">
        <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm opacity-60">Sign in to manage your portfolio.</p>
          </header>
          <FirebaseLoginCard onLoginWithIdToken={auth.loginWithIdToken} />
        </div>
      </main>
    );
  }

  const slug = meta?.slug ?? null;

  return (
    <main data-admin-theme="" className="min-h-dvh">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
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
            <div className={`mt-3 ${CARD}`}>
              <p className="text-sm font-medium">No portfolio yet</p>
              <p className="mt-1 text-sm opacity-60">
                Pick a design, tell us your name, and your first blocks are
                generated for you — it takes about a minute.
              </p>
              <button
                type="button"
                onClick={() => router.push('/onboarding')}
                className="mt-4 rounded-skin border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-background"
              >
                Get started
              </button>
            </div>
          ) : (
            <div className={`settle-in mt-3 ${CARD}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">
                    {heroTitleReady ? heroTitle : <span className="opacity-40">…</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {slug ? (
                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono">
                        /u/{slug}
                      </span>
                    ) : (
                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 opacity-60">
                        No link yet — claim it in onboarding
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 ${
                        meta.visibility === 'public'
                          ? 'border-accent/40 text-accent'
                          : 'border-[var(--border)] opacity-60'
                      }`}
                    >
                      {meta.visibility === 'public' ? 'Public' : 'Private'}
                    </span>
                    {meta.showcase && (
                      <span className="rounded-full border border-accent/40 px-2 py-0.5 text-accent">
                        In showcase
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* 5e-h — Edit is a destination (the editor) — new tab,
                      same visual classes the button had. */}
                  <Link
                    href="/?edit=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-skin border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-background"
                  >
                    Edit
                  </Link>
                  {slug ? (
                    <Link
                      href={`/u/${slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={ACTION_BTN}
                    >
                      View
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Claim your link in onboarding first"
                      className={ACTION_BTN}
                    >
                      View
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!slug}
                    title={slug ? 'Copy the public link' : 'Claim your link in onboarding first'}
                    onClick={() => {
                      if (slug) void copyShareLink(slug);
                    }}
                    className={ACTION_BTN}
                  >
                    {copied ? 'Copied' : 'Copy share link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => (settingsOpen ? closeSettings() : openSettings())}
                    className={ACTION_BTN}
                  >
                    {settingsOpen ? 'Close' : justSaved ? 'Saved' : 'Settings'}
                  </button>
                </div>
              </div>

              {settingsOpen && (
                <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Your link</span>
                    <div className="flex items-center gap-0">
                      <span className="rounded-l-skin border border-r-0 border-[var(--border)] bg-background px-3 py-2 font-mono text-sm opacity-60">
                        /u/
                      </span>
                      <input
                        type="text"
                        value={settingsSlug}
                        onChange={(event) => {
                          setSettingsSlug(event.target.value);
                          setSaveError(null);
                        }}
                        placeholder="jane-doe"
                        autoComplete="off"
                        spellCheck={false}
                        className={`${INPUT} rounded-l-none font-mono`}
                      />
                    </div>
                    <p className="mt-1.5 font-mono text-xs" aria-live="polite">
                      {availability.kind === 'idle' && (
                        <span className="opacity-50">
                          3–40 lowercase letters, numbers, hyphens.
                        </span>
                      )}
                      {availability.kind === 'checking' && (
                        <span className="opacity-50">Checking…</span>
                      )}
                      {availability.kind === 'available' && (
                        <span className="text-emerald-600">
                          ✓ /u/{normalizedSettingsSlug ?? trimmedSettingsSlug} is available
                        </span>
                      )}
                      {availability.kind === 'taken' && (
                        <span className="text-red-500">
                          /u/{normalizedSettingsSlug ?? trimmedSettingsSlug} is already
                          taken — try another.
                        </span>
                      )}
                      {availability.kind === 'reserved' && (
                        <span className="text-red-500">
                          That one is reserved by the site — try another.
                        </span>
                      )}
                      {availability.kind === 'invalid' && (
                        <span className="text-red-500">
                          Use 3–40 lowercase letters, numbers or hyphens (no edge
                          hyphens).
                        </span>
                      )}
                      {availability.kind === 'error' && (
                        <span className="text-red-500">
                          Could not check availability — try again.
                        </span>
                      )}
                    </p>
                  </label>

                  <div>
                    <span className="mb-1 block text-sm font-medium">Visibility</span>
                    <div className="inline-flex" role="group" aria-label="Visibility">
                      <button
                        type="button"
                        aria-pressed={settingsVisibility === 'private'}
                        onClick={() => setSettingsVisibility('private')}
                        className={`${SEGMENT} rounded-r-none ${
                          settingsVisibility === 'private'
                            ? 'border-accent text-accent'
                            : 'opacity-70'
                        }`}
                      >
                        Private
                      </button>
                      <button
                        type="button"
                        aria-pressed={settingsVisibility === 'public'}
                        onClick={() => setSettingsVisibility('public')}
                        className={`${SEGMENT} rounded-l-none border-l-0 ${
                          settingsVisibility === 'public'
                            ? 'border-accent text-accent'
                            : 'opacity-70'
                        }`}
                      >
                        Public
                      </button>
                    </div>
                    <p className="mt-1 text-xs opacity-50" aria-live="polite">
                      {settingsVisibility === 'public'
                        ? 'Public — anyone with your link can view your portfolio.'
                        : 'Private — only you (while signed in) can open your link; everyone else gets a not-found page.'}
                    </p>
                  </div>

                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={settingsShowcase}
                      onChange={(event) => setSettingsShowcase(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="text-sm">
                      <span className="font-medium">
                        Show my portfolio in the gallery
                      </span>
                      <span
                        className={`mt-0.5 block text-xs ${
                          settingsVisibility === 'public' ? 'opacity-50' : 'opacity-40'
                        }`}
                      >
                        {settingsVisibility === 'public'
                          ? 'Listed under “Other portfolios” on other dashboards.'
                          : 'Needs Public visibility to have an effect.'}
                      </span>
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={!canSave}
                      title={
                        canSave
                          ? undefined
                          : 'Pick an available link first — or keep your current one'
                      }
                      onClick={() => void handleSaveSettings()}
                      className="rounded-skin border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-background disabled:pointer-events-none disabled:opacity-40"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={closeSettings}
                      className={ACTION_BTN}
                    >
                      Cancel
                    </button>
                    {saveError && (
                      <p role="alert" className="text-sm text-red-500">
                        {saveError}
                      </p>
                    )}
                  </div>

                  {/* 5e-i — danger zone (lives INSIDE the settings panel,
                      per user: a permanent red button on the hero card is
                      too loud): irreversible deletion behind a typed
                      confirm. */}
                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    {!deleteOpen ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteOpen(true);
                          setDeleteError(null);
                        }}
                        className="rounded-skin border border-red-500/40 bg-background px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-500/10"
                      >
                        Delete portfolio
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-red-500">
                          This permanently deletes your portfolio, its link,
                          and its uploaded files. This cannot be undone.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={deleteConfirm}
                            onChange={(event) => {
                              setDeleteConfirm(event.target.value);
                              setDeleteError(null);
                            }}
                            placeholder="Type DELETE to confirm"
                            aria-label="Type DELETE to confirm deletion"
                            autoComplete="off"
                            spellCheck={false}
                            disabled={deleting}
                            className={`${INPUT} max-w-56 font-mono`}
                          />
                          <button
                            type="button"
                            disabled={deleting || deleteConfirm !== 'DELETE'}
                            onClick={() => void handleDeletePortfolio()}
                            className="rounded-skin border border-red-500/60 bg-red-500 px-3 py-1.5 text-sm font-medium text-white disabled:pointer-events-none disabled:opacity-40"
                          >
                            {deleting ? 'Deleting…' : 'Delete forever'}
                          </button>
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => {
                              setDeleteOpen(false);
                              setDeleteConfirm('');
                              setDeleteError(null);
                            }}
                            className={ACTION_BTN}
                          >
                            Cancel
                          </button>
                        </div>
                        {deleteError && (
                          <p role="alert" className="text-sm text-red-500">
                            {deleteError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
          )}
        </section>

        {/* Other portfolios — the showcase (server-filtered, client reflects). */}
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wide opacity-50">
            Other portfolios
          </h2>
          {showcaseError ? (
            <p role="alert" className={`mt-3 text-sm text-red-500 ${CARD}`}>
              {showcaseError}
            </p>
          ) : showcase === null ? (
            <div className={`mt-3 ${CARD}`}>
              <p className="text-sm opacity-50">Loading…</p>
            </div>
          ) : showcase.length === 0 ? (
            <div className={`mt-3 ${CARD}`}>
              <p className="text-sm opacity-60">
                Nothing here yet — portfolios published to the showcase will
                appear here.
              </p>
            </div>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {showcase.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/u/${item.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-skin border border-[var(--border)] bg-surface p-4 hover:border-accent"
                  >
                    <span className="block text-sm font-medium">
                      {item.title ?? item.slug}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs opacity-50">
                      /u/{item.slug}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
