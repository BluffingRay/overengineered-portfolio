'use client';

import { useState } from 'react';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { IMAGE_ALIGNMENTS, PRIMARY_ACTIONS } from '@/types/schema';
import type {
  AppCardItem,
  AppGridBlock,
  Block,
  BlockType,
  FeaturedHeroBlock,
  ImageAlignment,
  PortfolioData,
  PrimaryAction,
} from '@/types/schema';

const BLOCK_LABELS: Record<BlockType, string> = {
  featured_hero: 'Featured Hero',
  app_grid: 'App Grid',
  rich_text: 'Rich Text',
  custom_html: 'Custom HTML',
};

const ALIGNMENT_LABELS: Record<ImageAlignment, string> = {
  left: 'Left',
  right: 'Right',
  top: 'Top',
  backdrop: 'Backdrop',
};

const ACTION_LABELS: Record<PrimaryAction, string> = {
  demo: 'Demo',
  github: 'GitHub',
  href: 'Page link',
};

const INPUT =
  'w-full rounded-skin border border-[var(--border)] bg-background px-2 py-1 text-sm';

const ROW_BTN =
  'flex h-6 w-6 items-center justify-center rounded-skin border border-[var(--border)] text-xs opacity-60 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-20';

interface Props {
  activeTabId: string;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide opacity-50">
        {label}
      </span>
      {children}
    </label>
  );
}

function createDefaultBlock(type: BlockType): Block {
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
      return { id, type, content: 'Write something…' };
    case 'custom_html':
      return { id, type, html: '<div>New HTML block</div>' };
  }
}

function createDefaultApp(): AppCardItem {
  return {
    id: crypto.randomUUID(),
    name: 'New app',
    description: '',
    href: '#',
  };
}

function HeroForm({
  block,
  patch,
}: {
  block: FeaturedHeroBlock;
  patch: (p: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label="Heading">
        <input
          value={block.heading}
          onChange={(e) => patch({ heading: e.target.value })}
          className={INPUT}
        />
      </Field>
      <Field label="Image URL">
        <input
          value={block.thumbnail}
          onChange={(e) => patch({ thumbnail: e.target.value })}
          placeholder="/images/…"
          className={INPUT}
        />
      </Field>
      <Field label="Subheading">
        <textarea
          value={block.subheading}
          onChange={(e) => patch({ subheading: e.target.value })}
          rows={2}
          className={`${INPUT} resize-y leading-relaxed`}
        />
      </Field>
      <Field label="Image alignment">
        <select
          value={block.imageAlign ?? 'left'}
          onChange={(e) =>
            patch({ imageAlign: e.target.value as ImageAlignment })
          }
          className={INPUT}
        >
          {IMAGE_ALIGNMENTS.map((alignment) => (
            <option key={alignment} value={alignment}>
              {ALIGNMENT_LABELS[alignment]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="CTA label">
        <input
          value={block.ctaLabel}
          onChange={(e) => patch({ ctaLabel: e.target.value })}
          className={INPUT}
        />
      </Field>
      <Field label="CTA link">
        <input
          value={block.ctaHref}
          onChange={(e) => patch({ ctaHref: e.target.value })}
          className={INPUT}
        />
      </Field>
    </div>
  );
}

function AppGridForm({
  block,
  patch,
  patchApp,
  removeApp,
  addApp,
}: {
  block: AppGridBlock;
  patch: (p: Record<string, unknown>) => void;
  patchApp: (appId: string, p: Record<string, unknown>) => void;
  removeApp: (appId: string) => void;
  addApp: () => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Grid title">
        <input
          value={block.title}
          onChange={(e) => patch({ title: e.target.value })}
          className={INPUT}
        />
      </Field>

      <ul className="space-y-2">
        {block.apps.map((app) => (
          <li
            key={app.id}
            className="space-y-2 rounded-skin border border-dashed border-[var(--border)] p-2"
          >
            <div className="flex items-center gap-2">
              <input
                value={app.name}
                onChange={(e) => patchApp(app.id, { name: e.target.value })}
                aria-label="App name"
                placeholder="Name"
                className={`${INPUT} font-medium`}
              />
              <button
                type="button"
                aria-label={`Remove ${app.name}`}
                className={`${ROW_BTN} hover:!text-red-500`}
                onClick={() => removeApp(app.id)}
              >
                ✕
              </button>
            </div>

            <textarea
              value={app.description}
              onChange={(e) =>
                patchApp(app.id, { description: e.target.value })
              }
              aria-label={`Description for ${app.name}`}
              placeholder="Description"
              rows={2}
              className={`${INPUT} resize-y leading-relaxed`}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Link">
                <input
                  value={app.href}
                  onChange={(e) => patchApp(app.id, { href: e.target.value })}
                  className={INPUT}
                />
              </Field>
              <Field label="Primary action">
                <select
                  value={app.primaryAction ?? 'href'}
                  onChange={(e) =>
                    patchApp(app.id, {
                      primaryAction: e.target.value as PrimaryAction,
                    })
                  }
                  className={INPUT}
                >
                  {PRIMARY_ACTIONS.map((action) => (
                    <option key={action} value={action}>
                      {ACTION_LABELS[action]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Demo URL (optional)">
                <input
                  value={app.demoUrl ?? ''}
                  onChange={(e) =>
                    patchApp(app.id, {
                      demoUrl: e.target.value || undefined,
                    })
                  }
                  placeholder="—"
                  className={INPUT}
                />
              </Field>
              <Field label="GitHub URL (optional)">
                <input
                  value={app.githubUrl ?? ''}
                  onChange={(e) =>
                    patchApp(app.id, {
                      githubUrl: e.target.value || undefined,
                    })
                  }
                  placeholder="—"
                  className={INPUT}
                />
              </Field>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addApp}
        className="rounded-skin border border-dashed border-[var(--border)] px-2.5 py-1 text-xs opacity-70 transition-opacity hover:border-accent hover:text-accent hover:opacity-100"
      >
        + Add app card
      </button>
    </div>
  );
}

export default function EditorPanel({ activeTabId }: Props) {
  const { data, mutate } = usePortfolioData();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeTab = data.tabs.find((tab) => tab.id === activeTabId);
  if (!activeTab) return null;

  function updateBlocks(recipe: (blocks: Block[]) => Block[]) {
    mutate(
      (current): PortfolioData => ({
        ...current,
        tabs: current.tabs.map((tab) =>
          tab.id === activeTabId ? { ...tab, blocks: recipe(tab.blocks) } : tab,
        ),
      }),
    );
  }

  function updateBlock(blockId: string, patch: Record<string, unknown>) {
    updateBlocks((blocks) =>
      blocks.map((candidate) =>
        candidate.id === blockId
          ? ({ ...candidate, ...patch } as Block)
          : candidate,
      ),
    );
  }

  function updateAppsOf(
    blockId: string,
    recipe: (apps: AppCardItem[]) => AppCardItem[],
  ) {
    updateBlocks((blocks) =>
      blocks.map((candidate) => {
        if (candidate.id !== blockId || candidate.type !== 'app_grid') {
          return candidate;
        }
        return { ...candidate, apps: recipe(candidate.apps) };
      }),
    );
  }

  function updateApp(
    blockId: string,
    appId: string,
    patch: Record<string, unknown>,
  ) {
    updateAppsOf(blockId, (apps) =>
      apps.map((app) =>
        app.id === appId ? ({ ...app, ...patch } as AppCardItem) : app,
      ),
    );
  }

  function addTab() {
    mutate((current) => ({
      ...current,
      tabs: [
        ...current.tabs,
        { id: crypto.randomUUID(), label: 'New tab', blocks: [] },
      ],
    }));
  }

  function renameTab(tabId: string, label: string) {
    mutate((current) => ({
      ...current,
      tabs: current.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, label } : tab,
      ),
    }));
  }

  function deleteTab(tabId: string) {
    mutate((current) =>
      current.tabs.length <= 1
        ? current
        : {
            ...current,
            tabs: current.tabs.filter((tab) => tab.id !== tabId),
          },
    );
  }

  return (
    <section
      aria-label="Block editor"
      className="rounded-skin border border-[var(--border)] bg-surface p-4"
    >
      <section
        aria-label="Manage tabs"
        className="rounded-skin border border-dashed border-[var(--border)] p-2"
      >
        <h3 className="text-[10px] font-medium uppercase tracking-wide opacity-50">
          Tabs
        </h3>
        <ul className="mt-1.5 space-y-1.5">
          {data.tabs.map((tab) => (
            <li key={tab.id} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                title={tab.id === activeTabId ? 'Active tab' : undefined}
                className={`h-2 w-2 shrink-0 rounded-full ${
                  tab.id === activeTabId ? 'bg-accent' : 'bg-current/20'
                }`}
              />
              <input
                value={tab.label}
                onChange={(event) => renameTab(tab.id, event.target.value)}
                aria-label={`Rename tab ${tab.label}`}
                className={INPUT}
              />
              <button
                type="button"
                aria-label={`Delete tab ${tab.label}`}
                title={
                  data.tabs.length === 1
                    ? 'Cannot delete the last remaining tab'
                    : undefined
                }
                disabled={data.tabs.length === 1}
                className={`${ROW_BTN} hover:!text-red-500`}
                onClick={() => deleteTab(tab.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addTab}
          className="mt-1.5 rounded-skin border border-dashed border-[var(--border)] px-2.5 py-1 text-xs opacity-70 transition-opacity hover:border-accent hover:text-accent hover:opacity-100"
        >
          + Add tab
        </button>
      </section>

      <h2 className="mt-4 text-xs font-semibold uppercase tracking-wider opacity-60">
        Editing “{activeTab.label}”
      </h2>

      <ul className="mt-3 space-y-1.5">
        {activeTab.blocks.map((block, index) => {
          const isExpanded = expandedId === block.id;

          return (
            <li
              key={block.id}
              className="rounded-skin border border-[var(--border)]"
            >
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedId(isExpanded ? null : block.id)}
                  className="flex items-center gap-1.5 text-left text-sm font-medium transition-opacity hover:opacity-70"
                >
                  <span className="opacity-50">{isExpanded ? '▾' : '▸'}</span>
                  {BLOCK_LABELS[block.type]}
                </button>
                <code className="text-[10px] opacity-40">{block.id}</code>

                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move block up"
                    className={ROW_BTN}
                    disabled={index === 0}
                    onClick={() =>
                      updateBlocks((blocks) => {
                        const next = [...blocks];
                        [next[index - 1], next[index]] = [
                          next[index],
                          next[index - 1],
                        ];
                        return next;
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move block down"
                    className={ROW_BTN}
                    disabled={index === activeTab.blocks.length - 1}
                    onClick={() =>
                      updateBlocks((blocks) => {
                        const next = [...blocks];
                        [next[index + 1], next[index]] = [
                          next[index],
                          next[index + 1],
                        ];
                        return next;
                      })
                    }
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${BLOCK_LABELS[block.type]} block`}
                    className={`${ROW_BTN} hover:!text-red-500`}
                    onClick={() =>
                      updateBlocks((blocks) =>
                        blocks.filter(
                          (candidate) => candidate.id !== block.id,
                        ),
                      )
                    }
                  >
                    ✕
                  </button>
                </span>
              </div>

              {isExpanded && (
                <div className="border-t border-[var(--border)] p-2">
                  {block.type === 'featured_hero' && (
                    <HeroForm
                      block={block}
                      patch={(p) => updateBlock(block.id, p)}
                    />
                  )}
                  {block.type === 'app_grid' && (
                    <AppGridForm
                      block={block}
                      patch={(p) => updateBlock(block.id, p)}
                      patchApp={(appId, p) => updateApp(block.id, appId, p)}
                      removeApp={(appId) =>
                        updateAppsOf(block.id, (apps) =>
                          apps.filter((app) => app.id !== appId),
                        )
                      }
                      addApp={() =>
                        updateAppsOf(block.id, (apps) => [
                          ...apps,
                          createDefaultApp(),
                        ])
                      }
                    />
                  )}
                  {block.type === 'rich_text' && (
                    <textarea
                      value={block.content}
                      onChange={(event) =>
                        updateBlock(block.id, { content: event.target.value })
                      }
                      rows={4}
                      aria-label="Rich text content"
                      className={`${INPUT} resize-y leading-relaxed`}
                    />
                  )}
                  {block.type === 'custom_html' && (
                    <textarea
                      value={block.html}
                      onChange={(event) =>
                        updateBlock(block.id, { html: event.target.value })
                      }
                      rows={4}
                      spellCheck={false}
                      aria-label="Custom HTML source"
                      className={`${INPUT} resize-y font-mono text-xs leading-relaxed`}
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(Object.keys(BLOCK_LABELS) as BlockType[]).map((type) => (
          <button
            key={type}
            type="button"
            className="rounded-skin border border-dashed border-[var(--border)] px-2.5 py-1 text-xs opacity-70 transition-opacity hover:border-accent hover:text-accent hover:opacity-100"
            onClick={() =>
              updateBlocks((blocks) => [...blocks, createDefaultBlock(type)])
            }
          >
            + {BLOCK_LABELS[type]}
          </button>
        ))}
      </div>
    </section>
  );
}
