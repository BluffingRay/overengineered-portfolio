'use client';

import { useCallback } from 'react';
import type { AppCardItem, Block, PortfolioData } from '@/types/schema';
import { usePortfolioData } from './usePortfolioData';

export function useBlockMutations(activeTabId: string) {
  const { mutate } = usePortfolioData();

  const updateBlocks = useCallback(
    (recipe: (blocks: Block[]) => Block[]) => {
      mutate(
        (current): PortfolioData => ({
          ...current,
          tabs: current.tabs.map((tab) =>
            tab.id === activeTabId
              ? { ...tab, blocks: recipe(tab.blocks) }
              : tab,
          ),
        }),
      );
    },
    [mutate, activeTabId],
  );

  const updateBlock = useCallback(
    (blockId: string, patch: Record<string, unknown>) => {
      updateBlocks((blocks) =>
        blocks.map((candidate) =>
          candidate.id === blockId
            ? ({ ...candidate, ...patch } as Block)
            : candidate,
        ),
      );
    },
    [updateBlocks],
  );

  const updateAppsOf = useCallback(
    (blockId: string, recipe: (apps: AppCardItem[]) => AppCardItem[]) => {
      updateBlocks((blocks) =>
        blocks.map((candidate) => {
          if (candidate.id !== blockId || candidate.type !== 'app_grid') {
            return candidate;
          }
          return { ...candidate, apps: recipe(candidate.apps) };
        }),
      );
    },
    [updateBlocks],
  );

  const updateApp = useCallback(
    (blockId: string, appId: string, patch: Record<string, unknown>) => {
      updateAppsOf(blockId, (apps) =>
        apps.map((app) =>
          app.id === appId ? ({ ...app, ...patch } as AppCardItem) : app,
        ),
      );
    },
    [updateAppsOf],
  );

  return { updateBlocks, updateBlock, updateAppsOf, updateApp };
}
