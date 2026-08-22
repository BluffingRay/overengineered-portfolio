import { initialData } from '@/data/initialData';
import { THEME_SKINS } from '@/types/schema';
import type { PortfolioData, Tab } from '@/types/schema';

const STORAGE_KEY = 'portfolio-data';
const CHANGE_EVENT = 'portfolio-data:changed';

const CURRENT_VERSION = 2;

interface SnapshotCache {
  raw: string | null;
  data: PortfolioData;
}

let snapshotCache: SnapshotCache | null = null;
const listeners = new Set<() => void>();

const HISTORY_LIMIT = 25;
let undoStack: PortfolioData[] = [];
let redoStack: PortfolioData[] = [];

interface HistorySnapshot {
  canUndo: boolean;
  canRedo: boolean;
}

const EMPTY_HISTORY: HistorySnapshot = { canUndo: false, canRedo: false };
let historySnapshot: HistorySnapshot = EMPTY_HISTORY;

function syncHistorySnapshot(): void {
  const next: HistorySnapshot = {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };

  if (next.canUndo !== historySnapshot.canUndo || next.canRedo !== historySnapshot.canRedo) {
    historySnapshot = next;
  }
}

export function getHistorySnapshot(): HistorySnapshot {
  return historySnapshot;
}

export function getHistoryServerSnapshot(): HistorySnapshot {
  return EMPTY_HISTORY;
}

function pristine(): PortfolioData {
  return structuredClone(initialData);
}

function isPortfolioData(value: unknown): value is PortfolioData {
  if (typeof value !== 'object' || value === null) return false;

  const data = value as Record<string, unknown>;
  if (data.version !== CURRENT_VERSION) return false;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function migrateRichTextContent(content: string): string {
  if (/<\/?[a-z][^>]*>/i.test(content)) return content;

  return content
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');
}

function migrateV1ToV2(
  document: Record<string, unknown>,
): Record<string, unknown> {
  const tabs = Array.isArray(document.tabs) ? document.tabs : [];

  return {
    ...document,
    version: CURRENT_VERSION,
    tabs: tabs.map((tab) => ({
      ...tab,
      blocks: Array.isArray(tab.blocks)
        ? tab.blocks.map((block) =>
            block.type === 'rich_text' && typeof block.content === 'string'
              ? {
                  ...block,
                  content: migrateRichTextContent(block.content),
                }
              : block,
          )
        : [],
    })),
  };
}

function prepareDocument(parsed: unknown): PortfolioData | null {
  if (typeof parsed !== 'object' || parsed === null) return null;

  let candidate = parsed as Record<string, unknown>;

  if (candidate.version === 1) {
    candidate = migrateV1ToV2(candidate);
  }

  return isPortfolioData(candidate) ? candidate : null;
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

function notify(): void {
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

function writeDocument(data: PortfolioData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    console.warn('[storage] could not persist portfolio data');
    return false;
  }
}

export function savePortfolioData(data: PortfolioData): void {
  if (typeof window === 'undefined') return;

  const previous = getPortfolioDataSnapshot();
  if (!writeDocument(data)) return;

  undoStack.push(previous);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  syncHistorySnapshot();

  notify();
}

export function undoPortfolioData(): void {
  if (typeof window === 'undefined' || undoStack.length === 0) return;

  const current = getPortfolioDataSnapshot();
  const target = undoStack.pop();
  if (!target || !writeDocument(target)) {
    if (target) undoStack.push(target);
    return;
  }

  redoStack.push(current);
  syncHistorySnapshot();
  notify();
}

export function redoPortfolioData(): void {
  if (typeof window === 'undefined' || redoStack.length === 0) return;

  const current = getPortfolioDataSnapshot();
  const target = redoStack.pop();
  if (!target || !writeDocument(target)) {
    if (target) redoStack.push(target);
    return;
  }

  undoStack.push(current);
  syncHistorySnapshot();
  notify();
}

export function resetPortfolioData(): void {
  if (typeof window === 'undefined') return;

  const previous = getPortfolioDataSnapshot();
  window.localStorage.removeItem(STORAGE_KEY);

  undoStack.push(previous);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  syncHistorySnapshot();

  notify();
}
