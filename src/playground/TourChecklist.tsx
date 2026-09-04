'use client';

import { useState } from 'react';

export interface TourChecklistItem {
  id: string;
  tabId: string;
  label: string;
}

/**
 * The playground's dare checklist — presentational + tiny logic only.
 * Completion, collapsing, and tab jumps are all props; this module owns
 * no store, no network, no storage. Collapsed-when-complete falls out of
 * a derived open state with a manual override (no effects, SSR-safe).
 */
export default function TourChecklist({
  items,
  doneIds,
  onToggle,
  onJump,
  totalLabel,
}: {
  items: TourChecklistItem[];
  doneIds: string[];
  onToggle: (id: string) => void;
  onJump: (tabId: string) => void;
  totalLabel: string;
}) {
  const done = new Set(doneIds);
  const complete = items.length > 0 && items.every((item) => done.has(item.id));
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? !complete;

  const groups: Array<{ tabId: string; items: TourChecklistItem[] }> = [];
  for (const item of items) {
    const group = groups.find((g) => g.tabId === item.tabId);
    if (group) group.items.push(item);
    else groups.push({ tabId: item.tabId, items: [item] });
  }

  return (
    <section
      aria-label="Playground tour checklist"
      className="mt-4 rounded-skin border border-[var(--border)] bg-surface"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
        <span className="font-mono text-xs opacity-80">~/tour {totalLabel}</span>
        {complete ? (
          <span className="text-xs opacity-60">
            ▌ complete — refresh resets everything
          </span>
        ) : (
          <span className="text-xs opacity-60">
            dare checklist — tick them off
          </span>
        )}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setManualOpen(!open)}
          className="ml-auto rounded-skin border border-[var(--border)] px-2 py-0.5 font-mono text-xs opacity-70 hover:opacity-100"
        >
          {open ? 'hide ▾' : 'show ▸'}
        </button>
      </div>
      {open && (
        <ul className="space-y-3 border-t border-[var(--border)] px-3 py-3">
          {groups.map((group) => (
            <li key={group.tabId}>
              <button
                type="button"
                onClick={() => onJump(group.tabId)}
                title={`Jump to ${group.tabId}`}
                className="font-mono text-[11px] opacity-60 hover:opacity-100"
              >
                → {group.tabId}
              </button>
              <ul className="mt-1 space-y-1">
                {group.items.map((item) => {
                  const checked = done.has(item.id);
                  return (
                    <li key={item.id} className="flex items-start gap-2 text-xs">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => onToggle(item.id)}
                        title={checked ? 'Mark as not done' : 'Mark as done'}
                        className="mt-0.5 font-mono opacity-80 hover:opacity-100"
                      >
                        {checked ? '[x]' : '[ ]'}
                      </button>
                      <span className={checked ? 'opacity-50 line-through' : ''}>
                        {item.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
