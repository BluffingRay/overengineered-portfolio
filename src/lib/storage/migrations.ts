import { CURRENT_VERSION } from './constants';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function migrateRichTextContent(content: string): string {
  if (/<\/?[a-z][^>]*>/i.test(content)) return content;

  return content
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');
}

export function migrateV1ToV2(
  document: Record<string, unknown>,
): Record<string, unknown> {
  const tabs: Array<Record<string, unknown>> = Array.isArray(document.tabs)
    ? document.tabs
    : [];

  return {
    ...document,
    version: CURRENT_VERSION,
    tabs: tabs.map((tab) => ({
      ...tab,
      blocks: Array.isArray(tab.blocks)
        ? (tab.blocks as Array<Record<string, unknown>>).map((block) =>
            block.type === 'rich_text' && typeof block.content === 'string'
              ? {
                  ...block,
                  content: migrateRichTextContent(block.content),
                }
              : block,
          )
        : [],
    })),
  };
}

/**
 * v2 -> v3: hoist every inline app card into the root library and swap
 * each grid's embedded list for ordered id references. Cards sharing an
 * id but diverging in content get a fresh id on the later copy.
 */
export function migrateV2ToV3(
  document: Record<string, unknown>,
): Record<string, unknown> {
  const library: Record<string, unknown>[] = [];
  const indexById = new Map<string, number>();

  const tabs = Array.isArray(document.tabs) ? document.tabs : [];
  const nextTabs = (tabs as Record<string, unknown>[]).map((tab) => ({
    ...tab,
    blocks: Array.isArray(tab.blocks) ? tab.blocks : [],
  }));

  for (const tab of nextTabs) {
    tab.blocks = (tab.blocks as Record<string, unknown>[]).map((block) => {
      if (block.type !== 'app_grid' || !Array.isArray(block.apps)) {
        return block;
      }

      const refs: string[] = [];
      for (const app of block.apps as Record<string, unknown>[]) {
        if (
          typeof app !== 'object' ||
          app === null ||
          typeof app.id !== 'string'
        ) {
          continue;
        }

        let id = app.id;
        const existingIndex = indexById.get(id);
        if (
          existingIndex !== undefined &&
          JSON.stringify(library[existingIndex]) !== JSON.stringify(app)
        ) {
          // Same id, different content: keep both, re-id this one.
          id = crypto.randomUUID();
        }
        if (existingIndex === undefined) {
          indexById.set(id, library.length);
          library.push({ ...app, id });
        }
        refs.push(id);
      }

      return { ...block, apps: refs };
    });
  }

  return { ...document, version: CURRENT_VERSION, cards: library, tabs: nextTabs };
}
