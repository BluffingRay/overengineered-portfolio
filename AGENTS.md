# Portfolio CMS — Agent Context

## Project Overview

Block-based, **local-first portfolio CMS** built with Next.js (App Router), TypeScript strict mode, and Tailwind CSS v4. All content lives in a single JSON document persisted to `localStorage`; no backend in Phase 1.

## Architecture & Conventions

### Schema — `src/types/schema.ts`
- Blocks are a **discriminated union** on `type`: `featured_hero | app_grid | rich_text | custom_html`. Every entity has an `id`.
- Literal unions that must exist at runtime (`THEME_SKINS`, `IMAGE_ALIGNMENTS`, `PRIMARY_ACTIONS`, `SPACINGS`) are defined as `as const` arrays; types are derived via `(typeof X)[number]`. **Never hand-write a literal union that duplicates one of these** — extend the array instead.
- `PortfolioData.version` is the literal `2`. **Changing document shape requires bumping this and adding a migration step** in `storage.ts` (`migrateV1ToV2` is the template); old documents flow through `prepareDocument()` on every load/import.
- `rich_text.content` has been HTML (`<p>…</p>`) since v2; plain-text v1 strings are auto-migrated on load.
- Optional fields must be *absent* from stored JSON, never `null` (editors commit `value || undefined`).

### Persistence — `src/lib/storage.ts`
- `localStorage` key `portfolio-data`, wrapped as an external store consumed via `useSyncExternalStore` (hook: `src/hooks/usePortfolioData.ts`). No mirrored copies of data in React state; `mutate(recipe)` writes → `notify()` → subscribers re-read cached snapshots.
- All stored documents pass through the `isPortfolioData` type guard (version + shape check). Invalid/corrupt data silently falls back to `structuredClone(initialData)` — never cast parsed JSON blindly.
- Import/export helpers live here too (`importPortfolioData`, save/reset).

### Theming — `src/app/globals.css`
- Token-driven: each `[data-skin='hud' | 'notebook' | 'clean']` declares the same CSS variable contract (`--background`, `--foreground`, `--surface`, `--border`, `--accent`, `--radius`, `--font`).
- `data-skin` is applied by `PortfolioView` (client), not the server layout — the skin value comes from client-side storage. User `theme.accentColor` overrides via inline `--accent`.
- Tailwind tokens exposed through `@theme inline` (`bg-surface`, `text-accent`, `rounded-skin`, …).

### Editing — `src/components/editor/`
- Modular: `EditorPanel` is a thin shell composing `TabsManager` (self-contained tab CRUD/reorder) and `BlockList` (rows, spacing bar, form dispatch). Shared atoms/factories live in `editor-shared.tsx`; forms live beside their concerns (`blocks/HeroForm.tsx`, `blocks/AppGridForm.tsx`, `RichTextForm.tsx`, `IconPicker.tsx`).
- Mutations flow through `useBlockMutations(activeTabId)` → immutable recipes → `mutate()`. Form inputs are controlled directly against the store; fields whose display value gets *normalized* on write (hex colors, comma-separated tags) use a local draft + `committedRef` echo guard — never pipe a normalized string straight back into `value`.
- Ephemeral UI state (active tab id, expanded rows, edit mode, editor open) is React state — **never** written into the stored document.

### Admin vs Visitor mode
- `isEditMode` seeds from `?edit=true` (via `useSearchParams`) and toggles with Ctrl/Cmd+Shift+E. Gated: UtilityBar + EditorPanel. SkinSwitcher stays public.

## Hard-Won Gotchas
- This Next.js version's lint forbids synchronous `setState` directly inside effects — use event handlers or `useSyncExternalStore` for external systems.
- TipTap's `useEditor` must pass `immediatelyRender: false` (SSR'd tree); sync external content changes via an effect guarded against echo loops.
- `useSearchParams()` requires a `<Suspense>` boundary on prerendered routes (see `src/app/page.tsx`).
- Never render `<img src="">` — conditionally mount when the CMS field may be empty.
- Exhaustive `switch` on block `type` ends in `default:` assigning to `never`; keep it as the tripwire when adding variants. Same pattern applies to `BLOCK_LABELS`, `BLOCK_ICONS`, and the default-block factory.
- Adding a new block variant requires touching: schema union + `createDefaultBlock` factory + `BLOCK_LABELS`/`BLOCK_ICONS` records + renderer case (+ form). The compiler walks you through it.
- Icon strings resolve through `blocks/iconMap.ts`: image URLs (`http(s)`, `/`, `data:image`) render as `<img>`, Lucide keys (kebab or PascalCase) as SVG, anything else falls back to a monogram. Verify icon export names exist in the installed lucide-react before mapping them.
- Full-project `npm run lint` can be very slow alongside `next dev` in WSL2; prefer targeted checks and let the user verify visually.

## Current Status

**Phase 2 + 2.5 complete** (checkpointed):
- Admin/visitor mode: `?edit=true` + Ctrl/Cmd+Shift+E, URL-synced via `history.replaceState`; UtilityBar/EditorPanel gated, SkinSwitcher public.
- Undo/redo: 25-entry stacks in the storage layer; every mutation path records history; Cmd/Ctrl+Z / +Shift+Z / Y with editable-target guard.
- Drag-and-drop everywhere (@dnd-kit): blocks, app cards, tabs.
- Rich text via TipTap v3 (Word-style toolbar), spacing tokens per block, block duplication (⧉) at both block and card level.
- Media cards: cover images, Lucide/image icons (`ProjectIcon` 3-mode engine), `IconPicker` popover with search + custom URLs, category pills, tags.
- JSON import/export; v2 document format with automatic v1→v2 migration (`prepareDocument`/`migrateV1ToV2`).
- Editor visual hierarchy: surface inversion, type glyphs, sentence-case labels, mono URL fields, accent ownership rule, collapsible tabs manager, theme dropdown.

## Phase 3 Direction (agreed scope)

Theme: **experience polish + content depth** — lean into the "overengineered" name. Candidate workstreams (not yet started):

- **UI/UX & animation pass:** micro-interactions (press/hover feedback), enter/exit transitions for blocks and popovers, drag previews via `DragOverlay`, skeleton/loading states, keyboard-focus styling audit.
- **Hero upgrades:** more layout variants, media/video backgrounds, multi-CTA support, social links row.
- **Blog editor + viewer:** new first-class content type (posts collection alongside tabs) with its own list/detail views, likely reusing TipTap + the store/migration pipeline (document format bump to v3 when it lands).
- **Asset management:** real image *upload* (file → data-URL or `/public` write path TBD) and a reusable **media picker** dialog generalized from `IconPicker`.
- Anything else that makes authoring/viewing feel effortless — err on the side of delightful over-engineering.
