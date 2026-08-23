# Portfolio CMS — Agent Context

## Project Overview

Block-based, **local-first portfolio CMS** built with Next.js (App Router), TypeScript strict mode, and Tailwind CSS v4. All content lives in a single JSON document persisted to `localStorage`; no backend in Phase 1.

## Architecture & Conventions

### Schema — `src/types/schema.ts`
- Blocks are a **discriminated union** on `type`: `featured_hero | app_grid | rich_text | custom_html`. Every entity has an `id`.
- Literal unions that must exist at runtime (`THEME_SKINS`, `IMAGE_ALIGNMENTS`, `PRIMARY_ACTIONS`, `SPACINGS`, `HERO_LAYOUTS`, `STATUS_COLORS`, `SOCIAL_PLATFORMS`) are defined as `as const` arrays; types are derived via `(typeof X)[number]`. **Never hand-write a literal union that duplicates one of these** — extend the array instead.
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
- Modular: `EditorPanel` is Blocks-only (TabsManager + BlockList). Shared atoms/factories live in `editor-shared.tsx`; forms live beside their concerns (`blocks/HeroForm.tsx`, `blocks/AppGridForm.tsx`, `RichTextForm.tsx`, `IconPicker.tsx`).
- Mutations flow through `useBlockMutations(activeTabId)` → immutable recipes → `mutate()`. Form inputs are controlled directly against the store; fields whose display value gets *normalized* on write (hex colors, comma-separated tags) use a local draft + echo guard — never pipe a normalized string straight back into `value`. Reusable implementation: **`useTrimmedCommit(value, onCommit)`** in editor-shared (free typing while focused; trims/clears on blur). Used by hero Name/Eyebrow + global font inputs.
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
- The installed lucide-react has **removed brand icons** (`Github`, `Twitter`, `Linkedin` do not exist). Social platforms map to neutral glyphs in `ui/SocialIcon.tsx` (`PLATFORM_ICONS`); custom icons still resolve via `iconMap`.
- `prepareDocument()` sanitizes the optional root sections (`socials`, `footer`) — malformed imports are dropped/normalized before the type guard, so components can trust their shapes. Additive optional schema fields (socials/footer, hero extras) did **not** bump document version; readers apply `??` defaults.
- Full-project `npm run lint` can be very slow alongside `next dev` in WSL2; prefer targeted checks and let the user verify visually.

## Current Status

**Phase 3 workstream 3 — v3 card library (linked/reusable cards):**
- `PortfolioData.version` is **3**: root `cards: AppCardItem[]` is the single source of truth; `app_grid.apps` holds ordered **id references**. One edit propagates everywhere; per-grid ordering is independent.
- `migrateV2ToV3` (in `prepareDocument`, runs automatically on load/import): hoists inline cards into the library; same-id-different-content collisions get a fresh uuid on the later copy. Sanitizer drops dangling refs + duplicate library ids before the guard.
- Editor verbs: **patchCard** (library-wide), **detach** (✕ = unlink from this grid only), **delete everywhere** (🗑 inside expanded card, confirm-gated), **⧉ duplicate as independent** (clone + fresh id inserted after source), **+ From library…** picker for attaching existing cards. Rows show a `linked ×N` badge when referenced more than once (`usageCounts` computed in BlockList from all tabs).
- Mutations live in `useBlockMutations`: `updateCard/addCardToGrid/detachApp/deleteCardGlobally/attachCardToGrid/duplicateAsIndependent` — each is ONE document transaction, so undo/history stays coherent.
- Renderers resolve refs via lookup (`BlockRenderer` receives `cards`; unknown ids skip silently).
- initialData showcases reuse: Home "Featured" grid references the same card ids as Projects.
- Future: media/asset library deliberately NOT part of v3 — image fields stay plain URLs so the Phase 3 upload/picker workstream can add it without another breaking migration.

**Phase 3 workstream 2 complete — full rich text + Site settings split + global font:**
- **Reusable editor** `src/components/rich/RichTextEditor.tsx`: block-agnostic TipTap wrapper ({content, onChange, minHeight?, placeholder?}). The future **blog editor must mount this directly** — do not duplicate toolbar logic.
- Toolbar: B/I/U/S, H1–3, bullet/ordered/**task** lists, blockquote, align L/C/R, link (URL prompt), image (media library + `ResizableImage`: drag-resize 10–100% / wrap-L / center / wrap-R via node-view toolbar; serializes width%/float inline styles — WYSIWYG parity with `.rich-text`), **⤵ clear-float break** (`ClearFloat` node → `<br clear="all">` so following text drops below wraps; portable HTML), **font size value input** (number→px, blank clears), text color, multicolor highlight, sub/superscript, table insert + row/col ops + header toggle + delete. Placeholder via `@tiptap/extensions`.
- TipTap v3 gotchas: StarterKit does **not** include `TextStyle`; `FontSize` registers as its own `fontSize` extension and requires the base `TextStyle` mark added explicitly. All table classes export from `@tiptap/extension-table` (no subpackages).
- `.rich-text` CSS covers tables/task lists/images/placeholder so rendered output ≈ editing view.
- `RichTextForm` is now thin glue: Width picker + `RichTextEditor`. Width (`width?: BlockWidth`, narrow|wide|full, default narrow) belongs to **rich_text/custom_html only** — heroes deliberately have NO width knob. Split-hero media always hugs its outer edge (`justify-self-end` right / `-start` left) so small `mediaSize` images never look centered.
- **Hidden admin tabs**: edit mode (`Ctrl+Shift+E` / `?edit=true`) reveals virtual nav tabs **Posts** and **Site** (`ADMIN_TABS` in PortfolioView; ids `admin:posts` / `admin:site`). They are NOT document data — never stored, never URL-synced, never persisted to LAST_TAB_KEY. Active admin view renders PostAdmin/GlobalSettings full-width (`max-w-2xl`, settle-in) instead of the tabpanel; EditorPanel hides while one is active. Rationale: standalone admin routes re-rendered heavy fresh trees; in-page views reuse the gated stable tree.
- **Global font**: `theme.fontFamily?: string` (CSS font-family value or preset); applied as inline `--font` on `[data-skin]` root in PortfolioView, overriding skin stacks. Presets in GlobalSettings (Mono/Sans/Serif/System reference `var(--font-geist-*)`). Sanitized by `sanitizeThemeFont`.

**Phase 3 workstream 1 complete — Hybrid Socials Hub + Site Footer + Hero Supercharger:**
- Schema: `SocialLink` + root `socials?`, `FooterConfig` + root `footer?`; hero gained `layout` (`HERO_LAYOUTS`: centered/split/banner), `statusBadge` (ping-dot pill, `STATUS_COLORS`), `secondaryAction`, `showSocials`.
- Legacy hero docs without `layout` still render via their old `imageAlign` (left/right→split, top→centered, backdrop→banner); explicit `layout` wins. **The form no longer exposes `imageAlign`** — one Layout select + contextual placement control: Split gets Image side (`mediaSide: 'left'|'right'`, default right); Centered gets Image position (`mediaPosition: 'top'|'bottom'`, default bottom, implemented as `order-first` in the flex column). Split media order: mobile always image-first; desktop right = `order-first md:order-none`, left = plain `order-first`.
- `ui/SocialIcon.tsx` (platform→Lucide map + customIcon passthrough), `ui/SiteFooter.tsx` (copyright with `{year}` placeholder + socials row, hover-scale/accent).
- `GlobalSettings` (socials CRUD with dnd reorder, per-link platform/label/URL/custom-icon reusing `IconPicker`, footer toggles, default skin pills, global font) renders as the hidden **Site** tab.
- `HeroForm` controls all new fields; secondary button has an enable checkbox and only renders when it has a label.
- Known baseline lint noise: `react-hooks/static-components` fires on the dynamic-Lucide pattern (`resolveAppIcon` → `<Icon/>`) in both `ProjectIcon.tsx` (pre-existing) and `SocialIcon.tsx`; accepted convention for now.

**Phase 2 + 2.5 complete** (checkpointed):
- Admin/visitor mode: `?edit=true` + Ctrl/Cmd+Shift+E, URL-synced via `history.replaceState`; UtilityBar/EditorPanel gated, SkinSwitcher public.
- Undo/redo: 25-entry stacks in the storage layer; every mutation path records history; Cmd/Ctrl+Z / +Shift+Z / Y with editable-target guard.
- Drag-and-drop everywhere (@dnd-kit): blocks, app cards, tabs.
- Rich text via TipTap v3 (Word-style toolbar), spacing tokens per block, block duplication (⧉) at both block and card level.
- Media cards: cover images, Lucide/image icons (`ProjectIcon` 3-mode engine), `IconPicker` popover with search + custom URLs, category pills, tags.
- JSON import/export; v2 document format with automatic v1→v2 migration (`prepareDocument`/`migrateV1ToV2`).
- Editor visual hierarchy: surface inversion, type glyphs, sentence-case labels, mono URL fields, accent ownership rule, collapsible tabs manager, theme dropdown.

**Hero identity split + Marquee block:**
- `featured_hero.eyebrow?` (small kicker) + **`name?` / `roles?[]`**: when `name` exists it becomes the H1 and `heading` demotes to a styled tagline `<p>`; roles cycle via `TypewriterRoles` (type 55ms / erase 28ms / hold 1.9s, mono accent, ▌ caret, honors `prefers-reduced-motion` by showing role #1 statically). Sanitized by `sanitizeHeroIdentity`. Name/Roles inputs appear in HeroForm (Roles only when Name set).
- **Fifth block variant `marquee`**: infinite ticker (`items[]`, `separator?` glyph default '·', `speed` slow/normal/fast, `reverse?`). Two identical halves + `translateX(-50%)` keyframes in globals.css; pauses on hover; honors `prefers-reduced-motion`. Full variant wiring done: schema union + `createDefaultBlock` + BLOCK_LABELS/BLOCK_ICONS (`MoveHorizontal`) + renderer case + `MarqueeForm` (one-item-per-line textarea, speed pills, separator input, reverse checkbox) + `sanitizeMarquee`.

**Motion system (skin-aware micro-interactions):**
- Per-skin motion tokens in globals.css: `--dur` / `--ease` / `--press` / `--rise` — HUD snaps (90ms, sharp), Notebook springs (190ms, overshoot bezier), Clean glides (150ms). Switching skins changes the whole site's movement character automatically.
- **One motion owner**: a `@layer base` rule gives every `button`/`a` its transitions (`color, background-color, border-color, fill, stroke, opacity, box-shadow, translate, rotate, scale`) + press feedback (`:active → scale: var(--press)`; `.rich-text a` opts out). **Do NOT add `transition-colors`/`transition-opacity`/`duration-*` to buttons or links** — the base rule already covers them and utilities would drop `scale` from the transition list. `transform` is deliberately NOT transitioned so dnd-kit inline drag transforms never lag.
- Enter animations: tabpanel uses **directional slide** (`.tab-enter-right` / `.tab-enter-left`, 24px + fade) chosen by render-phase direction tracking in PortfolioView (`navDirection` compares current vs previous activeIndex — no effect). Non-directional contexts (EditorPanel open) use `.settle-in` (fade + settle from `scale: .985`). Both run at `calc(var(--dur) * 2–2.5)` with skin easing. Card hover lift: `.lift` utility on app-grid articles.
- **Hero CTA → tab navigation**: hero `ctaHref` / `secondaryAction.url` resolve against tabs via PortfolioView's `handleNavigate` (threaded through BlockRenderer as optional `onNavigate`, returns handled-boolean). **Only `#`-prefixed values are tab candidates** — matches `#tab-x`, bare ids, or label slugs; everything else passes through as a normal anchor; `_blank` secondaries never intercepted. Handled navigation also smooth-scrolls to top. The admin never types tab ids: HeroForm's `TabLinkPicker` (fed `data.tabs` from BlockList) renders tabs + "Custom URL…" in a select, revealing the raw URL input only for custom; picking a tab forces secondary `_self` and hides the "Opens in" control.
- All of it dies under the existing `prefers-reduced-motion` block.
- **Skin model — official vs visitor**: document `skin` = the admin's **official default**, edited in **GlobalSettings → "Default skin"** pills (Site view); `SkinSwitcher` is a controlled component (props: `value`/`official`/onChange from PortfolioView). The visitor's pick is a **persisted override** under its own localStorage key `portfolio-skin-override` (incl. `'auto'`) — it survives reloads and navigation to the standalone routes but never mutates the stored document or undo history. The pre-paint script resolves it (auto → OS dark ? hud : clean) before first paint; PortfolioView seeds/updates the same key (`changeSkinOverride`). Menu marks the official skin with a "default" tag. Accent/font remain admin-only document settings (UtilityBar + GlobalSettings).
- **Load correctness (no wrong-theme/content flash)**: layout.tsx injects a synchronous pre-paint script that reads `localStorage['portfolio-data']` + `localStorage['portfolio-skin-override']` and applies `data-skin` + `--accent` + `--font` to `<html>` before first paint — this covers every route (/, /write, /blog) since it's in the root layout. PortfolioView/BlogSite gate on `ready` via a hydration-safe `useSyncExternalStore(() => () => {}, () => true, () => false)` mount flag (NOT effect+setState — the lint rule forbids it): server + hydration render a minimal splash, then the real document paints once with persisted data. Consequence: **new UI must tolerate rendering after mount**. Images are the deliberate exception: grid covers/social icons use `loading="lazy" decoding="async"`, hero media uses eager decode + `fetchPriority="high"`. Per-skin `color-scheme` (hud dark) keeps native inputs (date pickers) legible.
- **Scroll reveal**: `blocks/Reveal.tsx` wraps every block (in BlockRenderer) and each app-grid card (staggered `index*60ms`, capped 300ms). Hidden state = `.reveal` (opacity 0 + 14px down), eased away by `.is-visible` at skin timing; IntersectionObserver fires **once** (`rootMargin -10%` bottom) and disconnects. Above-fold content (hero) reveals instantly at mount = soft entry. Reduced-motion CSS force-shows everything.
- Lint note: sync-`setState`-in-effect errors were also purged from `TypewriterRoles` (single-timer state machine + `useSyncExternalStore` for reduced-motion) and UtilityBar's hex draft (React render-phase adjustment pattern).

**Media management (asset vault) — complete:**
- **Upload pipeline**: `POST /api/upload` (src/app/api/upload/route.ts) validates MIME (png/jpeg/webp/gif/avif) + 8MB cap, writes bytes to `public/uploads/<uuid><ext>`, returns `{url, name}`. Cloud migration = swap this file's internals for S3; consumers unchanged. Files are gitignored artifacts, not document data.
- **Registry**: additive optional root `assets?: AssetItem[]` ({id, url, name?}) — NO version bump. `sanitizeAssets` in prepareDocument: URL-reference-only (http(s)/root-relative), dedupes by url, caps at 200.
- **`editor/MediaPicker.tsx`**: centered dialog — library grid (thumbnails, ✕ removes from library only, references keep working), upload button (auto-selects on success), paste-URL fallback form. Escape/outside-click close per house pattern.
- **⚠️ Fixed overlays MUST portal to `<body>`** (`createPortal(…, document.body)`): dnd-kit sortable rows carry inline `transform`, and any transformed ancestor turns `position:fixed` into row-relative positioning — an unportaled dialog centers inside the editor row instead of the viewport (this exact bug shipped once). MediaPicker portals; copy that pattern for any future modal/backdrop.
- **Integrated into**: HeroForm Image URL, AppGridForm coverImage (`coverPickerCardId` state lives in the parent; SortableAppCard receives `onOpenCoverPicker` — nested row components must receive setters via props, they can't reach parent scope), RichTextEditor image toolbar button (replaced `window.prompt`), and IconPicker's custom-icon URL ("Library" button — image icons come from the media library now). Document stores URLs only — the locked storage principle.

**Blog (budget Medium) — complete:**
- Schema: additive optional root `posts?: Post[]` ({id, title, content(HTML), coverImage?, status: draft|published, publishedAt?}) + `POST_STATUSES` — **no version bump**; `sanitizePosts` caps 100. Titles are kept **verbatim** (length-capped only) — the composer owns trimming via `useTrimmedCommit`; empty titles render as "Untitled" at display sites (fallback pattern `{post.title || 'Untitled'}`). Never re-normalize stored strings in sanitizers for fields edited per-keystroke (echo-fight bug class).
- Mutations: `usePosts()` hook (createPost/updatePost/setPostStatus/deletePost). New posts start with an **empty title**; publishing stamps `publishedAt` once, but the date is **editable** afterwards (date input in the writer's meta row).
- **Authoring is full-screen**: dedicated route `/write` (`app/write/page.tsx` → `components/write/WriteView.tsx`, Suspense-wrapped for useSearchParams). Bare `/write` = chooser (new post + list); `/write?post=<id>` = Medium-style editor (sticky top bar: back / status pills / cover via MediaPicker / confirm-gated delete / Done; borderless title; shared RichTextEditor at 55vh). No auto-create on visit — StrictMode double-effects would duplicate drafts; new posts only from explicit clicks.
- `editor/PostAdmin.tsx` is a **launcher** rendered as the hidden **Posts** tab: creates + opens posts in /write, quick status pills, confirm-gated delete. No inline editing.
- Public posts render at the dedicated route `/blog?post=<id>` (`app/blog/page.tsx` → `blog/BlogSite.tsx`, Suspense-wrapped). **Bare /blog is not a destination** — it redirects to `/`; there is no Blog nav tab and no index page. The user composes their own blog sections from **blog blocks** (schema `BLOG_VARIANTS`: `latest` = card grid of the 3 newest, absent variant = latest; `all` = horizontal stacked rows of everything published — design in `blocks/BlogBlock.tsx`). Internal links use next/link to `/blog?post=<id>`. Unknown/draft id → friendly miss state.
- Returning visitors land where they left: PortfolioView persists `activeTabId` to `sessionStorage['portfolio-last-tab']` (seeded on mount; deleted tabs fall back via the existing `?? tabs[0]` resolution).
- Card custom links: `AppCardItem.customLabel?/customUrl?/customPostId?`. Resolution order at render: resolvable published post (internal Link) > customUrl (external ↗) > nothing. The AppGridForm editor has label + URL inputs plus an "Open blogs ▾" picker listing all posts (drafts included, badged); typing a URL unbinds the blog and vice versa; dangling customPostId refs are dropped by the sanitizer (validated against computed posts ids).

## Phase 3 — CLOSED ✅

All workstreams shipped: v3 card library, rich text engine + site settings, socials/footer/hero supercharger, media vault, **blog system** (dual-mode /write composer + floating reader sheets via `FloatingPage`, user-composable Latest/All blog blocks, card custom links with blog binding), hidden edit-mode admin tabs (Posts/Site render in-page; `/admin` routes removed), persisted visitor skin + live `<html>` theme mirroring, editable publish dates.

Known deferred polish → **Phase 4 candidates**: popover enter/exit animations (IconPicker), `DragOverlay` drag previews, skeleton states, keyboard-focus styling audit.

## Phase 4 — TBD

Scope not yet decided. Ideas parked: the deferred polish list above; auth wrapping an admin hub; cloud storage swap behind `/api/upload`.

**DB persistence plan (agreed direction, not built):** self-hosted, SINGLE admin — no concurrency machinery needed. Model = DB as storage, localStorage as editing buffer, explicit sync point:
- Login/entry → fetch doc from API → `prepareDocument()` validates → seed localStorage → paint (pre-paint script fed from API response)
- Editing stays 100% local-real-time (current architecture untouched); **Save** button PUTs the whole document (it's small; no patch API needed)
- Preferred UX: **autosave after ~2s idle + "Saved ✓" indicator**, keeping the explicit button for trust; warn "not yet on server" when leaving edit mode with pending changes
- Loss scenarios are only: cleared storage, or stale-tab overwrite — acceptable for one user; a server-side `updatedAt` check is a cheap extra guard
- Free upgrade path: store each save as a snapshot server-side = browsable version history

---

## Historical — Phase 3 Direction (original scope)

**Storage principle (locked):** the document/database stores **URLs only, never embedded blobs/data-URLs** — uploaded files live in dedicated storage (local: `/public/uploads` via a route handler; cloud later: S3/CDN behind the same API shape). Keeps documents small and the cloud migration a pure storage-swap.

Original candidate workstreams (all resolved — see sections above and Phase 3 closure note):

- **UI/UX & animation pass:** skin-aware press/enter/hover shipped; leftovers moved to Phase 4 candidates.
- **Hero upgrades:** layout variants, badge colors, secondary CTA, socials row shipped; video backgrounds/multi-CTA remain idea-parked.
- **Blog editor + viewer:** shipped as budget-Medium (see Blog section).
- **Asset management:** shipped as the media vault.
