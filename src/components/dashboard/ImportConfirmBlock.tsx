'use client';

const ACTION_BTN =
  'rounded-skin border border-[var(--border)] bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-background disabled:pointer-events-none disabled:opacity-40';

export default function ImportConfirmBlock(props: {
  docTitle: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3 rounded-skin border border-[var(--border)] bg-background p-4">
      <p className="text-sm">
        Replace your current portfolio with the one in this file? This
        overwrites everything saved to your account.
      </p>
      <p className="font-mono text-xs opacity-60">Found in file: “{props.docTitle}”</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={props.busy}
          onClick={props.onConfirm}
          className="rounded-skin border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-background disabled:pointer-events-none disabled:opacity-40"
        >
          {props.busy ? 'Importing…' : 'Import'}
        </button>
        <button
          type="button"
          disabled={props.busy}
          onClick={props.onCancel}
          className={ACTION_BTN}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
