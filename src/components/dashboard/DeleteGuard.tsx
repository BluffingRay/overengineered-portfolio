'use client';

import { ACTION_BTN, INPUT } from './styles';

interface DeleteGuardProps {
  deleteOpen: boolean;
  deleteConfirm: string;
  deleting: boolean;
  deleteError: string | null;
  setDeleteOpen: (v: boolean) => void;
  setDeleteConfirm: (v: string) => void;
  setDeleteError: (v: string | null) => void;
  onDelete: () => void;
}

export default function DeleteGuard({
  deleteOpen,
  deleteConfirm,
  deleting,
  deleteError,
  setDeleteOpen,
  setDeleteConfirm,
  setDeleteError,
  onDelete,
}: DeleteGuardProps) {
  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      {!deleteOpen ? (
        <button
          type="button"
          onClick={() => {
            setDeleteOpen(true);
            setDeleteError(null);
          }}
          className="rounded-skin border border-red-500/40 bg-background px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-500/10"
        >
          Delete portfolio
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-red-500">
            This permanently deletes your portfolio, its link, and its uploaded files. This cannot be undone.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={deleteConfirm}
              onChange={(event) => {
                setDeleteConfirm(event.target.value);
                setDeleteError(null);
              }}
              placeholder="Type DELETE to confirm"
              aria-label="Type DELETE to confirm deletion"
              autoComplete="off"
              spellCheck={false}
              disabled={deleting}
              className={`${INPUT} max-w-56 font-mono`}
            />
            <button
              type="button"
              disabled={deleting || deleteConfirm !== 'DELETE'}
              onClick={onDelete}
              className="rounded-skin border border-red-500/60 bg-red-500 px-3 py-1.5 text-sm font-medium text-white disabled:pointer-events-none disabled:opacity-40"
            >
              {deleting ? 'Deleting…' : 'Delete forever'}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirm('');
                setDeleteError(null);
              }}
              className={ACTION_BTN}
            >
              Cancel
            </button>
          </div>
          {deleteError && (
            <p role="alert" className="text-sm text-red-500">
              {deleteError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
