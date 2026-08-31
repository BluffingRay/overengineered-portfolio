// 6-c entry-list verify — PURE checks only: no servers, no DOM, no .env
// reads (safe to run alongside the dev server). Covers: the preset enum +
// factory + label/icon records, the sanitizeEntryList path through
// prepareDocument (trim/drop/caps/absent-not-null), renderToString markup
// checks for the shared skeleton and all four design skins, the
// sanitize-html URL neutralization for entry links, and static file greps
// (focus-visible rule, new files present, no motion utilities, 6-a
// exports untouched).
// Run: npx tsx scripts/6-c-verify.ts
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { ENTRY_LIST_COLUMNS, ENTRY_LIST_PRESETS } from '../src/types/schema';
import type { EntryListBlock } from '../src/types/schema';
import {
  BLOCK_ICONS,
  BLOCK_LABELS,
  ENTRY_LIST_FIELD_LABELS,
  ENTRY_LIST_PRESET_LABELS,
  createDefaultBlock,
} from '../src/components/editor/editor-shared';
import { prepareDocument } from '../src/lib/storage';
import { sanitizePortfolioDocument } from '../src/lib/sanitize-html';
import { initialData } from '../src/data/initialData';
import EntryListBlockComponent from '../src/components/blocks/EntryListBlock';
import { check as _sharedCheck } from './_helpers';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function readSrc(rel: string): string {
  return readFileSync(`src/${rel}`, 'utf8');
}

const baseDoc = () => structuredClone(initialData);

/** Pushes a raw entry_list block into the seed's first tab and runs the
    full prepareDocument pipeline; returns the sanitized block. */
function preparedEntryList(raw: unknown): EntryListBlock | undefined {
  const doc = baseDoc();
  (doc.tabs[0].blocks as unknown[]).push(raw);
  const prepared = prepareDocument(doc);
  if (!prepared) return undefined;
  return prepared.tabs[0].blocks.find(
    (block): block is EntryListBlock => block.type === 'entry_list',
  );
}

console.log('— enum + factory + labels/icons —');
check(
  'ENTRY_LIST_PRESETS: exactly the three presets',
  JSON.stringify(ENTRY_LIST_PRESETS) ===
    '["experience","education","certifications"]',
  JSON.stringify(ENTRY_LIST_PRESETS),
);

check(
  'ENTRY_LIST_COLUMNS: exactly one, two, three',
  JSON.stringify(ENTRY_LIST_COLUMNS) === '[1,2,3]',
  JSON.stringify(ENTRY_LIST_COLUMNS),
);

const factoryBlock = createDefaultBlock('entry_list');
check(
  'factory: type + title + preset shape',
  factoryBlock.type === 'entry_list' &&
    factoryBlock.title === 'Experience' &&
    factoryBlock.preset === 'experience',
  JSON.stringify(factoryBlock),
);
if (factoryBlock.type !== 'entry_list') {
  console.log('FAIL  factory did not produce an entry_list block — aborting');
  process.exit(1);
}
const factory = factoryBlock; // narrowed for the remaining property checks
check(
  'factory: seeds ONE sample entry with the locked sample fields',
  factory.entries.length === 1 &&
    typeof factory.entries[0].id === 'string' &&
    factory.entries[0].title === 'Role or degree' &&
    factory.entries[0].subtitle === 'Company or school' &&
    factory.entries[0].meta === '2024 — Now' &&
    factory.entries[0].description === 'What you did there.' &&
    factory.entries[0].id !== factory.id,
  JSON.stringify(factory.entries),
);

check(
  'BLOCK_LABELS: entry_list is "Entry List"',
  BLOCK_LABELS.entry_list === 'Entry List',
  String(BLOCK_LABELS.entry_list),
);
check(
  'BLOCK_ICONS: entry_list renders as an svg icon component (Briefcase)',
  renderToString(createElement(BLOCK_ICONS.entry_list)).includes('<svg'),
);
check(
  'BLOCK_ICONS: entry_list icon is unique within the record',
  Object.values(BLOCK_ICONS).filter((icon) => icon === BLOCK_ICONS.entry_list)
    .length === 1,
);

check(
  'ENTRY_LIST_PRESET_LABELS: covers exactly the presets, non-empty',
  JSON.stringify(Object.keys(ENTRY_LIST_PRESET_LABELS).sort()) ===
    JSON.stringify([...ENTRY_LIST_PRESETS].sort()) &&
    Object.values(ENTRY_LIST_PRESET_LABELS).every((label) => label.length > 0),
);
check(
  'ENTRY_LIST_FIELD_LABELS: covers all four fields for every preset',
  Object.values(ENTRY_LIST_FIELD_LABELS).every((labels) =>
    [labels.title, labels.subtitle, labels.meta, labels.description].every(
      (label) => label.length > 0,
    ),
  ),
);
check(
  'ENTRY_LIST_FIELD_LABELS: experience label set exact',
  ENTRY_LIST_FIELD_LABELS.experience.title === 'Job title' &&
    ENTRY_LIST_FIELD_LABELS.experience.subtitle === 'Company' &&
    ENTRY_LIST_FIELD_LABELS.experience.meta === 'Period' &&
    ENTRY_LIST_FIELD_LABELS.experience.description === 'What you did',
);
check(
  'ENTRY_LIST_FIELD_LABELS: education + certifications label sets exact',
  ENTRY_LIST_FIELD_LABELS.education.title === 'Degree' &&
    ENTRY_LIST_FIELD_LABELS.education.subtitle === 'School' &&
    ENTRY_LIST_FIELD_LABELS.education.meta === 'Years' &&
    ENTRY_LIST_FIELD_LABELS.education.description === 'Highlights' &&
    ENTRY_LIST_FIELD_LABELS.certifications.title === 'Certificate' &&
    ENTRY_LIST_FIELD_LABELS.certifications.subtitle === 'Issuer' &&
    ENTRY_LIST_FIELD_LABELS.certifications.meta === 'Issued' &&
    ENTRY_LIST_FIELD_LABELS.certifications.description === 'Details',
);

console.log('— sanitizeEntryList via prepareDocument —');
const trimmed = preparedEntryList({
  type: 'entry_list',
  title: '  Experience  ',
  preset: 'experience',
  entries: [
    {
      id: 'e1',
      title: '  Senior Engineer  ',
      subtitle: '  Acme Corp  ',
      meta: '  2024 — Now  ',
      description: '  Shipped things.  ',
      link: '  https://example.com  ',
    },
  ],
});
check(
  'trims: block title + every entry field (title verbatim — echo-fight rule)',
  trimmed?.title === 'Experience' &&
    trimmed.entries[0]?.title === '  Senior Engineer  ' &&
    trimmed.entries[0]?.subtitle === 'Acme Corp' &&
    trimmed.entries[0]?.meta === '2024 — Now' &&
    trimmed.entries[0]?.description === 'Shipped things.' &&
    trimmed.entries[0]?.link === 'https://example.com',
  JSON.stringify(trimmed),
);

const dropped = preparedEntryList({
  type: 'entry_list',
  entries: [
    { id: 'e1', title: 'Keeper' },
    {},
    { id: 'e2' },
    { id: 'e3', title: '' },
    { id: 'e4', title: '   ' },
    { title: 'No id' },
    { id: '', title: 'Empty id' },
    'junk string',
    42,
    null,
  ],
});
const columns = preparedEntryList({ type: 'entry_list', columns: 2, entries: [{ id: 'e1', title: 'T' }] });
check(
  'columns: 2 survives prepareDocument; garbage drops to absent',
  columns?.columns === 2,
  JSON.stringify(columns),
);
const badColumns = preparedEntryList({ type: 'entry_list', columns: 4, entries: [{ id: 'e1', title: 'T' }] });
check(
  'columns: invalid value dropped (absent = 1)',
  badColumns !== undefined && !('columns' in (badColumns as object)),
  JSON.stringify(badColumns),
);
check(
  'keeps: untitled entries survive (form adds them live — echo-fight rule)',
  dropped?.entries.length === 3 &&
    dropped.entries[0]?.title === 'Keeper' &&
    dropped.entries[1]?.title === '' &&
    dropped.entries[2]?.title === '   ',
  JSON.stringify(dropped?.entries),
);

const absent = preparedEntryList({
  type: 'entry_list',
  entries: [
    {
      id: 'e1',
      title: 'Only title',
      subtitle: '',
      meta: '   ',
      description: null,
      link: 42,
    },
  ],
});
check(
  'absent-not-null: empty/whitespace/typed-garbage optionals become absent keys',
  absent !== undefined &&
    absent.entries.length === 1 &&
    !('subtitle' in absent.entries[0]) &&
    !('meta' in absent.entries[0]) &&
    !('description' in absent.entries[0]) &&
    !('link' in absent.entries[0]) &&
    absent.entries[0].subtitle === undefined,
  JSON.stringify(absent?.entries),
);
check(
  'title-only entry survives with exactly {id, title}',
  absent !== undefined &&
    absent.entries.length === 1 &&
    Object.keys(absent.entries[0]).sort().join(',') === 'id,title',
  JSON.stringify(Object.keys(absent?.entries[0] ?? {})),
);

const capped = preparedEntryList({
  type: 'entry_list',
  entries: [{ id: 'e1', title: 'Cap', description: 'x'.repeat(600) }],
});
check(
  'description capped at 500 chars',
  capped?.entries[0]?.description?.length === 500,
  String(capped?.entries[0]?.description?.length),
);

const manyEntries = Array.from({ length: 61 }, (_, i) => ({
  id: `e${i}`,
  title: `Role ${i}`,
}));
check(
  'entries capped at 50',
  preparedEntryList({ type: 'entry_list', entries: manyEntries })?.entries
    .length === 50,
);

const duped = preparedEntryList({
  type: 'entry_list',
  entries: [
    { id: 'e1', title: 'First' },
    { id: 'e1', title: 'Second' },
  ],
});
check(
  'duplicate entry id: later copy dropped (dnd keys on ids)',
  duped?.entries.length === 1 && duped.entries[0]?.title === 'First',
  JSON.stringify(duped?.entries),
);

check(
  'invalid preset dropped (absent, not null)',
  preparedEntryList({ type: 'entry_list', preset: 'jobs', entries: [] })
    ?.preset === undefined,
);
check(
  'valid preset kept',
  preparedEntryList({ type: 'entry_list', preset: 'education', entries: [] })
    ?.preset === 'education',
);
check(
  'block title whitespace-only becomes absent',
  preparedEntryList({ type: 'entry_list', title: '   ', entries: [] })
    ?.title === undefined,
);
check(
  'non-array entries -> empty array; empty entries stay empty',
  preparedEntryList({ type: 'entry_list', entries: 'nope' })?.entries
    .length === 0 &&
    preparedEntryList({ type: 'entry_list', entries: [] })?.entries.length === 0,
);

console.log('— renderToString: shared skeleton —');
// createElement, not JSX: the spec pins this script's filename to .ts.
const render = (block: EntryListBlock) =>
  renderToString(createElement(EntryListBlockComponent, { block }));

const minimal = render({
  id: 'b1',
  type: 'entry_list',
  entries: [{ id: 'e1', title: 'Only title' }],
});
check(
  'minimal entry: renders the title through the default dispatcher',
  minimal.includes('Only title') && minimal.includes('rounded-skin border border-current/15'),
  minimal,
);
check(
  'minimal entry: NO subtitle/meta/description markup, no anchor',
  !minimal.includes('<p') && !minimal.includes('<a'),
  minimal,
);

const full = render({
  id: 'b1',
  type: 'entry_list',
  entries: [
    {
      id: 'e1',
      title: 'Senior Engineer',
      subtitle: 'Acme Corp',
      meta: '2024 — Now',
      description: 'Shipped things.',
      link: 'https://example.com',
    },
  ],
});
check(
  'full entry with link: hard-target external anchor on the title',
  full.includes('href="https://example.com"') &&
    full.includes('target="_blank"') &&
    full.includes('rel="noreferrer noopener"') &&
    full.includes('>Senior Engineer</a>'),
  full,
);
check(
  'full entry: subtitle/meta/description all render',
  full.includes('Acme Corp') &&
    full.includes('2024 — Now') &&
    full.includes('Shipped things.'),
  full,
);

const headingless = render({
  id: 'b1',
  type: 'entry_list',
  entries: [{ id: 'e1', title: 'Role' }],
});
const headed = render({
  id: 'b1',
  type: 'entry_list',
  title: 'Experience',
  entries: [{ id: 'e1', title: 'Role' }],
});
check(
  'block.title absent -> no heading; present -> heading renders',
  !headingless.includes('<h2') &&
    headed.includes('<h2') &&
    headed.includes('>Experience<'),
  headingless,
);

check(
  'empty entries -> empty string (null render, even with a title)',
  render({ id: 'b1', type: 'entry_list', title: 'Experience', entries: [] }) ===
    '',
);

const hostile = render({
  id: 'b1',
  type: 'entry_list',
  entries: [{ id: 'e1', title: '<script>alert(1)</script>' }],
});
check(
  'entry title markup is escaped (no script tag in output)',
  !hostile.includes('<script>') && hostile.includes('&lt;script&gt;'),
  hostile,
);

console.log('— renderToString: four design skins —');
const designBlock = (design: EntryListBlock['design']): EntryListBlock => ({
  id: 'b1',
  type: 'entry_list',
  design,
  entries: [
    {
      id: 'e1',
      title: 'Senior Engineer',
      subtitle: 'Acme Corp',
      meta: '2024 — Now',
      description: 'Shipped things.',
    },
  ],
});
const DESIGN_MARKERS: Array<[NonNullable<EntryListBlock['design']>, string]> = [
  ['default', 'rounded-skin border border-current/15'],
  ['cutie', 'bg-current/[0.04]'],
  ['editorial', 'dsn-editorial'],
  ['riso', 'dsn-riso'],
];
for (const [design, marker] of DESIGN_MARKERS) {
  const html = render(designBlock(design));
  check(
    `design '${design}' renders its marker class`,
    html.includes(marker),
    html.slice(0, 200),
  );
}
check(
  'riso numbers entries "01" via the skeleton number slot',
  render(designBlock('riso')).includes('>01<'),
);

const twoColHtml = render({ type: 'entry_list', columns: 2, entries: [
  { id: 'a', title: 'One' }, { id: 'b', title: 'Two' },
] } as EntryListBlock);
check(
  'skeleton: two columns render a responsive grid list',
  twoColHtml.includes('sm:grid-cols-2'),
  twoColHtml.slice(0, 120),
);
const threeColHtml = render({ type: 'entry_list', columns: 3, entries: [
  { id: 'a', title: 'One' }, { id: 'b', title: 'Two' }, { id: 'c', title: 'Three' },
] } as EntryListBlock);
check(
  'skeleton: three columns render the app-grid responsive grid',
  threeColHtml.includes('sm:grid-cols-2') && threeColHtml.includes('lg:grid-cols-3'),
  threeColHtml.slice(0, 160),
);
check(
  'skeleton: single column cards get a uniform fixed height',
  (render({ type: 'entry_list', entries: [
    { id: 'a', title: 'One' }, { id: 'b', title: 'Two' },
  ] } as EntryListBlock)).includes('h-40'),
  'missing fixed-height rule',
);
console.log('— sanitizePortfolioDocument: entry link neutralization —');
const hostedRaw = baseDoc();
(hostedRaw.tabs[0].blocks as unknown[]).push({
  type: 'entry_list',
  entries: [
    { id: 'e1', title: 'Bad link', link: 'javascript:alert(1)' },
    { id: 'e2', title: 'Good link', link: 'https://example.com' },
  ],
});
const hosted = prepareDocument(hostedRaw);
check('hosted doc prepared', hosted !== null);
if (!hosted) {
  console.log('FAIL  hosted doc failed prepareDocument — aborting');
  process.exit(1);
}
const badEntry = hosted.tabs[0].blocks.find(
  (block): block is EntryListBlock => block.type === 'entry_list',
)?.entries[0];
check(
  'prepareDocument alone does NOT judge URL schemes (that is the sanitize-html seam)',
  badEntry?.link === 'javascript:alert(1)',
  String(badEntry?.link),
);

const sanitized = sanitizePortfolioDocument(structuredClone(hosted));
const sanitizedBlock = sanitized.tabs[0].blocks.find(
  (block): block is EntryListBlock => block.type === 'entry_list',
);
check(
  'unsafe entry link removed (absent, never null)',
  sanitizedBlock !== undefined &&
    !('link' in sanitizedBlock.entries[0]) &&
    sanitizedBlock.entries[0].link === undefined,
  JSON.stringify(sanitizedBlock?.entries[0]),
);
check(
  'safe https entry link kept',
  sanitizedBlock?.entries[1]?.link === 'https://example.com',
);

console.log('— static: files, focus rule, motion-utility ban, 6-a untouched —');
const newFiles = [
  'components/blocks/EntryListBlock.tsx',
  'components/blocks/designs/entry-list/shared.tsx',
  'components/blocks/designs/entry-list/DefaultEntryList.tsx',
  'components/blocks/designs/entry-list/CutieEntryList.tsx',
  'components/blocks/designs/entry-list/EditorialEntryList.tsx',
  'components/blocks/designs/entry-list/RisoEntryList.tsx',
  'components/editor/blocks/EntryListForm.tsx',
];
for (const file of newFiles) {
  check(`exists + non-empty: ${file}`, readSrc(file).length > 0);
}
check(
  'no motion utilities in any new entry-list file (static content)',
  newFiles.every((file) => {
    const source = readSrc(file);
    return !source.includes('transition-') && !source.includes('duration-');
  }),
);

const globals = readFileSync('src/app/globals.css', 'utf8');
check(
  'globals.css: keyboard-focus base rule present (token-driven ring)',
  globals.includes(':focus-visible') &&
    globals.includes('outline: 2px solid var(--accent)'),
);
check(
  'globals.css: ProseMirror outline exception still intact',
  globals.includes('.rich-editor .ProseMirror') &&
    globals.includes('outline: none'),
);

check(
  'schema: ENTRY_LIST_PRESETS present',
  readSrc('types/schema.ts').includes('ENTRY_LIST_PRESETS'),
);
check(
  '6-a untouched: marquee shared still exports marqueeRepeatCount',
  readSrc('components/blocks/designs/marquee/shared.tsx').includes(
    'export function marqueeRepeatCount',
  ),
);
check(
  'wiring: BlockList + BlockRenderer dispatch entry_list',
  readSrc('components/editor/BlockList.tsx').includes("case 'entry_list'") &&
    readSrc('components/blocks/BlockRenderer.tsx').includes(
      "case 'entry_list'",
    ),
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
