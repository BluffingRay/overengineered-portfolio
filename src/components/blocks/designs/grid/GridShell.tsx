'use client';

import Reveal from '@/components/blocks/Reveal';
import type { AppCardItem } from '@/types/schema';
import { staggerDelay } from './shared';

interface GridShellProps {
  cards: AppCardItem[] | undefined;
  cardIds: string[];
  renderCard: (card: AppCardItem, index: number) => React.ReactNode;
}

export default function GridShell({ cards, cardIds, renderCard }: GridShellProps) {
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));
  return (
    <>
      {cardIds.map((id, index) => {
        const card = cardById.get(id);
        if (!card) return null;
        return (
          <Reveal key={id} delay={staggerDelay(index)}>
            {renderCard(card, index)}
          </Reveal>
        );
      })}
    </>
  );
}
