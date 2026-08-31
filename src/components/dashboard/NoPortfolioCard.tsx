'use client';

import type { ChangeEvent, RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { CARD } from './styles';
import ImportConfirmBlock from './ImportConfirmBlock';

interface NoPortfolioCardProps {
  importing: boolean;
  importStash: { doc: unknown } | null;
  contentError: string | null;
  importInputRef: RefObject<HTMLInputElement | null>;
  onImportFilePicked: (e: ChangeEvent<HTMLInputElement>) => void;
  onImportConfirmed: () => void;
  onCancelImport: () => void;
  extractDocTitle: (doc: unknown) => string;
}

export default function NoPortfolioCard({
  importing,
  importStash,
  contentError,
  importInputRef,
  onImportFilePicked,
  onImportConfirmed,
  onCancelImport,
  extractDocTitle,
}: NoPortfolioCardProps) {
  const router = useRouter();
  return (
    <div className={`mt-3 ${CARD}`}>
      <p className="text-sm font-medium">No portfolio yet</p>
      <p className="mt-1 text-sm opacity-60">Pick a design, tell us your name, and your first blocks are generated for you — it takes about a minute.</p>
      <button type="button" onClick={() => router.push('/onboarding')} className="mt-4 rounded-skin border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-background">
        Get started
      </button>
      <button
        type="button"
        disabled={importing}
        onClick={() => importInputRef.current?.click()}
        className="mt-2 block text-sm underline underline-offset-2 opacity-60 hover:opacity-100"
      >
        Import a portfolio file instead
      </button>
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="Import a portfolio JSON file"
        onChange={onImportFilePicked}
      />
      {importStash !== null && (
        <div className="mt-3">
          <ImportConfirmBlock docTitle={extractDocTitle(importStash.doc)} busy={importing} onConfirm={onImportConfirmed} onCancel={onCancelImport} />
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
