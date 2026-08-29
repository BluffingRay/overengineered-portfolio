'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FirebaseLoginCard from '@/components/auth/FirebaseLoginCard';
import { useAuth } from '@/hooks/useAuth';
import { recordLastSaved } from '@/lib/hostedDoc';
import { buildInitialDoc, suggestSlug } from '@/lib/onboarding';
import { savePortfolioData } from '@/lib/storage';
import { BLOCK_DESIGNS, normalizeSlug } from '@/types/schema';
import type { BlockDesign, PortfolioData } from '@/types/schema';

/**
 * 5e-d — the onboarding stepper (Product A shell): design picker first
 * (non-devs choose visually), then name/role/slug with live availability,
 * then generate + save. Mirrors DashboardView's gate (~15 lines —
 * duplication accepted, unification later) and its fixed neutral admin
 * theme: `data-admin-theme` is applied HERE and nowhere else — no skin
 * classes, app chrome only. The layout's pre-paint script already skips
 * /onboarding.
 *
 * The client reflects the server, never decides: nothing renders as
 * "saved" before the PUT confirms; failures keep the form + show inline
 * errors. On confirm the CONFIRMED doc is written into the local draft
 * store (savePortfolioData) and stamped as last-saved (recordLastSaved)
 * so the editor at /?edit=true opens clean, never dirty — and never
 * showing the seed as "their" content.
 */

const DESIGN_META: Record<BlockDesign, { label: string; blurb: string }> = {
  default: { label: 'Classic', blurb: 'Clean and timeless — lets the work lead.' },
  cutie: { label: 'Cutie', blurb: 'Playful pastels, blobs and stickers.' },
  editorial: { label: 'Editorial', blurb: 'Serif type, print rhythm, quiet confidence.' },
  riso: { label: 'Riso', blurb: 'Loud misprint energy — ink, grain, halftones.' },
};

/** Hand-styled swatch evoking each direction — NOT a live block render. */
function DesignSwatch({ design }: { design: BlockDesign }) {
  switch (design) {
    case 'default':
      return (
        <div
          aria-hidden
          className="flex h-24 w-full flex-col justify-center gap-1.5 rounded-skin border border-[var(--border)] bg-background p-3"
        >
          <span className="h-2.5 w-20 rounded-full bg-[var(--foreground)]/80" />
          <span className="h-1.5 w-28 rounded-full bg-[var(--foreground)]/25" />
          <span className="h-1.5 w-24 rounded-full bg-[var(--foreground)]/25" />
          <span className="mt-1.5 h-4 w-14 rounded-full border border-[var(--foreground)]/40" />
        </div>
      );
    case 'cutie':
      return (
        <div
          aria-hidden
          className="relative flex h-24 w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-pink-200 bg-pink-50 p-3"
        >
          <span className="absolute -left-3 -top-4 h-10 w-10 rounded-full bg-pink-200" />
          <span className="absolute bottom-1 right-4 h-6 w-6 rounded-full bg-sky-200" />
          <span className="text-lg text-pink-500">★</span>
          <span className="h-2 w-16 rounded-full bg-pink-400/70" />
        </div>
      );
    case 'editorial':
      return (
        <div
          aria-hidden
          className="flex h-24 w-full items-center gap-3 rounded-skin border border-[var(--border)] bg-background p-3"
        >
          <span className="font-serif text-4xl leading-none">Aa</span>
          <span className="flex-1">
            <span className="block h-px w-full bg-[var(--foreground)]/40" />
            <span className="mt-2.5 block h-1.5 w-full bg-[var(--foreground)]/20" />
            <span className="mt-1.5 block h-1.5 w-2/3 bg-[var(--foreground)]/20" />
          </span>
        </div>
      );
    case 'riso':
      return (
        <div
          aria-hidden
          className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-skin border border-orange-200 bg-amber-50"
        >
          <span className="absolute h-12 w-12 -translate-x-[135%] rounded-full bg-blue-600/60 mix-blend-multiply" />
          <span className="absolute h-12 w-12 translate-x-[35%] rotate-6 rounded-md bg-orange-500/70 mix-blend-multiply" />
        </div>
      );
    default: {
      // Tripwire when BLOCK_DESIGNS grows — same house pattern as the
      // block-type switch.
      const _exhaustive: never = design;
      return _exhaustive;
    }
  }
}

type SlugStatus =
  | { kind: 'idle' }
  | { kind: 'checking'; for: string }
  | { kind: 'available'; for: string }
  | { kind: 'taken'; for: string }
  | { kind: 'reserved'; for: string }
  | { kind: 'invalid'; for: string }
  | { kind: 'error'; for: string };

const INPUT =
  'w-full rounded-skin border border-[var(--border)] bg-background px-3 py-2 text-sm outline-none focus:border-accent';
const CARD = 'rounded-skin border border-[var(--border)] bg-surface p-5';

export default function OnboardingView() {
  const auth = useAuth();
  const router = useRouter();

  // null = the meta check hasn't settled; errors render inline (never blank).
  const [checked, setChecked] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [design, setDesign] = useState<BlockDesign | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [slug, setSlug] = useState('');
  // The suggestion auto-fills from the name only until the user edits the
  // slug field by hand — after that their input wins.
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ kind: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Admin chrome is fixed-scale: remove a skinned page's persisted zoom
  // (zoom cannot be subtree-overridden — same rationale as DashboardView).
  useEffect(() => {
    document.documentElement.style.removeProperty('zoom');
  }, []);

  // Gate: the flow is only for accounts with NO doc. exists:true bounces to
  // /dashboard. setState only fires after await boundaries (the lint bans
  // synchronous setState inside effects).
  useEffect(() => {
    if (!auth.authReady || !auth.authenticated) return;
    let active = true;
    async function load() {
      try {
        const res = await fetch('/api/portfolio/meta');
        if (!active) return;
        if (!res.ok) {
          setMetaError('Could not check your account — refresh to try again.');
          return;
        }
        const data: { exists?: unknown } = await res.json();
        if (!active) return;
        if (data.exists === true) {
          router.replace('/dashboard');
          return;
        }
        setChecked(true);
      } catch {
        if (!active) return;
        setMetaError('Could not check your account — refresh to try again.');
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [auth.authReady, auth.authenticated, router]);

  // Live slug availability (debounced). The trimmed slug rides the status
  // itself, so a late response for an older query can never win — render
  // derives "checking" until the current value's answer arrives.
  useEffect(() => {
    if (!auth.authenticated) return;
    const trimmed = slug.trim();
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
  }, [slug, auth.authenticated]);

  const trimmedName = name.trim();
  const trimmedSlug = slug.trim();
  const normalizedSlug = normalizeSlug(slug);
  // Effective status for the CURRENT input: empty = idle; anything whose
  // answer belongs to an older query reads as still-checking.
  const status: SlugStatus =
    trimmedSlug === ''
      ? { kind: 'idle' }
      : slugStatus.kind === 'idle' || slugStatus.for !== trimmedSlug
        ? { kind: 'checking', for: trimmedSlug }
        : slugStatus;

  const canCreate =
    trimmedName !== '' &&
    normalizedSlug !== null &&
    status.kind === 'available' &&
    !submitting;

  function handleNameChange(next: string) {
    setName(next);
    if (!slugTouched) setSlug(suggestSlug(next));
  }

  function handleSlugChange(next: string) {
    setSlug(next);
    setSlugTouched(true);
    setSubmitError(null);
  }

  async function handleCreate() {
    if (!canCreate || design === null || normalizedSlug === null) return;
    setSubmitting(true);
    setSubmitError(null);
    const forSlug = trimmedSlug;
    try {
      const doc = buildInitialDoc({
        name: trimmedName,
        role: role,
        design,
        slug: normalizedSlug,
      });
      const res = await fetch('/api/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      if (res.status === 409) {
        setSlugStatus({ kind: 'taken', for: forSlug });
        setSubmitError('That link was just claimed — pick another one.');
        return;
      }
      if (res.status === 400) {
        // Distinguish the server's rejection reasons: invalid-slug is the
        // expected race (someone claimed it between check and submit);
        // anything else is unexpected — keep it honest and generic.
        const err = await res.json().catch(() => null);
        if (
          err !== null &&
          typeof err === 'object' &&
          (err as { error?: unknown }).error === 'invalid-slug'
        ) {
          setSlugStatus({ kind: 'invalid', for: forSlug });
          setSubmitError('That link is not valid — pick another one.');
        } else {
          setSubmitError('Could not create your portfolio — try again.');
        }
        return;
      }
      if (!res.ok) {
        setSubmitError('Could not create your portfolio — try again.');
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
        setSubmitError('The server returned an unexpected document — try again.');
        return;
      }
      // Handoff writes (the only two sanctioned ones): the confirmed doc
      // becomes the editor's draft AND the last-saved baseline, so the
      // editor at /?edit=true opens idle — the seed never shows as theirs.
      savePortfolioData(confirmed);
      recordLastSaved(confirmed);
      router.push('/?edit=true');
    } catch {
      setSubmitError('Network error — could not reach the server.');
    } finally {
      setSubmitting(false);
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

  // Front door: after login the form pushes /dashboard; a no-doc account
  // sees the dashboard's Get started card, which opens this flow (no
  // auto-forward — 5e-g).
  if (!auth.authenticated) {
    return (
      <main data-admin-theme="" className="flex min-h-dvh flex-col">
        <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight">
              Create your portfolio
            </h1>
            <p className="mt-1 text-sm opacity-60">
              Sign in to pick a design and build your site.
            </p>
          </header>
          <FirebaseLoginCard onLoginWithIdToken={auth.loginWithIdToken} />
        </div>
      </main>
    );
  }

  if (metaError) {
    return (
      <main data-admin-theme="" className="min-h-dvh">
        <div className="mx-auto w-full max-w-2xl px-6 py-12">
          <p role="alert" className={`text-sm text-red-500 ${CARD}`}>
            {metaError}
          </p>
        </div>
      </main>
    );
  }

  if (!checked) {
    return (
      <main data-admin-theme="" className="grid min-h-dvh place-items-center">
        <p className="animate-pulse font-mono text-sm opacity-40">~/loading…</p>
      </main>
    );
  }

  return (
    <main data-admin-theme="" className="min-h-dvh">
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your portfolio
          </h1>
          <p className="mt-1 text-sm opacity-60">
            {step === 1
              ? 'Step 1 of 2 — pick a look. You can restyle every block later.'
              : 'Step 2 of 2 — tell us who you are and claim your link.'}
          </p>
        </header>

        {step === 1 ? (
          <section className="settle-in mt-8">
            <div className="grid gap-3 sm:grid-cols-2">
              {BLOCK_DESIGNS.map((value) => {
                const selected = design === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDesign(value)}
                    className={`rounded-skin border bg-surface p-4 text-left ${
                      selected
                        ? 'border-accent ring-2 ring-accent/30'
                        : 'border-[var(--border)] hover:border-[var(--foreground)]/30'
                    }`}
                  >
                    <DesignSwatch design={value} />
                    <span className="mt-3 flex items-center gap-2 text-sm font-medium">
                      {DESIGN_META[value].label}
                      {selected && (
                        <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[11px] text-accent">
                          Selected
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs opacity-60">
                      {DESIGN_META[value].blurb}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={design === null}
                title={design === null ? 'Pick a design to continue' : undefined}
                onClick={() => setStep(2)}
                className="rounded-skin border border-accent bg-accent px-4 py-2 text-sm font-medium text-background disabled:pointer-events-none disabled:opacity-40"
              >
                Continue
              </button>
              {design === null && (
                <p className="text-xs opacity-50">Pick a design to continue.</p>
              )}
            </div>
          </section>
        ) : (
          <section className="settle-in mt-8 space-y-5">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Your name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
                className={INPUT}
              />
              <span className="mt-1 block text-xs opacity-50">
                Shown big at the top of your portfolio.
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                What you do <span className="font-normal opacity-50">(optional)</span>
              </span>
              <input
                type="text"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="Designer, student, engineer…"
                className={INPUT}
              />
              <span className="mt-1 block text-xs opacity-50">
                Types itself out under your name — one role for now.
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">Your link</span>
              <div className="flex items-center gap-0">
                <span className="rounded-l-skin border border-r-0 border-[var(--border)] bg-surface px-3 py-2 font-mono text-sm opacity-60">
                  /u/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                  placeholder="jane-doe"
                  autoComplete="off"
                  spellCheck={false}
                  className={`${INPUT} rounded-l-none font-mono`}
                />
              </div>
              <p className="mt-1.5 font-mono text-xs" aria-live="polite">
                {status.kind === 'idle' && (
                  <span className="opacity-50">
                    3–40 lowercase letters, numbers, hyphens — you can change
                    it later.
                  </span>
                )}
                {status.kind === 'checking' && (
                  <span className="opacity-50">Checking…</span>
                )}
                {status.kind === 'available' && (
                  <span className="text-emerald-600">
                    ✓ /u/{normalizedSlug ?? trimmedSlug} is available
                  </span>
                )}
                {status.kind === 'taken' && (
                  <span className="text-red-500">
                    /u/{normalizedSlug ?? trimmedSlug} is already taken — try
                    another.
                  </span>
                )}
                {status.kind === 'reserved' && (
                  <span className="text-red-500">
                    That one is reserved by the site — try another.
                  </span>
                )}
                {status.kind === 'invalid' && (
                  <span className="text-red-500">
                    Use 3–40 lowercase letters, numbers or hyphens (no edge
                    hyphens).
                  </span>
                )}
                {status.kind === 'error' && (
                  <span className="text-red-500">
                    Could not check availability — try again.
                  </span>
                )}
              </p>
              {submitError && (
                <p role="alert" className="mt-1 text-sm text-red-500">
                  {submitError}
                </p>
              )}
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={!canCreate}
                title={
                  canCreate
                    ? undefined
                    : 'Add your name and an available link first'
                }
                onClick={() => void handleCreate()}
                className="rounded-skin border border-accent bg-accent px-4 py-2 text-sm font-medium text-background disabled:pointer-events-none disabled:opacity-40"
              >
                {submitting ? 'Creating…' : 'Create my portfolio'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep(1)}
                className="rounded-skin border border-[var(--border)] bg-background px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                Back
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
