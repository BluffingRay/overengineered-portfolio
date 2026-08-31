// M7 — shared helpers for verify scripts (check/makeDoc/tab)
import type { PortfolioData } from '@/types/schema';
import { prepareDocument } from '@/lib/storage';

export function check(condition: boolean, msg: string) {
  if (!condition) throw new Error(`check failed: ${msg}`);
}

export function makeDoc(overrides: Partial<PortfolioData> = {}): PortfolioData {
  const base: PortfolioData = {
    version: 3,
    tabs: [{ id: 'tab-1', label: 'Home', blocks: [] }],
    cards: [],
    theme: { accentColor: '#000', fontFamily: undefined },
    skin: 'clean',
  } as unknown as PortfolioData;
  const prepared = prepareDocument({ ...base, ...overrides } as unknown as PortfolioData);
  if (!prepared) throw new Error('makeDoc: prepareDocument returned null');
  return prepared;
}

export function tab(id: string, label: string) {
  return { id, label, blocks: [] as PortfolioData['tabs'][number]['blocks'] };
}
