'use client';

import type { PortfolioData } from '@/types/schema';
import type { PortfolioStore } from '@/hooks/usePortfolioData';
import { initialPlaygroundDoc } from '@/data/initialPlaygroundDoc';

/**
 * The playground's own store — entirely self-contained. The document
 * lives in MEMORY ONLY, seeded from content/playground.json (via
 * src/data/initialPlaygroundDoc). It never touches localStorage,
 * sessionStorage, the network, or the real document store: a refresh
 * IS the reset. Same shape as the global store so the whole editor tree
 * runs on it unchanged through PortfolioStoreProvider.
 */
export function createPlaygroundStore(): PortfolioStore & { stats: () => { mutations: number } } {
  let doc: PortfolioData = structuredClone(initialPlaygroundDoc);
  const undoStack: PortfolioData[] = [];
  let redoStack: PortfolioData[] = [];
  let mutations = 0;
  const listeners = new Set<() => void>();

  const history = () => ({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => doc,
    getServerSnapshot: () => initialPlaygroundDoc,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getHistory: history,
    getHistoryServer: () => ({ canUndo: false, canRedo: false }),
    mutate: (recipe) => {
      undoStack.push(doc);
      if (undoStack.length > 25) undoStack.shift();
      redoStack = [];
      doc = recipe(doc);
      mutations++;
      notify();
    },
    reset: () => {
      undoStack.push(doc);
      redoStack = [];
      doc = structuredClone(initialPlaygroundDoc);
      mutations++;
      notify();
    },
    undo: () => {
      const previous = undoStack.pop();
      if (previous === undefined) return;
      redoStack.push(doc);
      doc = previous;
      notify();
    },
    redo: () => {
      const next = redoStack.pop();
      if (next === undefined) return;
      undoStack.push(doc);
      doc = next;
      notify();
    },
    stats: () => ({ mutations }),
  };
}

/** Exposed for the verify script (pure Node, no window). */
export { initialPlaygroundDoc };
