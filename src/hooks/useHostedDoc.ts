'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { savePortfolioData, subscribeToPortfolioData } from '@/lib/storage';
import {
  isDirty,
  readLastSavedAt,
  recordLastSaved,
  saveToHosted,
  seedLastSaved,
  type HostedSaveState,
} from '@/lib/hostedDoc';

/**
 * FIX-C — hosted save layer. Wraps the existing portfolio store (does
 * NOT fork it): exposes dirty state, the explicit save action, and the
 * beforeunload guard for hosted mode. Inert in Product B — the hook
 * returns a no-op layer unless `hosted` is true, so no save UI renders.
 *
 * `hosted` comes from useAuth (server-driven). `authenticated` gates
 * saving: dirty tracking is meaningful only while the user can edit.
 */
export function useHostedDoc(hosted: boolean, authenticated: boolean) {
  // Re-evaluate dirty on every store change (mutation/undo/redo/import).
  const storeTick = useSyncExternalStore(
    subscribeToPortfolioData,
    () => 0,
    () => 0,
  );
  const [state, setState] = useState<HostedSaveState>({ status: 'idle' });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const savingRef = useRef(false);
  // Seed savedAt once mounted (localStorage read must be client-side).
  useEffect(() => {
    setSavedAt(readLastSavedAt());
  }, []);

  // First hosted visit: seed last-saved so dirty tracking has a base.
  // Do it only when clean of draft-vs-saved knowledge: if there's
  // already a snapshot, keep it (it's the truth from the last save).
  useEffect(() => {
    if (!hosted) return;
    seedLastSavedFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hosted]);

  async function seedLastSavedFromServer() {
    try {
      const res = await fetch('/api/portfolio?full=1', { cache: 'no-store' });
      if (res.status === 401) return; // not signed in — no seed
      const doc = await res.json();
      if (doc && typeof doc === 'object' && Array.isArray(doc.tabs)) {
        seedLastSaved(doc);
        if (readLastSavedAt() === null) setSavedAt(readLastSavedAt());
      }
    } catch {
      // Offline — leave unseeded; first save sets the baseline.
    }
  }

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
  };
}
