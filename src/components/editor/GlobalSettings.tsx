'use client';

import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SocialLink, SocialPlatform, ThemeConfig } from '@/types/schema';
import { SOCIAL_PLATFORMS, THEME_SKINS } from '@/types/schema';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import SocialIcon from '@/components/ui/SocialIcon';
import { Checkbox, DRAG_HANDLE, Field, INPUT, PLATFORM_LABELS, ROW_BTN, useTrimmedCommit } from './editor-shared';
import IconPicker from './IconPicker';

function SortableSocialRow({
  link,
  isOpen,
  onToggle,
  onPatch,
  onRemove,
}: {
  link: SocialLink;
  isOpen: boolean;
  onToggle: () => void;
  onPatch: (p: Partial<SocialLink>) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-skin border border-dashed border-[var(--border)] ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 p-1.5">
        <button
          type="button"
          aria-label={`Drag to reorder ${link.label ?? link.platform}`}
          className={DRAG_HANDLE}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <span className="opacity-50">{isOpen ? '▾' : '▸'}</span>
          <span className="h-5 w-5 shrink-0 p-0.5 opacity-70">
            <SocialIcon link={link} />
          </span>
          <span className="truncate text-sm font-medium capitalize">
            {link.label || PLATFORM_LABELS[link.platform]}
          </span>
        </button>
        <button
          type="button"
          aria-label={`Remove ${link.label ?? link.platform} link`}
          className={`${ROW_BTN} hover:!text-red-500`}
          onClick={onRemove}
        >
          ✕
        </button>
      </div>

      {isOpen && (
        <div className="space-y-2 border-t border-[var(--border)] p-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Platform">
              <select
                value={link.platform}
                onChange={(e) =>
                  onPatch({ platform: e.target.value as SocialPlatform })
                }
                className={INPUT}
              >
                {SOCIAL_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {PLATFORM_LABELS[platform]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Label (optional)">
              <input
                value={link.label ?? ''}
                onChange={(e) => onPatch({ label: e.target.value || undefined })}
                placeholder="GitHub profile"
                className={INPUT}
              />
            </Field>
          </div>
          <Field label="URL">
            <input
              value={link.url}
              onChange={(e) => onPatch({ url: e.target.value })}
              placeholder="https://… or mailto:you@example.com"
              className={`${INPUT} font-mono text-xs`}
            />
          </Field>
          <Field label="Custom icon (optional)">
            <IconPicker
              value={link.customIcon}
              appName={link.label || PLATFORM_LABELS[link.platform]}
              onChange={(next) => onPatch({ customIcon: next })}
            />
          </Field>
        </div>
      )}
    </li>
  );
}

function FontInput({
  value,
  onCommit,
}: {
  value?: string;
  onCommit: (next: string | undefined) => void;
}) {
  const { draft, onChange, onBlur } = useTrimmedCommit(value, onCommit);
  return (
    <input
      value={draft}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder="e.g. var(--font-geist-sans), system-ui, sans-serif"
      className={INPUT}
    />
  );
}

export default function GlobalSettings() {
  const { data, mutate } = usePortfolioData();
  const [openLinkId, setOpenLinkId] = useState<string | null>(null);

  const socials = data.socials ?? [];
  const footer = data.footer;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function patchSocials(recipe: (socials: SocialLink[]) => SocialLink[]) {
    mutate((current) => ({ ...current, socials: recipe(current.socials ?? []) }));
  }

  function patchFooter(p: Partial<NonNullable<typeof footer>>) {
    mutate((current) => ({
      ...current,
      footer: { enabled: false, ...current.footer, ...p },
    }));
  }

  function patchTheme(p: Partial<ThemeConfig>) {
    mutate((current) => ({ ...current, theme: { ...current.theme, ...p } }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    patchSocials((list) => {
      const from = list.findIndex((link) => link.id === active.id);
      const to = list.findIndex((link) => link.id === over.id);
      if (from === -1 || to === -1) return list;
      return arrayMove(list, from, to);
    });
  }

  const FONT_PRESETS: Array<{ label: string; value: string }> = [
    {
      label: 'Mono',
      value: 'var(--font-geist-mono), ui-monospace, monospace',
    },
    {
      label: 'Sans',
      value: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
    },
    {
      label: 'Serif',
      value: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
    },
    { label: 'System', value: 'system-ui, sans-serif' },
  ];

  return (
    <section aria-label="Site settings" className="space-y-3">
      <div>
        <Field label="Default skin (what every visitor sees first)">
          <div className="flex flex-wrap gap-1">
            {THEME_SKINS.map((skin) => {
              const isOfficial = data.skin === skin;

              return (
                <button
                  key={skin}
                  type="button"
                  aria-pressed={isOfficial}
                  onClick={() =>
                    mutate((current) => ({ ...current, skin }))
                  }
                  className={`rounded-skin border px-2 py-0.5 text-xs ${
                    isOfficial
                      ? 'border-accent bg-accent text-background'
                      : 'border-[var(--border)] opacity-60 hover:opacity-100'
                  }`}
                >
                  {skin.toUpperCase()}
                </button>
              );
            })}
          </div>
        </Field>
        <p className="mt-1 text-[10px] opacity-50">
          Visitors can temporarily switch themes (like dark mode) — this one
          loads for everyone and survives reloads.
        </p>
      </div>
      <div>
        <Field label="Global font (blank = skin default)">
          <FontInput
            value={data.theme.fontFamily}
            onCommit={(fontFamily) => patchTheme({ fontFamily })}
          />
        </Field>
        <div className="mt-1 flex flex-wrap gap-1">
          {FONT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-pressed={data.theme.fontFamily === preset.value}
              onClick={() =>
                patchTheme({
                  fontFamily:
                    data.theme.fontFamily === preset.value
                      ? undefined
                      : preset.value,
                })
              }
              className={`rounded-skin border px-2 py-0.5 text-xs ${
                data.theme.fontFamily === preset.value
                  ? 'border-accent bg-accent text-background'
                  : 'border-[var(--border)] opacity-60 hover:opacity-100'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={socials.map((link) => link.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="mt-1.5 space-y-1.5">
                {socials.map((link) => (
                  <SortableSocialRow
                    key={link.id}
                    link={link}
                    isOpen={openLinkId === link.id}
                    onToggle={() =>
                      setOpenLinkId(openLinkId === link.id ? null : link.id)
                    }
                    onPatch={(p) =>
                      patchSocials((list) =>
                        list.map((candidate) =>
                          candidate.id === link.id
                            ? { ...candidate, ...p }
                            : candidate,
                        ),
                      )
                    }
                    onRemove={() =>
                      patchSocials((list) =>
                        list.filter((candidate) => candidate.id !== link.id),
                      )
                    }
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={() => {
              patchSocials((list) => [
                ...list,
                { id: crypto.randomUUID(), platform: 'custom', url: '' },
              ]);
              setOpenLinkId(null);
            }}
            className="mt-1.5 rounded-skin border border-dashed border-[var(--border)] px-2.5 py-1 text-xs opacity-70 hover:border-accent hover:text-accent hover:opacity-100"
          >
            + Add social link
          </button>

          <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-2">
            <Checkbox
              label="Show site footer"
              checked={footer?.enabled === true}
              onChange={(next) => patchFooter({ enabled: next })}
            />
            {footer?.enabled && (
              <>
                <Field label="Footer text ({year} placeholder supported)">
                  <input
                    value={footer.copyrightText ?? ''}
                    onChange={(e) =>
                      patchFooter({ copyrightText: e.target.value || undefined })
                    }
                    placeholder="© {year} Raymar. Built by hand."
                    className={INPUT}
                  />
                </Field>
                <Checkbox
                  label="Show social icons in footer"
                  checked={footer.showSocials === true}
                  onChange={(next) => patchFooter({ showSocials: next })}
                />
              </>
            )}
          </div>
    </section>
  );
}
