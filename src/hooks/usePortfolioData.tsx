'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { PortfolioData } from '@/types/schema';
import {
  getPortfolioDataSnapshot,
  getPortfolioDataServerSnapshot,
  subscribeToPortfolioData,
  getHistorySnapshot,
  getHistoryServerSnapshot,
  savePortfolioData,
  resetPortfolioData,
  undoPortfolioData,
  redoPortfolioData,
} from '@/lib/storage';

/**
 * The one seam editor components cross to reach document state. Everything
 * in the editor tree (BlockList, forms, TabsManager, usePosts, …) reads
 * the document ONLY through `usePortfolioData()`, so a provider can swap
 * the implementation without those components knowing — that is how the
 * playground (src/playground) runs the real editor over its own
 * in-memory demo doc. `null` context = the global localStorage store.
 */
export interface PortfolioStore {
  getSnapshot: () => PortfolioData;
  getServerSnapshot: () => PortfolioData;
  subscribe: (listener: () => void) => () => void;
  getHistory: () => { canUndo: boolean; canRedo: boolean };
  getHistoryServer: () => { canUndo: boolean; canRedo: boolean };
  mutate: (recipe: (current: PortfolioData) => PortfolioData) => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
}

const globalStore: PortfolioStore = {
  getSnapshot: getPortfolioDataSnapshot,
  getServerSnapshot: getPortfolioDataServerSnapshot,
  subscribe: subscribeToPortfolioData,
  getHistory: getHistorySnapshot,
  getHistoryServer: getHistoryServerSnapshot,
  mutate: (recipe) => savePortfolioData(recipe(getPortfolioDataSnapshot())),
  reset: resetPortfolioData,
  undo: undoPortfolioData,
  redo: redoPortfolioData,
};

const PortfolioStoreContext = createContext<PortfolioStore | null>(null);

/** Playground-only: supplies an alternative store to the editor tree. */
export function PortfolioStoreProvider({
  store,
  children,
}: {
  store: PortfolioStore;
  children: ReactNode;
}) {
  return (
    <PortfolioStoreContext.Provider value={store}>
      {children}
    </PortfolioStoreContext.Provider>
  );
}

export function usePortfolioData() {
  const store = useContext(PortfolioStoreContext) ?? globalStore;

  const data = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const history = useSyncExternalStore(
    store.subscribe,
    store.getHistory,
    store.getHistoryServer,
  );

  const mutate = useCallback(
    (recipe: (current: PortfolioData) => PortfolioData) => {
      store.mutate(recipe);
    },
    [store],
  );

  const reset = useCallback(() => {
    store.reset();
  }, [store]);

  const undo = useCallback(() => {
    store.undo();
  }, [store]);

  const redo = useCallback(() => {
    store.redo();
  }, [store]);

  return {
    data,
    mutate,
    reset,
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };
}

/** Convenience for non-hook readers (rare) — the store in effect. */
export function usePortfolioStore(): PortfolioStore {
  const store = useContext(PortfolioStoreContext);
  return useMemo(() => store ?? globalStore, [store]);
}
