'use client';

import { useState } from 'react';
import { BookOpen, Check, ChevronDown, Sparkles, Terminal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { THEME_SKINS } from '@/types/schema';
import type { ThemeSkin } from '@/types/schema';

const SKIN_LABELS: Record<ThemeSkin, string> = {
  hud: 'HUD',
  notebook: 'Notebook',
  clean: 'Clean',
};

const SKIN_ICONS: Record<ThemeSkin, LucideIcon> = {
  hud: Terminal,
  notebook: BookOpen,
  clean: Sparkles,
};

export default function SkinSwitcher() {
  const { data, mutate } = usePortfolioData();
  const [open, setOpen] = useState(false);

  const ActiveIcon = SKIN_ICONS[data.skin];

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme skin: ${SKIN_LABELS[data.skin]}`}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-skin border border-[var(--border)] bg-surface px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80"
      >
        {ActiveIcon ? (
          <ActiveIcon className="h-4 w-4" aria-hidden="true" />
        ) : null}
        {SKIN_LABELS[data.skin]}
        <ChevronDown
          className={`h-3.5 w-3.5 opacity-60 transition-transform ${
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
            role="menu"
            aria-label="Theme skin options"
            className="absolute right-0 z-40 mt-1 w-40 rounded-skin border border-[var(--border)] bg-surface p-1 shadow-lg shadow-black/20"
          >
            {THEME_SKINS.map((skin) => {
              const Icon = SKIN_ICONS[skin];
              const isActive = data.skin === skin;

              return (
                <button
                  key={skin}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    mutate((current) => ({ ...current, skin }));
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-skin px-2 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-accent'
                      : 'opacity-70 hover:bg-current/10 hover:opacity-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {SKIN_LABELS[skin]}
                  {isActive && (
                    <Check className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
