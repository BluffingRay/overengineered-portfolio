'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { PortfolioData } from '@/types/schema';
import {
  getPortfolioDataSnapshot,
  getPortfolioDataServerSnapshot,
  subscribeToPortfolioData,
  savePortfolioData,
  resetPortfolioData,
} from '@/lib/storage';

export function usePortfolioData() {
  const data = useSyncExternalStore(
    subscribeToPortfolioData,
    getPortfolioDataSnapshot,
    getPortfolioDataServerSnapshot,
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

  return { data, mutate, reset };
}
