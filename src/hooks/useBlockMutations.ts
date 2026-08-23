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

  /** Transfer a block to another tab — ONE document transaction (remove
      from source + append to target) so undo/history stays coherent. */
  const moveBlockToTab = useCallback(
    (blockId: string, targetTabId: string) => {
      mutate((current): PortfolioData => {
        const fromTab = current.tabs.find((tab) =>
          tab.blocks.some((block) => block.id === blockId),
        );
        const toTab = current.tabs.find((tab) => tab.id === targetTabId);
        if (!fromTab || !toTab || fromTab.id === toTab.id) return current;

        const block = fromTab.blocks.find(
          (candidate) => candidate.id === blockId,
        );
        if (!block) return current;

        return {
          ...current,
          tabs: current.tabs.map((tab) => {
            if (tab.id === fromTab.id) {
              return {
                ...tab,
                blocks: tab.blocks.filter(
                  (candidate) => candidate.id !== blockId,
                ),
              };
            }
            if (tab.id === toTab.id) {
              return { ...tab, blocks: [...tab.blocks, block] };
            }
            return tab;
          }),
        };
      });
    },
    [mutate],
  );

  /** Grid-level reference list ops (attach / detach / reorder). */
  const updateAppsOf = useCallback(
    (blockId: string, recipe: (apps: string[]) => string[]) => {
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

  /** Library-level edit: propagates to every grid referencing the card. */
  const updateCard = useCallback(
    (cardId: string, patch: Record<string, unknown>) => {
      mutate(
        (current): PortfolioData => ({
          ...current,
          cards: current.cards.map((card) =>
            card.id === cardId ? ({ ...card, ...patch } as AppCardItem) : card,
          ),
        }),
      );
    },
    [mutate],
  );

  /** Create a library card and attach it to this grid in one step. */
  const addCardToGrid = useCallback(
    (blockId: string, card: AppCardItem) => {
      mutate(
        (current): PortfolioData => ({
          ...current,
          cards: [...current.cards, card],
          tabs: current.tabs.map((tab) =>
            tab.id === activeTabId
              ? {
                  ...tab,
                  blocks: tab.blocks.map((block) =>
                    block.id === blockId && block.type === 'app_grid'
                      ? { ...block, apps: [...block.apps, card.id] }
                      : block,
                  ),
                }
              : tab,
          ),
        }),
      );
    },
    [mutate, activeTabId],
  );

  /** Detach from one grid only — the card stays in the library. */
  const detachApp = useCallback(
    (blockId: string, cardId: string) => {
      updateAppsOf(blockId, (apps) => apps.filter((id) => id !== cardId));
    },
    [updateAppsOf],
  );

  /** Remove from the library and detach from every grid everywhere. */
  const deleteCardGlobally = useCallback(
    (cardId: string) => {
      mutate(
        (current): PortfolioData => ({
          ...current,
          cards: current.cards.filter((card) => card.id !== cardId),
          tabs: current.tabs.map((tab) => ({
            ...tab,
            blocks: tab.blocks.map((block) =>
              block.type === 'app_grid'
                ? {
                    ...block,
                    apps: block.apps.filter((id) => id !== cardId),
                  }
                : block,
            ),
          })),
        }),
      );
    },
    [mutate],
  );

  /** Attach an existing library card to this grid at an optional index. */
  const attachCardToGrid = useCallback(
    (blockId: string, cardId: string, atIndex?: number) => {
      updateAppsOf(blockId, (apps) => {
        if (apps.includes(cardId)) return apps;
        if (atIndex === undefined) return [...apps, cardId];
        const next = [...apps];
        next.splice(Math.min(Math.max(atIndex, 0), next.length), 0, cardId);
        return next;
      });
    },
    [updateAppsOf],
  );

  /**
   * Clone a library card into an independent new card and attach it right
   * after the source reference — "make this one unique" escape hatch.
   */
  const duplicateAsIndependent = useCallback(
    (blockId: string, cardId: string) => {
      mutate(
        (current): PortfolioData => {
          const source = current.cards.find((card) => card.id === cardId);
          if (!source) return current;

          const clone: AppCardItem = {
            ...structuredClone(source),
            id: crypto.randomUUID(),
          };

          return {
            ...current,
            cards: [...current.cards, clone],
            tabs: current.tabs.map((tab) =>
              tab.id === activeTabId
                ? {
                    ...tab,
                    blocks: tab.blocks.map((block) => {
                      if (
                        block.id !== blockId ||
                        block.type !== 'app_grid'
                      ) {
                        return block;
                      }
                      const from = block.apps.indexOf(cardId);
                      if (from === -1) return block;
                      const apps = [...block.apps];
                      apps.splice(from + 1, 0, clone.id);
                      return { ...block, apps };
                    }),
                  }
                : tab,
            ),
          };
        },
      );
    },
    [mutate, activeTabId],
  );

  return {
    updateBlocks,
    updateBlock,
    moveBlockToTab,
    updateAppsOf,
    updateCard,
    addCardToGrid,
    detachApp,
    deleteCardGlobally,
    attachCardToGrid,
    duplicateAsIndependent,
  };
}
