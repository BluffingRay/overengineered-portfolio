'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ZoomIn } from 'lucide-react';
import { VIEW_SCALE_MAX, VIEW_SCALE_MIN, clampViewScale } from '@/types/schema';

/**
 * Visitor view-scale control — a SkinSwitcher-style dropdown whose panel
 * holds a slider (80–120%). Picks persist under their own localStorage key
 * (like the skin override) and never touch the document or undo history.
 * PC-only: the control hides below `md`, and the applied value is gated on
 * the same media query by the owner (PortfolioView), so phones always
 * render at the admin's default.
 */
interface Props {
  /** The picked scale (visitor override, or the admin's default). */
  value: number;
  /** The admin's official default — shown so visitors know what it is. */
  official: number;
  /** True when the visitor has a local override (enables the reset row). */
  overridden: boolean;
  /** null = reset to the admin's default. */
  onChange: (next: number | null) => void;
}

export default function ViewScaleControl({
  value,
  official,
  overridden,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Outside-click + Escape close (same house pattern as SkinSwitcher).
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

  const isDefault = !overridden || value === official;

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`View scale: ${Math.round(value * 100)}%`}
        onClick={() => setOpen((open) => !open)}
        className="flex items-center gap-2 rounded-skin border border-[var(--border)] bg-surface px-2.5 py-1 text-xs font-medium hover:opacity-80"
      >
        <ZoomIn className="h-4 w-4" aria-hidden="true" />
        {Math.round(value * 100)}%
        <ChevronDown
          className={`h-3.5 w-3.5 opacity-60 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          aria-label="View scale"
          className="absolute right-0 z-40 mt-1 w-52 rounded-skin border border-[var(--border)] bg-surface p-2.5 shadow-lg shadow-black/20"
        >
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
            <span>View scale</span>
            <span className="font-mono opacity-70">
              {Math.round(value * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={VIEW_SCALE_MIN * 100}
            max={VIEW_SCALE_MAX * 100}
            step={5}
            value={Math.round(clampViewScale(value) * 100)}
            onChange={(event) => onChange(Number(event.target.value) / 100)}
            className="w-full accent-accent"
            aria-label="View scale percentage"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] opacity-50">
            <span>Small</span>
            <span>
              Default {Math.round(official * 100)}%
              {isDefault ? ' ✓' : ''}
            </span>
            <span>Large</span>
          </div>
          {overridden && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-1.5 w-full rounded-skin px-2 py-1 text-left text-xs opacity-60 hover:text-accent hover:opacity-100"
            >
              ↺ Reset to default
            </button>
          )}
        </div>
      )}
    </div>
  );
}
