'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { importPortfolioData } from '@/lib/storage';
import { useHostedDoc } from '@/hooks/useHostedDoc';

const PRESETS = [
  { hex: '#22d3ee', name: 'Cyan' },
  { hex: '#2563eb', name: 'Blue' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#b45309', name: 'Amber' },
  { hex: '#f43f5e', name: 'Rose' },
];

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const BTN =
  'rounded-skin border border-[var(--border)] bg-surface px-2.5 py-1 text-xs font-medium hover:opacity-80';

/** "Saved 2m ago" style relative time for the save pill. */
function savedAgoLabel(savedAt: number | null): string | null {
  if (savedAt === null) return null;
  const diff = Date.now() - savedAt;
  if (diff < 15_000) return 'just now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function UtilityBar({
  hosted = false,
  authenticated = false,
}: {
  hosted?: boolean;
  authenticated?: boolean;
}) {
  const { data, mutate, reset, undo, redo, canUndo, canRedo } =
    usePortfolioData();
  // FIX-C — hosted save layer; inert (no UI) when not hosted.
  const hostedDoc = useHostedDoc(hosted, authenticated);
  const [hexDraft, setHexDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeAccent = data.theme.accentColor;

  // Render-phase adjustment (React's "you might not need an effect"
  // pattern): follow external accent changes — preset clicks, undo,
  // import — without syncing through an effect.
  const [syncedAccent, setSyncedAccent] = useState(activeAccent);
  if (syncedAccent !== activeAccent) {
    setSyncedAccent(activeAccent);
    setHexDraft(activeAccent ?? '');
  }

  function commitAccent(value: string | undefined) {
    mutate((current) => ({
      ...current,
      theme: { ...current.theme, accentColor: value },
    }));
  }

  function handleHexChange(raw: string) {
    setHexDraft(raw);
    if (HEX_PATTERN.test(raw)) commitAccent(raw);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'portfolio-data.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyJson() {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleImportFile(file: File) {
    setImportError(null);

    const doc = importPortfolioData(await file.text());

    if (!doc) {
      setImportError('Import failed: not a valid version-1 portfolio document.');
      return;
    }
    if (
      !window.confirm(
        'Replace the current portfolio with the imported document?',
      )
    ) {
      return;
    }

    mutate(() => doc);
    setImported(true);
    setTimeout(() => setImported(false), 1500);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="group"
        aria-label="Accent color"
        className="flex items-center gap-1"
      >
        <button
          type="button"
          title="Skin default accent"
          aria-label="Skin default accent"
          aria-pressed={!activeAccent}
          onClick={() => commitAccent(undefined)}
          className={`h-5 w-5 rounded-full border border-current/40 text-[9px] font-semibold ${
            !activeAccent ? 'ring-2 ring-current ring-offset-1' : ''
          }`}
        >
          A
        </button>
        {PRESETS.map((preset) => (
          <button
            key={preset.hex}
            type="button"
            aria-label={`Accent ${preset.name}`}
            aria-pressed={activeAccent === preset.hex}
            onClick={() => commitAccent(preset.hex)}
            style={{ backgroundColor: preset.hex }}
            className={`h-5 w-5 rounded-full hover:scale-110 ${
              activeAccent === preset.hex
                ? 'ring-2 ring-current ring-offset-1'
                : ''
            }`}
          />
        ))}
        <input
          type="text"
          value={hexDraft}
          onChange={(event) => handleHexChange(event.target.value)}
          placeholder="#22d3ee"
          aria-label="Custom accent color hex"
          maxLength={7}
          spellCheck={false}
          className={`w-20 rounded-skin border bg-surface px-2 py-1 text-xs ${
            hexDraft && !HEX_PATTERN.test(hexDraft)
              ? 'border-red-500'
              : 'border-[var(--border)]'
          }`}
        />
      </div>

      {/* 5e-e — FIX-C landmine defusal: the mount-time seed proved this
          draft is unverified (no prior snapshot + draft ≠ hosted doc).
          OFFER, don't auto-load: Load replaces the draft with the hosted
          doc; Keep is an explicit last-save-wins. Session-only; Save
          stays available underneath. */}
      {hosted && hostedDoc.loadOffer.active && (
        <div className="w-full rounded-skin border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            This draft isn&apos;t from the cloud
          </p>
          <p className="mt-0.5 text-[11px] opacity-70">
            Loading replaces this draft with your saved portfolio.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void hostedDoc.loadOffer.load()}
              disabled={hostedDoc.loadOffer.loading}
              className="rounded-skin bg-accent px-3 py-1.5 text-xs font-semibold text-background hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
            >
              {hostedDoc.loadOffer.loading ? 'Loading…' : 'Load your portfolio'}
            </button>
            <button
              type="button"
              onClick={hostedDoc.loadOffer.dismiss}
              disabled={hostedDoc.loadOffer.loading}
              className={BTN}
            >
              Keep this draft
            </button>
          </div>
          {hostedDoc.loadOffer.error && (
            <p role="alert" className="mt-2 text-[11px] font-medium text-red-500">
              {hostedDoc.loadOffer.error}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Undo"
          title="Undo (Ctrl/Cmd+Z)"
          disabled={!canUndo}
          onClick={undo}
          className={`${BTN} disabled:pointer-events-none disabled:opacity-30`}
        >
          ↩
        </button>
        <button
          type="button"
          aria-label="Redo"
          title="Redo (Ctrl/Cmd+Shift+Z)"
          disabled={!canRedo}
          onClick={redo}
          className={`${BTN} disabled:pointer-events-none disabled:opacity-30`}
        >
          ↪
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          aria-hidden="true"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImportFile(file);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={BTN}
        >
          {imported ? 'Imported!' : 'Import'}
        </button>
        <button type="button" onClick={exportJson} className={BTN}>
          Export
        </button>
        <button type="button" onClick={copyJson} className={BTN}>
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reset portfolio to defaults? Saved changes will be discarded.'))
              reset();
          }}
          className={`${BTN} hover:!text-red-500`}
        >
          Reset
        </button>
      </div>
      {importError && (
        <p role="alert" className="w-full text-xs text-red-500">
          {importError}
        </p>
      )}

      {/* 6-f — hosted save status + Dashboard live in a FIXED bottom-right
          cluster instead of the toolbar row: the status text changes
          width on every dirty<->clean flip, and inline placement shoved
          the accent picker / Edit button around. Fixed = the toolbar
          never reflows. The transient load-offer banner moved here too
          (it is wide and self-removing; up top it shoved everything). */}
      {hosted && (
        <div className="fixed bottom-3 right-3 z-50 flex max-w-[min(92vw,26rem)] flex-col items-end gap-1.5">
          {hostedDoc.loadOffer.active && (
            <div className="rounded-skin border border-amber-500/50 bg-amber-500/10 p-2.5 shadow-lg">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                This draft isn&apos;t from the cloud
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void hostedDoc.loadOffer.load()}
                  disabled={hostedDoc.loadOffer.loading}
                  className="rounded-skin bg-accent px-2.5 py-1 text-xs font-semibold text-background hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
                >
                  {hostedDoc.loadOffer.loading ? 'Loading…' : 'Load your portfolio'}
                </button>
                <button
                  type="button"
                  onClick={hostedDoc.loadOffer.dismiss}
                  disabled={hostedDoc.loadOffer.loading}
                  className={BTN}
                >
                  Keep this draft
                </button>
              </div>
              {hostedDoc.loadOffer.error && (
                <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-500">
                  {hostedDoc.loadOffer.error}
                </p>
              )}
            </div>
          )}
          {!hostedDoc.loadOffer.active && (
            <div
              className="flex items-center gap-2 rounded-skin border border-current/15 bg-background/95 px-2.5 py-1.5 shadow-lg backdrop-blur"
              role="status"
              aria-live="polite"
            >
              {hostedDoc.dirty ? (
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  ● Not saved
                </span>
              ) : hostedDoc.state.status === 'error' ? (
                <span className="text-[11px] font-medium text-red-500">
                  {hostedDoc.state.message}
                </span>
              ) : (
                <span className="text-[11px] opacity-50">
                  Saved {savedAgoLabel(hostedDoc.savedAt) ?? '—'}
                </span>
              )}
              <button
                type="button"
                onClick={() => void hostedDoc.save()}
                disabled={!hostedDoc.dirty || hostedDoc.state.status === 'saving'}
                title={
                  hostedDoc.dirty
                    ? 'Save to your hosted portfolio'
                    : 'No changes to save'
                }
                className="rounded-skin border border-accent/60 bg-background px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent hover:text-background disabled:pointer-events-none disabled:opacity-40"
              >
                {hostedDoc.state.status === 'saving' ? 'Saving…' : 'Save'}
              </button>
              {authenticated && (
                <Link href="/dashboard" className={BTN}>
                  Dashboard
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
