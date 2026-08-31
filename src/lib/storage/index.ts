// Barrel — keeps `import '@/lib/storage'` working after the split.
// Re-exports the public surface that `hooks/usePortfolioData` and direct
// consumers (tests, scripts) rely on.

export { isPortfolioData, prepareDocument } from './sanitize';
export {
  getPortfolioDataSnapshot,
  getPortfolioDataServerSnapshot,
  subscribeToPortfolioData,
  importPortfolioData,
  writeDocument,
  notify,
  listeners,
} from './persist';
export {
  getHistorySnapshot,
  getHistoryServerSnapshot,
  savePortfolioData,
  undoPortfolioData,
  redoPortfolioData,
  resetPortfolioData,
} from './history';
export { migrateV1ToV2, migrateV2ToV3 } from './migrations';
export { STORAGE_KEY, CHANGE_EVENT, CURRENT_VERSION, HISTORY_LIMIT, EMPTY_HISTORY } from './constants';
