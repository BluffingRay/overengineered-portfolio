import { initialData } from '@/data/initialData';
import { THEME_SKINS } from '@/types/schema';
import type { PortfolioData, Tab } from '@/types/schema';

const STORAGE_KEY = 'portfolio-data';
const CHANGE_EVENT = 'portfolio-data:changed';

interface SnapshotCache {
  raw: string | null;
  data: PortfolioData;
}

let snapshotCache: SnapshotCache | null = null;
const listeners = new Set<() => void>();

function pristine(): PortfolioData {
  return structuredClone(initialData);
}

function isPortfolioData(value: unknown): value is PortfolioData {
  if (typeof value !== 'object' || value === null) return false;

  const data = value as Record<string, unknown>;
  if (data.version !== 1) return false;
  if (typeof data.skin !== 'string' || !THEME_SKINS.some((s) => s === data.skin))
    return false;
  if (!Array.isArray(data.tabs)) return false;

  return data.tabs.every((tab): tab is Tab => {
    if (typeof tab !== 'object' || tab === null) return false;
    const t = tab as Record<string, unknown>;
    return (
      typeof t.id === 'string' &&
      typeof t.label === 'string' &&
      Array.isArray(t.blocks)
    );
  });
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
      if (isPortfolioData(parsed)) data = parsed;
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

function notify(): void {
  for (const listener of listeners) listener();
}

export function importPortfolioData(raw: string): PortfolioData | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPortfolioData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePortfolioData(data: PortfolioData): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('[storage] could not persist portfolio data');
    return;
  }

  notify();
}

export function resetPortfolioData(): void {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(STORAGE_KEY);
  notify();
}
