import type { PortfolioData } from '@/types/schema';
import seed from '../../content/portfolio.json';

/**
 * The default/seed document shown when the visitor's localStorage is empty
 * (new visitor, cleared data, or a corrupt document that falls back).
 *
 * This now lives in the committed JSON file `content/portfolio.json` — the
 * single place an owner edits to publish Product B content. The workflow is
 * "edit `content/portfolio.json` (plus assets in `public/`), `git push`,
 * redeploy": the build imports this file and bakes it into the client bundle.
 * It must always be a valid `PortfolioData` (version 3 + `prepareDocument`
 * shape), which the storage layer enforces via `isPortfolioData`.
 */
export const initialData: PortfolioData = seed as PortfolioData;
