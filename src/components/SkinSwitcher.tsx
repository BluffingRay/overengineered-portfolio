'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, Monitor, Sparkles, Terminal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

interface Props {
  /** Currently displayed skin (visitor override, auto, or official). */
  value: ThemeSkin | 'auto';
  /** The admin's official default — shown so visitors know what it is. */
  official: ThemeSkin;
  onChange: (skin: ThemeSkin | 'auto') => void;
}

export default function SkinSwitcher({ value, official, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Outside-click + Escape close (document listeners — a `fixed` backdrop
  // would break inside transformed ancestors, same trap as IconPicker).
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const ActiveIcon = value === 'auto' ? Monitor : SKIN_ICONS[value];
  const activeLabel = value === 'auto' ? 'Auto' : SKIN_LABELS[value];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme skin: ${activeLabel}`}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-skin border border-[var(--border)] bg-surface px-2.5 py-1 text-xs font-medium hover:opacity-80"
      >
        {ActiveIcon ? (
          <ActiveIcon className="h-4 w-4" aria-hidden="true" />
        ) : null}
        {activeLabel}
        <ChevronDown
          className={`h-3.5 w-3.5 opacity-60 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
          <div
            role="menu"
            aria-label="Theme skin options"
            className="absolute right-0 z-40 mt-1 w-44 rounded-skin border border-[var(--border)] bg-surface p-1 shadow-lg shadow-black/20"
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={value === 'auto'}
              onClick={() => {
                onChange('auto');
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-skin px-2 py-1.5 text-xs font-medium ${
                value === 'auto'
                  ? 'text-accent'
                  : 'opacity-70 hover:bg-current/10 hover:opacity-100'
              }`}
            >
              <Monitor className="h-4 w-4 shrink-0" aria-hidden="true" />
              Auto (system)
              {value === 'auto' && (
                <Check className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
            <div className="my-1 border-t border-[var(--border)]" />
            {THEME_SKINS.map((skin) => {
              const Icon = SKIN_ICONS[skin];
              const isActive = value === skin;

              return (
                <button
                  key={skin}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    onChange(skin);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-skin px-2 py-1.5 text-xs font-medium ${
                    isActive
                      ? 'text-accent'
                      : 'opacity-70 hover:bg-current/10 hover:opacity-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {SKIN_LABELS[skin]}
                  {isActive ? (
                    <Check className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
                  ) : skin === official ? (
                    <span
                      className="ml-auto text-[9px] uppercase tracking-wide opacity-40"
                      title="Set by the site owner"
                    >
                      default
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
      )}
    </div>
  );
}
