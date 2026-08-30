import { useEffect, useRef, useState } from 'react';
import { SPACINGS } from '@/types/schema';
import type {
  AppCardItem,
  Block,
  BlockType,
  BlockSpacing,
  BlockWidth,
  BlockDesign,
  EntryListPreset,
  MarqueeSpeed,
  HeroLayout,
  ImageAlignment,
  PrimaryAction,
  SocialLink,
  SocialPlatform,
  StatusColor,
} from '@/types/schema';
import type { LucideIcon } from 'lucide-react';
import { Briefcase, KanbanSquare, CodeXml, Star, Type, MoveHorizontal, Newspaper } from 'lucide-react';

export const BLOCK_ICONS: Record<BlockType, LucideIcon> = {
  featured_hero: Star,
  app_grid: KanbanSquare,
  rich_text: Type,
  custom_html: CodeXml,
  marquee: MoveHorizontal,
  blog: Newspaper,
  entry_list: Briefcase,
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  featured_hero: 'Featured Hero',
  app_grid: 'App Grid',
  rich_text: 'Rich Text',
  custom_html: 'Custom HTML',
  marquee: 'Marquee',
  blog: 'Blog',
  entry_list: 'Entry List',
};

export const ENTRY_LIST_PRESET_LABELS: Record<EntryListPreset, string> = {
  experience: 'Experience',
  education: 'Education',
  certifications: 'Certifications',
};

export interface EntryListFieldLabels {
  title: string;
  subtitle: string;
  meta: string;
  description: string;
}

/**
 * Per-preset field labels for the entry-list form — cosmetic only; the
 * schema (and the renderer) never reads the preset.
 */
export const ENTRY_LIST_FIELD_LABELS: Record<EntryListPreset, EntryListFieldLabels> = {
  experience: {
    title: 'Job title',
    subtitle: 'Company',
    meta: 'Period',
    description: 'What you did',
  },
  education: {
    title: 'Degree',
    subtitle: 'School',
    meta: 'Years',
    description: 'Highlights',
  },
  certifications: {
    title: 'Certificate',
    subtitle: 'Issuer',
    meta: 'Issued',
    description: 'Details',
  },
};

export const SPEED_LABELS: Record<MarqueeSpeed, string> = {
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast',
};

export const ALIGNMENT_LABELS: Record<ImageAlignment, string> = {
  left: 'Left',
  right: 'Right',
  top: 'Top',
  backdrop: 'Backdrop',
};

export const ACTION_LABELS: Record<PrimaryAction, string> = {
  demo: 'Demo',
  github: 'GitHub',
  href: 'Page link',
};

export const HERO_LAYOUT_LABELS: Record<HeroLayout, string> = {
  centered: 'Centered',
  split: 'Split (side selectable)',
  banner: 'Banner (image backdrop)',
};

export const STATUS_COLOR_LABELS: Record<StatusColor, string> = {
  green: 'Green',
  blue: 'Blue',
  amber: 'Amber',
  purple: 'Purple',
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
  email: 'Email',
  discord: 'Discord',
  custom: 'Custom',
};

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-xs opacity-80 transition-opacity hover:opacity-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}

export const SPACING_LABELS: Record<BlockSpacing, string> = {
  none: 'None',
  compact: 'Compact',
  normal: 'Normal',
  spacious: 'Spacious',
};

export const SPACING_GLYPHS: Record<BlockSpacing, string> = {
  none: '·',
  compact: '▁',
  normal: '▄',
  spacious: '█',
};

export const WIDTH_LABELS: Record<BlockWidth, string> = {
  narrow: 'Narrow',
  wide: 'Wide',
  full: 'Full',
};

const WIDTH_OPTIONS = Object.keys(WIDTH_LABELS) as BlockWidth[];

export const DESIGN_LABELS: Record<BlockDesign, string> = {
  default: 'Default',
  cutie: 'Cutie',
  editorial: 'Editorial',
  riso: 'Riso',
};

const DESIGN_OPTIONS = Object.keys(DESIGN_LABELS) as BlockDesign[];

/**
 * Per-block art direction. `default` (the original rendering) is stored
 * as absent — same "default = undefined" convention as width/variant.
 */
export function BlockDesignPicker({
  value,
  onChange,
}: {
  value?: BlockDesign;
  onChange: (next: BlockDesign | undefined) => void;
}) {
  const active = value ?? 'default';
  return (
    <div
      role="group"
      aria-label="Art direction"
      className="inline-flex overflow-hidden rounded-skin border border-[var(--border)]"
    >
      {DESIGN_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={active === option}
          onClick={() => onChange(option === 'default' ? undefined : option)}
          className={`px-2 py-1 text-xs font-medium ${
            active === option
              ? 'bg-accent text-background'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          {DESIGN_LABELS[option]}
        </button>
      ))}
    </div>
  );
}

export function BlockWidthPicker({
  value,
  onChange,
}: {
  value?: BlockWidth;
  onChange: (next: BlockWidth | undefined) => void;
}) {
  const active = value ?? 'narrow';
  return (
    <div
      role="group"
      aria-label="Content width"
      className="inline-flex overflow-hidden rounded-skin border border-[var(--border)]"
    >
      {WIDTH_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={active === option}
          onClick={() => onChange(option === 'narrow' ? undefined : option)}
          className={`px-2 py-1 text-xs font-medium ${
            active === option
              ? 'bg-accent text-background'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          {WIDTH_LABELS[option]}
        </button>
      ))}
    </div>
  );
}

export function nextSpacing(current: BlockSpacing): BlockSpacing {
  return SPACINGS[(SPACINGS.indexOf(current) + 1) % SPACINGS.length];
}

/**
 * Draft buffer for text fields that get *normalized* on commit (trimmed,
 * cleared when whitespace-only). Typing stays free — spaces survive — and
 * normalization happens on blur only, per the echo-guard convention.
 */
export function useTrimmedCommit(
  value: string | undefined,
  onCommit: (next: string | undefined) => void,
) {
  const [draft, setDraft] = useState(value ?? '');
  const echoRef = useRef<string | null>(null);

  useEffect(() => {
    const external = value ?? '';
    if (external !== echoRef.current) setDraft(external);
  }, [value]);

  return {
    draft,
    onChange(raw: string) {
      setDraft(raw);
      // Commit raw while typing so spaces stick; empty means "remove field".
      echoRef.current = raw;
      onCommit(raw === '' ? undefined : raw);
    },
    onBlur() {
      const trimmed = draft.trim();
      setDraft(trimmed);
      echoRef.current = trimmed;
      onCommit(trimmed === '' ? undefined : trimmed);
    },
  };
}

export const INPUT =
  'w-full rounded-skin border border-[var(--border)] bg-background px-2 py-1 text-sm';

export const ROW_BTN =
  'flex h-6 w-6 items-center justify-center rounded-skin border border-[var(--border)] text-xs opacity-60 hover:opacity-100 disabled:pointer-events-none disabled:opacity-20';

export const DRAG_HANDLE =
  'flex h-6 w-5 cursor-grab touch-none select-none items-center justify-center text-sm opacity-40 hover:opacity-100 active:cursor-grabbing';

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-medium opacity-70">
        {label}
      </span>
      {children}
    </label>
  );
}

export function createDefaultBlock(type: BlockType): Block {
  const id = crypto.randomUUID();

  switch (type) {
    case 'featured_hero':
      return {
        id,
        type,
        heading: 'New hero heading',
        subheading: 'A short supporting line.',
        ctaLabel: 'Open',
        ctaHref: '#',
        thumbnail: '',
      };
    case 'app_grid':
      return { id, type, title: 'New grid', apps: [] };
    case 'rich_text':
      return { id, type, content: '<p>Write something…</p>' };
    case 'custom_html':
      return { id, type, html: '<div>New HTML block</div>' };
    case 'marquee':
      return {
        id,
        type,
        items: ['Skill one', 'Skill two', 'Skill three'],
        speed: 'normal',
      };
    case 'blog':
      return { id, type, title: 'From the blog' };
    case 'entry_list':
      return {
        id,
        type,
        title: 'Experience',
        preset: 'experience',
        entries: [
          {
            id: crypto.randomUUID(),
            title: 'Role or degree',
            subtitle: 'Company or school',
            meta: '2024 — Now',
            description: 'What you did there.',
          },
        ],
      };
  }
}

export function createDefaultApp(): AppCardItem {
  return {
    id: crypto.randomUUID(),
    name: 'New app',
    description: '',
    href: '#',
  };
}

export function duplicateApp(app: AppCardItem): AppCardItem {
  return {
    ...structuredClone(app),
    id: crypto.randomUUID(),
  };
}

export function createDefaultSocial(): SocialLink {
  return {
    id: crypto.randomUUID(),
    platform: 'custom',
    url: '',
  };
}

export function duplicateBlock(block: Block): Block {
  const clone = structuredClone(block);
  clone.id = crypto.randomUUID();

  // v3: app_grid.apps are library id references — they carry over as-is;
  // per-card independence is handled by duplicateAsIndependent instead.
  return clone;
}
