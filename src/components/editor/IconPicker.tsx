'use client';

import { useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { CURATED_ICONS, resolveAppIcon } from '@/components/blocks/iconMap';
import ProjectIcon from '@/components/ui/ProjectIcon';

interface Props {
  value?: string;
  appName: string;
  onChange: (next: string | undefined) => void;
}

export default function IconPicker({ value, appName, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = CURATED_ICONS.filter((id) =>
    id.includes(query.trim().toLowerCase().replace(/\s+/g, '-')),
  );

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
        className="flex w-full items-center gap-3 rounded-skin border border-[var(--border)] bg-background px-2 py-1.5 text-left transition-opacity hover:opacity-80"
      >
        <ProjectIcon icon={value} appName={appName} />
        <span className="min-w-0 flex-1 truncate text-xs opacity-60">
          {value || 'Monogram (default)'}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-60 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label={`Pick an icon for ${appName}`}
            className="absolute left-0 z-40 mt-1 w-80 max-w-[calc(100vw-2rem)] space-y-2 rounded-skin border border-[var(--border)] bg-surface p-2 shadow-lg shadow-black/20"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search icons…"
                aria-label="Search icons"
                className="w-full rounded-skin border border-[var(--border)] bg-background py-1 pl-7 pr-2 text-xs"
              />
            </div>

            <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto">
              {filtered.map((id) => {
                const Icon = resolveAppIcon(id);
                if (!Icon) return null;

                return (
                  <button
                    key={id}
                    type="button"
                    title={id}
                    aria-label={`Icon ${id}`}
                    onClick={() => {
                      onChange(id);
                      setOpen(false);
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-skin border transition-colors ${
                      value === id
                        ? 'border-accent text-accent'
                        : 'border-transparent opacity-70 hover:bg-current/10 hover:opacity-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="col-span-8 py-2 text-center text-xs opacity-50">
                  No matches
                </p>
              )}
            </div>

            <div className="space-y-1.5 border-t border-[var(--border)] pt-2">
              <input
                value={
                  value && value.startsWith('data:image') === false &&
                  (value.startsWith('/') ||
                    /^(https?:)?\/\//i.test(value))
                    ? value
                    : ''
                }
                onChange={(event) =>
                  onChange(event.target.value || undefined)
                }
                placeholder="Custom image URL (/images/…, https://…)"
                aria-label="Custom icon image URL"
                spellCheck={false}
                className="w-full rounded-skin border border-[var(--border)] bg-background px-2 py-1 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setQuery('');
                }}
                className="flex items-center gap-1 rounded-skin border border-dashed border-[var(--border)] px-2 py-1 text-xs opacity-70 transition-opacity hover:text-red-500 hover:opacity-100"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Clear — reset to monogram
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
