import type { PortfolioData } from '@/types/schema';
import seed from '../../content/playground.json';

/**
 * The playground's own document — the committed demo content, separate
 * from `content/portfolio.json` so an owner replacing their publish file
 * never changes what the playground teaches. In-memory only: the
 * playground never persists anything (see src/playground/store.ts).
 */
export const initialPlaygroundDoc: PortfolioData = seed as PortfolioData;
