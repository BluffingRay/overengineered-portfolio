'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { savePortfolioData, subscribeToPortfolioData } from '@/lib/storage';
import type { PortfolioData } from '@/types/schema';
import {
  hasLastSaved,
  isDirty,
  readLastSavedAt,
  recordLastSaved,
  resolveLoadOffer,
  saveToHosted,
  seedLastSaved,
  type HostedSaveState,
} from '@/lib/hostedDoc';
import { fetchHostedDoc } from '@/lib/hosted/fetch';

/**
 * FIX-C — hosted save layer. Wraps the existing portfolio store (does
 * NOT fork it): exposes dirty state, the explicit save action, and the
 * beforeunload guard for hosted mode. Inert in Product B — the hook
 * returns a no-op layer unless `hosted` is true, so no save UI renders.
 *
 * `hosted` comes from useAuth (server-driven). `authenticated` gates
 * saving: dirty tracking is meaningful only while the user can edit.
 *
 * 5e-e adds the load path that defuses FIX-C's seed-overwrite landmine:
 * when the mount-time seed proves the draft is unverified (fresh device,
 * draft ≠ hosted doc), `loadOffer` surfaces a Load-vs-Keep choice
 * instead of letting Save silently overwrite the hosted portfolio.
 */
export function useHostedDoc(hosted: boolean, authenticated: boolean) {
  // Re-evaluate dirty on every store change (mutation/undo/redo/import).
  const storeTick = useSyncExternalStore(
    subscribeToPortfolioData,
    () => 0,
    () => 0,
  );
  const [state, setState] = useState<HostedSaveState>({ status: 'idle' });
  // Lazy init: UtilityBar (the only consumer) mounts after the ready gate,
  // so this never runs during hydration — and the server snapshot is null
  // via the helper's try/catch anyway.
  const [savedAt, setSavedAt] = useState<number | null>(() => readLastSavedAt());
  const savingRef = useRef(false);
  // 5e-e — load-offer state. Decided ONCE per mount inside the seed
  // function below; edits/undo after mount never re-derive it.
  const [loadOfferActive, setLoadOfferActive] = useState(false);
  const [loadOfferLoading, setLoadOfferLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadOfferDecidedRef = useRef(false);
  const loadingRef = useRef(false);

  // First hosted visit: seed last-saved so dirty tracking has a base.
  // Do it only when clean of draft-vs-saved knowledge: if there's
  // already a snapshot, keep it (it's the truth from the last save).
  useEffect(() => {
    if (!hosted) return;
    async function seedLastSavedFromServer() {
      if (loadOfferDecidedRef.current) return;
      loadOfferDecidedRef.current = true;
      const fetched = await fetchHostedDoc();
      if (!fetched.ok) return;
      const doc = fetched.doc;
      if (doc && typeof doc === 'object' && Array.isArray(doc.tabs)) {
        const hadSnapshot = hasLastSaved();
        seedLastSaved(doc);
        if (readLastSavedAt() !== null) setSavedAt(readLastSavedAt());
        setLoadOfferActive(
          resolveLoadOffer({ hadSnapshot, fetchOk: true, dirtyNow: isDirty() }),
        );
      }
    }
    void seedLastSavedFromServer();
  }, [hosted]);

  const dirty = hosted && authenticated && isDirty();

  const save = useCallback(async () => {
    if (!hosted || savingRef.current) return;
    savingRef.current = true;
    setState({ status: 'saving' });
    const result = await saveToHosted();
    if (result.ok) {
      // Draft becomes the confirmed doc: write it back through the
      // normal store (updates UI + localStorage draft) and record the
      // snapshot. Undo history keeps working — this is a regular save.
      savePortfolioData(result.confirmed);
      recordLastSaved(result.confirmed);
      const now = Date.now();
      setSavedAt(now);
      setState({ status: 'saved', savedAt: now });
    } else {
      setState({ status: 'error', message: result.error, needsAuth: result.needsAuth });
    }
    savingRef.current = false;
  }, [hosted]);

  // 5e-e — the offer's action: replace the draft with the hosted doc.
  // Failures set an inline error and KEEP the offer; success runs the
  // same two sanctioned writes as save/onboarding (confirmed doc into
  // the store + last-saved re-stamp), so the pill goes idle and undo
  // still holds the pre-load draft as "previous".
  const load = useCallback(async () => {
    if (!hosted || loadingRef.current) return;
    loadingRef.current = true;
    setLoadOfferLoading(true);
    setLoadError(null);
    const fetched = await fetchHostedDoc();
    if (!fetched.ok) {
      setLoadError(fetched.error);
      loadingRef.current = false;
      setLoadOfferLoading(false);
      return;
    }
    const confirmed = fetched.doc;
    savePortfolioData(confirmed);
    recordLastSaved(confirmed);
    setSavedAt(readLastSavedAt());
    setLoadOfferActive(false);
    loadingRef.current = false;
    setLoadOfferLoading(false);
  }, [hosted]);

  // Session-only dismissal — no persistence: a reload re-runs detection.
  const dismiss = useCallback(() => {
    setLoadOfferActive(false);
  }, []);

  // Native leave-site guard while dirty (hosted mode only).
  useEffect(() => {
    if (!hosted || !dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome needs this; most browsers show their own string.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hosted, dirty]);

  return {
    dirty,
    state,
    savedAt,
    save,
    // storeTick is exported so callers can key re-renders off store
    // changes (isDirty() reads localStorage imperatively).
    storeTick,
    // 5e-e — the load offer. Inert in B / unauthed: all-false, no-op
    // actions (active needs a successful authenticated seed to fire).
    loadOffer: {
      active: hosted && authenticated && loadOfferActive,
      loading: hosted && loadOfferLoading,
      error: hosted ? loadError : null,
      load,
      dismiss,
    },
  };
}
