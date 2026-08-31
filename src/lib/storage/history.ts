import type { PortfolioData } from '@/types/schema';
import { EMPTY_HISTORY, HISTORY_LIMIT, STORAGE_KEY } from './constants';
import {
  getPortfolioDataSnapshot,
  notify,
  writeDocument,
} from './persist';

interface HistorySnapshot {
  canUndo: boolean;
  canRedo: boolean;
}

const undoStack: PortfolioData[] = [];
let redoStack: PortfolioData[] = [];

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
