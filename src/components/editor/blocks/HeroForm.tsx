'use client';

import { useState } from 'react';
import MediaPicker from '@/components/editor/MediaPicker';
import type {
  FeaturedHeroBlock,
  HeroLayout,
  HeroMediaFrame,
  HeroMediaRadius,
  HeroMediaRatio,
  HeroMediaSize,
  MediaSide,
  NameFit,
  StatusColor,
  Tab,
} from '@/types/schema';
import {
  HERO_LAYOUTS,
  HERO_MEDIA_FRAMES,
  HERO_MEDIA_RATIOS,
  HERO_MEDIA_RADIUS,
  HERO_MEDIA_SIZES,
  MEDIA_POSITIONS,
  MEDIA_SIDES,
  NAME_FITS,
  STATUS_COLORS,
} from '@/types/schema';
import {
  Checkbox,
  Field,
  useTrimmedCommit,
  HERO_LAYOUT_LABELS,
  INPUT,
  STATUS_COLOR_LABELS,
} from '../editor-shared';

function NameInput({
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
      placeholder="Raymar"
      className={`${INPUT} font-medium`}
    />
  );
}

function EyebrowInput({
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
      placeholder="~/raymar — portfolio"
      className={INPUT}
    />
  );
}

const RATIO_LABELS: Record<HeroMediaRatio, string> = {
  circle: 'Circle',
  square: 'Square',
  landscape: '16:10',
  portrait: '4:5',
};

const RADIUS_LABELS: Record<HeroMediaRadius, string> = {
  theme: 'Theme Skin',
  none: 'Sharp (0px)',
  sm: 'Subtle (8px)',
  lg: 'Smooth (16px)',
  full: 'Full',
  squircle: 'Squircle (iOS)',
};

const SIZE_LABELS: Record<HeroMediaSize, string> = {
  xs: 'XS',
  sm: 'S',
  md: 'M',
  lg: 'L',
};

const FRAME_LABELS: Record<HeroMediaFrame, string> = {
  none: 'None',
  subtle: 'Subtle Border',
  'accent-glow': 'Accent Glow',
  window: 'Window Frame',
};

const RATIO_PILLS = HERO_MEDIA_RATIOS.map((value) => ({
  value,
  label: RATIO_LABELS[value],
}));

const SIZE_PILLS = HERO_MEDIA_SIZES.map((value) => ({
  value,
  label: SIZE_LABELS[value],
}));

const NAME_FIT_LABELS: Record<NameFit, string> = {
  compact: 'Compact (wraps)',
  free: 'Free (one line)',
};

const NAME_FIT_PILLS = NAME_FITS.map((value) => ({
  value,
  label: NAME_FIT_LABELS[value],
}));

const PILLS =
  'flex rounded-skin border border-[var(--border)] p-0.5';
const PILL =
  'rounded-[calc(var(--radius)-0.15rem)] px-2 py-0.5 text-[10px]';

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={PILLS}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`${PILL} ${
              isActive
                ? 'bg-accent text-background'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface Props {
  block: FeaturedHeroBlock;
  tabs: Tab[];
  patch: (p: Record<string, unknown>) => void;
}

/** Matches a `#`-prefixed href against known tabs (id, id-without-`tab-`
    prefix, or label slug). Returns null for custom/external URLs. */
function resolveTab(
  tabs: Array<Pick<Tab, 'id' | 'label'>>,
  href: string,
): Pick<Tab, 'id' | 'label'> | null {
  if (!href.trim().startsWith('#')) return null;
  const raw = href.trim().toLowerCase().replace(/^#/, '');
  if (!raw) return null;

  const slug = raw.replace(/^tab-/, '');
  return (
    tabs.find((tab) => {
      const id = tab.id.toLowerCase();
      return id === raw || id.replace(/^tab-/, '') === slug;
    }) ??
    tabs.find(
      (tab) => tab.label.toLowerCase().replace(/\s+/g, '-') === slug,
    ) ??
    null
  );
}

/** Link control that offers existing tabs as one-click choices and only
    falls back to a raw URL input when "Custom URL…" is selected. */
function TabLinkPicker({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<Pick<Tab, 'id' | 'label'>>;
  value: string;
  onChange: (href: string) => void;
}) {
  const matched = resolveTab(tabs, value);

  return (
    <div className="space-y-1">
      <select
        value={matched?.id ?? 'custom'}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === 'custom' ? '' : `#${next}`);
        }}
        aria-label="Link target"
        className={INPUT}
      >
        {tabs.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {tab.label}
          </option>
        ))}
        <option value="custom">Custom URL…</option>
      </select>
      {!matched && (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/cv.pdf or https://…"
          className={`${INPUT} font-mono text-xs`}
        />
      )}
    </div>
  );
}

export default function HeroForm({ block, tabs, patch }: Props) {
  const badge = block.statusBadge;
  const [pickerOpen, setPickerOpen] = useState(false);

  function patchBadge(p: Record<string, unknown>) {
    patch({
      statusBadge: { enabled: false, text: '', ...badge, ...p },
    });
  }

  function patchSecondary(p: Record<string, unknown>) {
    patch({
      secondaryAction: { label: '', url: '', ...block.secondaryAction, ...p },
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Heading">
          <input
            value={block.heading}
            onChange={(e) => patch({ heading: e.target.value })}
            className={INPUT}
          />
        </Field>
        <Field label="Image URL">
          <div className="flex gap-1.5">
            <input
              value={block.thumbnail}
              onChange={(e) => patch({ thumbnail: e.target.value })}
              placeholder="/images/…"
              className={`${INPUT} min-w-0 flex-1 font-mono text-xs`}
            />
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="shrink-0 rounded-skin border border-[var(--border)] px-2 py-1 text-xs font-medium opacity-70 hover:opacity-100"
            >
              Library
            </button>
          </div>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Subheading">
            <textarea
              value={block.subheading}
              onChange={(e) => patch({ subheading: e.target.value })}
              rows={2}
              className={`${INPUT} resize-y leading-relaxed`}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Name (shown big; heading becomes the tagline)">
            <NameInput
              value={block.name}
              onCommit={(name) => patch({ name })}
            />
          </Field>
        </div>
        {block.name && (
          <div className="sm:col-span-2">
            <Field label="Name fit">
              <Segmented
                options={NAME_FIT_PILLS}
                value={block.nameFit ?? 'free'}
                onChange={(nameFit) => patch({ nameFit })}
                ariaLabel="Name fit mode"
              />
            </Field>
          </div>
        )}
        {block.name && (
          <div className="sm:col-span-2">
            <Field label="Roles (one per line — typewriter cycles them)">
              <textarea
                value={(block.roles ?? []).join('\n')}
                onChange={(e) => {
                  const roles = e.target.value
                    .split('\n')
                    .map((role) => role.trim())
                    .filter(Boolean);
                  patch({ roles });
                }}
                rows={3}
                placeholder={'Full-Stack Developer\nMachine Learning Trainer\nBackend Developer'}
                aria-label="Roles, one per line"
                className={`${INPUT} resize-y font-mono text-xs leading-relaxed`}
              />
            </Field>
          </div>
        )}
        <div className="sm:col-span-2">
          <Field label="Eyebrow (small kicker above heading)">
            <EyebrowInput
              value={block.eyebrow}
              onCommit={(eyebrow) => patch({ eyebrow })}
            />
          </Field>
        </div>
        <Field label="Layout">
          <select
            value={block.layout ?? 'split'}
            onChange={(e) => patch({ layout: e.target.value as HeroLayout })}
            className={INPUT}
          >
            {HERO_LAYOUTS.map((layout) => (
              <option key={layout} value={layout}>
                {HERO_LAYOUT_LABELS[layout]}
              </option>
            ))}
          </select>
        </Field>
        {(block.layout ?? 'split') === 'centered' && (
          <Field label="Image position">
            <div className="inline-flex overflow-hidden rounded-skin border border-[var(--border)]">
              {MEDIA_POSITIONS.map((position) => (
                <button
                  key={position}
                  type="button"
                  aria-pressed={(block.mediaPosition ?? 'bottom') === position}
                  onClick={() =>
                    patch({
                      mediaPosition:
                        (block.mediaPosition ?? 'bottom') === position
                          ? undefined
                          : position,
                    })
                  }
                  className={`px-2.5 py-1 text-xs font-medium capitalize ${
                    (block.mediaPosition ?? 'bottom') === position
                      ? 'bg-accent text-background'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {position}
                </button>
              ))}
            </div>
          </Field>
        )}
        {(block.layout ?? 'split') === 'split' && (
          <Field label="Image side">
            <div className="inline-flex overflow-hidden rounded-skin border border-[var(--border)]">
              {MEDIA_SIDES.map((side) => (
                <button
                  key={side}
                  type="button"
                  aria-pressed={(block.mediaSide ?? 'right') === side}
                  onClick={() =>
                    patch({
                      mediaSide:
                        (block.mediaSide ?? 'right') === side
                          ? undefined
                          : (side as MediaSide),
                    })
                  }
                  className={`px-2.5 py-1 text-xs font-medium capitalize ${
                    (block.mediaSide ?? 'right') === side
                      ? 'bg-accent text-background'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>
          </Field>
        )}
        <Field label="CTA label">
          <input
            value={block.ctaLabel}
            onChange={(e) => patch({ ctaLabel: e.target.value })}
            className={INPUT}
          />
        </Field>
        <Field label="CTA link">
          <TabLinkPicker
            tabs={tabs}
            value={block.ctaHref}
            onChange={(ctaHref) => patch({ ctaHref })}
          />
        </Field>
      </div>

      {block.thumbnail && (
        <fieldset className="rounded-skin border border-dashed border-[var(--border)] p-2">
          <legend className="px-1 text-[10px] font-medium uppercase tracking-wide opacity-50">
            Media styling
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Ratio">
              <Segmented
                ariaLabel="Media aspect ratio"
                options={RATIO_PILLS}
                value={block.mediaRatio ?? 'square'}
                onChange={(next) => patch({ mediaRatio: next })}
              />
            </Field>
            <Field label="Size">
              <Segmented
                ariaLabel="Media size"
                options={SIZE_PILLS}
                value={block.mediaSize ?? 'md'}
                onChange={(next) => patch({ mediaSize: next })}
              />
            </Field>
            <Field label="Curve">
              <select
                value={block.mediaRadius ?? 'theme'}
                disabled={block.mediaRatio === 'circle'}
                title={
                  block.mediaRatio === 'circle'
                    ? 'Circle ratio controls its own curvature'
                    : undefined
                }
                onChange={(e) =>
                  patch({
                    mediaRadius:
                      (e.target.value || undefined) as HeroMediaRadius | undefined,
                  })
                }
                className={`${INPUT} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {HERO_MEDIA_RADIUS.map((radius) => (
                  <option key={radius} value={radius}>
                    {RADIUS_LABELS[radius]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Frame">
              <select
                value={block.mediaFrame ?? 'subtle'}
                onChange={(e) =>
                  patch({
                    mediaFrame:
                      (e.target.value || undefined) as HeroMediaFrame | undefined,
                  })
                }
                className={INPUT}
              >
                {HERO_MEDIA_FRAMES.map((frame) => (
                  <option key={frame} value={frame}>
                    {FRAME_LABELS[frame]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="mt-1.5 text-[10px] opacity-50">
            Applies to Centered &amp; Split layouts; Banner keeps its full-bleed
            backdrop.
          </p>
        </fieldset>
      )}

      <fieldset className="rounded-skin border border-dashed border-[var(--border)] p-2">
        <legend className="px-1 text-[10px] font-medium uppercase tracking-wide opacity-50">
          Status badge
        </legend>
        <Checkbox
          label="Show status badge"
          checked={badge?.enabled === true}
          onChange={(next) => patchBadge({ enabled: next })}
        />
        {badge?.enabled && (
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            <Field label="Text">
              <input
                value={badge.text}
                onChange={(e) => patchBadge({ text: e.target.value })}
                placeholder="Available for work"
                className={INPUT}
              />
            </Field>
            <Field label="Color">
              <select
                value={badge.color ?? 'green'}
                onChange={(e) =>
                  patchBadge({ color: e.target.value as StatusColor })
                }
                className={INPUT}
              >
                {STATUS_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {STATUS_COLOR_LABELS[color]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </fieldset>

      <fieldset className="rounded-skin border border-dashed border-[var(--border)] p-2">
        <legend className="px-1 text-[10px] font-medium uppercase tracking-wide opacity-50">
          Secondary button
        </legend>
        <Checkbox
          label="Show secondary button"
          checked={block.secondaryAction !== undefined}
          onChange={(next) =>
            patch({
              secondaryAction: next
                ? { label: block.secondaryAction?.label ?? '', url: block.secondaryAction?.url ?? '' }
                : undefined,
            })
          }
        />
        {block.secondaryAction && (
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            <Field label="Label">
              <input
                value={block.secondaryAction.label}
                onChange={(e) => patchSecondary({ label: e.target.value })}
                className={INPUT}
              />
            </Field>
            <Field label="Link">
              <TabLinkPicker
                tabs={tabs}
                value={block.secondaryAction.url}
                onChange={(url) =>
                  patchSecondary({
                    url,
                    // Tab links are internal by definition — never new-tab.
                    ...(url.startsWith('#') ? { target: '_self' } : {}),
                  })
                }
              />
            </Field>
            {!block.secondaryAction.url.startsWith('#') && (
              <Field label="Opens in">
                <select
                  value={block.secondaryAction.target ?? '_self'}
                  onChange={(e) =>
                    patchSecondary({
                      target: (e.target.value || undefined) as
                        | '_blank'
                        | '_self'
                        | undefined,
                    })
                  }
                  className={INPUT}
                >
                  <option value="_self">Same tab</option>
                  <option value="_blank">New tab</option>
                </select>
              </Field>
            )}
          </div>
        )}
      </fieldset>

      <Checkbox
        label="Show social links row (uses global socials)"
        checked={block.showSocials === true}
        onChange={(next) => patch({ showSocials: next || undefined })}
      />

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => patch({ thumbnail: url })}
      />
    </div>
  );
}
