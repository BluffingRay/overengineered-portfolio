import { initialData } from '@/data/initialData';
import type { PortfolioData } from '@/types/schema';
import { CHANGE_EVENT, STORAGE_KEY } from './constants';
import { prepareDocument } from './sanitize';

interface SnapshotCache {
  raw: string | null;
  data: PortfolioData;
}

let snapshotCache: SnapshotCache | null = null;
export const listeners = new Set<() => void>();

function pristine(): PortfolioData {
  return structuredClone(initialData);
}

export function getPortfolioDataSnapshot(): PortfolioData {
  if (typeof window === 'undefined') return initialData;

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (snapshotCache && snapshotCache.raw === raw) {
    return snapshotCache.data;
  }

  let data = pristine();
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      const prepared = prepareDocument(parsed);
      if (prepared) data = prepared;
    } catch {
      data = pristine();
    }
  }

  snapshotCache = { raw, data };
  return data;
}

export function getPortfolioDataServerSnapshot(): PortfolioData {
  return initialData;
}

export function subscribeToPortfolioData(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  window.addEventListener(CHANGE_EVENT, listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

export function notify(): void {
  for (const listener of listeners) listener();
}

export function importPortfolioData(raw: string): PortfolioData | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return prepareDocument(parsed);
  } catch {
    return null;
  }
}

export function writeDocument(data: PortfolioData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    console.warn('[storage] could not persist portfolio data');
    return false;
  }
}

export function resetSnapshotCache(): void {
  snapshotCache = null;
}
