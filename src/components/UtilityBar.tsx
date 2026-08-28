'use client';

import { useRef, useState } from 'react';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { importPortfolioData } from '@/lib/storage';

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

export default function UtilityBar() {
  const { data, mutate, reset, undo, redo, canUndo, canRedo } =
    usePortfolioData();
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
        {/* TEMP 5b testing — dev id vs local. Remove before prod. */}
        <span className="mx-1 h-4 w-px bg-current/20" aria-hidden="true" />
        <span className="text-[10px] opacity-50">TEST</span>
        <button
          type="button"
          title="Preview KV portfolio:default without overwriting localStorage"
          onClick={async () => {
            try {
              const r = await fetch('/api/portfolio', { cache: 'no-store' });
              const doc: unknown = await r.json();
              if (!r.ok) {
                const rec = doc as unknown as Record<string, unknown>;
                throw new Error(typeof rec.error === 'string' ? rec.error : 'KV fetch failed');
              }
              const w = window.open('', '_blank');
              if (w) { w.document.write(`<pre style="white-space:pre-wrap;word-break:break-all;padding:12px;font:12px monospace">${JSON.stringify(doc, null, 2).replace(/</g, '&lt;')}</pre>`); w.document.close(); }
              else alert('KV preview fetched — check console'); console.log('KV preview', doc);
            } catch (e) { alert((e as Error).message); }
          }}
          className="rounded-skin border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[10px] font-medium"
        >
          Preview KV (dev)
        </button>
        <button
          type="button"
          title="Save localStorage portfolio-data to KV portfolio:default (temp)"
          onClick={async () => {
            try {
              const raw = localStorage.getItem('portfolio-data');
              if (!raw) throw new Error('No local data');
              const r = await fetch('/api/portfolio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: raw });
              const j: unknown = await r.json();
              if (!r.ok) {
                const rec = j as unknown as Record<string, unknown>;
                throw new Error(typeof rec.error === 'string' ? rec.error : 'Save failed');
              }
              alert('Saved to KV');
            } catch (e) { alert((e as Error).message); }
          }}
          className="rounded-skin border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium"
        >
          Save to KV
        </button>
      </div>
      {importError && (
        <p role="alert" className="w-full text-xs text-red-500">
          {importError}
        </p>
      )}
    </div>
  );
}
