'use client';

import type { PortfolioVisibility } from '@/types/schema';
import { ACTION_BTN, INPUT } from './styles';
import SegmentedControl from '@/components/ui/SegmentedControl';

type SlugStatus =
  | { kind: 'idle' }
  | { kind: 'checking'; for: string }
  | { kind: 'available'; for: string }
  | { kind: 'taken'; for: string }
  | { kind: 'reserved'; for: string }
  | { kind: 'invalid'; for: string }
  | { kind: 'error'; for: string };

interface PortfolioSettingsProps {
  settingsSlug: string;
  setSettingsSlug: (v: string) => void;
  settingsVisibility: PortfolioVisibility;
  setSettingsVisibility: (v: PortfolioVisibility) => void;
  settingsShowcase: boolean;
  setSettingsShowcase: (v: boolean) => void;
  availability: SlugStatus;
  normalizedSettingsSlug: string | null;
  trimmedSettingsSlug: string;
  canSave: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onCancel: () => void;
  setSaveError: (v: string | null) => void;
}

export default function PortfolioSettings({
  settingsSlug,
  setSettingsSlug,
  settingsVisibility,
  setSettingsVisibility,
  settingsShowcase,
  setSettingsShowcase,
  availability,
  normalizedSettingsSlug,
  trimmedSettingsSlug,
  canSave,
  saving,
  saveError,
  onSave,
  onCancel,
  setSaveError,
}: PortfolioSettingsProps) {
  return (
    <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Your link</span>
        <div className="flex items-center gap-0">
          <span className="rounded-l-skin border border-r-0 border-[var(--border)] bg-background px-3 py-2 font-mono text-sm opacity-60">
            /u/
          </span>
          <input
            type="text"
            value={settingsSlug}
            onChange={(event) => {
              setSettingsSlug(event.target.value);
              setSaveError(null);
            }}
            placeholder="jane-doe"
            autoComplete="off"
            spellCheck={false}
            className={`${INPUT} rounded-l-none font-mono`}
          />
        </div>
        <p className="mt-1.5 font-mono text-xs" aria-live="polite">
          {availability.kind === 'idle' && <span className="opacity-50">3–40 lowercase letters, numbers, hyphens.</span>}
          {availability.kind === 'checking' && <span className="opacity-50">Checking…</span>}
          {availability.kind === 'available' && (
            <span className="text-emerald-600">✓ /u/{normalizedSettingsSlug ?? trimmedSettingsSlug} is available</span>
          )}
          {availability.kind === 'taken' && (
            <span className="text-red-500">/u/{normalizedSettingsSlug ?? trimmedSettingsSlug} is already taken — try another.</span>
          )}
          {availability.kind === 'reserved' && <span className="text-red-500">That one is reserved by the site — try another.</span>}
          {availability.kind === 'invalid' && (
            <span className="text-red-500">Use 3–40 lowercase letters, numbers or hyphens (no edge hyphens).</span>
          )}
          {availability.kind === 'error' && <span className="text-red-500">Could not check availability — try again.</span>}
        </p>
      </label>

      <div>
        <span className="mb-1 block text-sm font-medium">Visibility</span>
        <SegmentedControl
          value={settingsVisibility}
          options={[
            { value: 'private', label: 'Private' },
            { value: 'public', label: 'Public' },
          ]}
          onChange={(v) => setSettingsVisibility(v as PortfolioVisibility)}
          ariaLabel="Visibility"
        />
        <p className="mt-1 text-xs opacity-50" aria-live="polite">
          {settingsVisibility === 'public'
            ? 'Public — anyone with your link can view your portfolio.'
            : 'Private — only you (while signed in) can open your link; everyone else gets a not-found page.'}
        </p>
      </div>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={settingsShowcase}
          onChange={(event) => setSettingsShowcase(event.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--accent)]"
        />
        <span className="text-sm">
          <span className="font-medium">Show my portfolio in the gallery</span>
          <span className={`mt-0.5 block text-xs ${settingsVisibility === 'public' ? 'opacity-50' : 'opacity-40'}`}>
            {settingsVisibility === 'public'
              ? 'Listed under “Other portfolios” on other dashboards.'
              : 'Needs Public visibility to have an effect.'}
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canSave}
          title={canSave ? undefined : 'Pick an available link first — or keep your current one'}
          onClick={onSave}
          className="rounded-skin border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-background disabled:pointer-events-none disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" disabled={saving} onClick={onCancel} className={ACTION_BTN}>
          Cancel
        </button>
        {saveError && (
          <p role="alert" className="text-sm text-red-500">
            {saveError}
          </p>
        )}
      </div>
    </div>
  );
}
