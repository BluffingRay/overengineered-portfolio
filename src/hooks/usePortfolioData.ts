'use client';

import { useCallback, useSyncExternalStore } from 'react';
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

export function usePortfolioData() {
  const data = useSyncExternalStore(
    subscribeToPortfolioData,
    getPortfolioDataSnapshot,
    getPortfolioDataServerSnapshot,
  );

  const history = useSyncExternalStore(
    subscribeToPortfolioData,
    getHistorySnapshot,
    getHistoryServerSnapshot,
  );

  const mutate = useCallback(
    (recipe: (current: PortfolioData) => PortfolioData) => {
      savePortfolioData(recipe(getPortfolioDataSnapshot()));
    },
    [],
  );

  const reset = useCallback(() => {
    resetPortfolioData();
  }, []);

  const undo = useCallback(() => {
    undoPortfolioData();
  }, []);

  const redo = useCallback(() => {
    redoPortfolioData();
  }, []);

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
