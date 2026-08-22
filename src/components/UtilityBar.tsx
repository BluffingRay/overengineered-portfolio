'use client';

import { useEffect, useRef, useState } from 'react';
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
  'rounded-skin border border-[var(--border)] bg-surface px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80';

export default function UtilityBar() {
  const { data, mutate, reset } = usePortfolioData();
  const [hexDraft, setHexDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeAccent = data.theme.accentColor;

  useEffect(() => {
    setHexDraft(activeAccent ?? '');
  }, [activeAccent]);

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
            className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
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
    </div>
  );
}
