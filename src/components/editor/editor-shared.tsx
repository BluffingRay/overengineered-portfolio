import { SPACINGS } from '@/types/schema';
import type {
  AppCardItem,
  Block,
  BlockType,
  BlockSpacing,
  ImageAlignment,
  PrimaryAction,
} from '@/types/schema';
import type { LucideIcon } from 'lucide-react';
import { KanbanSquare, CodeXml, Star, Type } from 'lucide-react';

export const BLOCK_ICONS: Record<BlockType, LucideIcon> = {
  featured_hero: Star,
  app_grid: KanbanSquare,
  rich_text: Type,
  custom_html: CodeXml,
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  featured_hero: 'Featured Hero',
  app_grid: 'App Grid',
  rich_text: 'Rich Text',
  custom_html: 'Custom HTML',
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

export function nextSpacing(current: BlockSpacing): BlockSpacing {
  return SPACINGS[(SPACINGS.indexOf(current) + 1) % SPACINGS.length];
}

export const INPUT =
  'w-full rounded-skin border border-[var(--border)] bg-background px-2 py-1 text-sm';

export const ROW_BTN =
  'flex h-6 w-6 items-center justify-center rounded-skin border border-[var(--border)] text-xs opacity-60 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-20';

export const DRAG_HANDLE =
  'flex h-6 w-5 cursor-grab touch-none select-none items-center justify-center text-sm opacity-40 transition-opacity hover:opacity-100 active:cursor-grabbing';

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
        imageAlign: 'left',
      };
    case 'app_grid':
      return { id, type, title: 'New grid', apps: [] };
    case 'rich_text':
      return { id, type, content: '<p>Write something…</p>' };
    case 'custom_html':
      return { id, type, html: '<div>New HTML block</div>' };
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

export function duplicateBlock(block: Block): Block {
  const clone = structuredClone(block);
  clone.id = crypto.randomUUID();

  if (clone.type === 'app_grid') {
    clone.apps = clone.apps.map((app) => ({
      ...app,
      id: crypto.randomUUID(),
    }));
  }

  return clone;
}
