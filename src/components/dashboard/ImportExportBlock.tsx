'use client';

import type { ChangeEvent, RefObject } from 'react';
import { ACTION_BTN } from './styles';
import ImportConfirmBlock from './ImportConfirmBlock';

interface ImportExportBlockProps {
  exporting: boolean;
  importing: boolean;
  importStash: { doc: unknown } | null;
  contentError: string | null;
  importInputRef: RefObject<HTMLInputElement | null>;
  onExport: () => void;
  onImportFilePicked: (e: ChangeEvent<HTMLInputElement>) => void;
  onImportConfirmed: () => void;
  onCancelImport: () => void;
  extractDocTitle: (doc: unknown) => string;
}

export default function ImportExportBlock({
  exporting,
  importing,
  importStash,
  contentError,
  importInputRef,
  onExport,
  onImportFilePicked,
  onImportConfirmed,
  onCancelImport,
  extractDocTitle,
}: ImportExportBlockProps) {
  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <span className="mb-1 block text-sm font-medium">Content</span>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={exporting} onClick={onExport} className={ACTION_BTN}>
          {exporting ? 'Exporting…' : 'Export JSON'}
        </button>
        <button
          type="button"
          disabled={importing}
          onClick={() => importInputRef.current?.click()}
          className={ACTION_BTN}
        >
          Import from file…
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Import a portfolio JSON file"
          onChange={onImportFilePicked}
        />
      </div>
      {importStash !== null && (
        <div className="mt-3">
          <ImportConfirmBlock
            docTitle={extractDocTitle(importStash.doc)}
            busy={importing}
            onConfirm={onImportConfirmed}
            onCancel={onCancelImport}
          />
        </div>
      )}
      {contentError !== null && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {contentError}
        </p>
      )}
    </div>
  );
}
