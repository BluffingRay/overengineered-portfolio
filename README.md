# overengineered-portfolio

A block-based portfolio CMS where **the entire portfolio is one JSON document** — tabs, blocks, cards, blog posts, theme settings, all of it. One codebase, two products, one data format:

| | Product B — self-hosted / fork | Product A — hosted |
| --- | --- | --- |
| Who it's for | Developers, tinkerers | Anyone who wants a portfolio without touching code |
| Setup | `npm install && npm run dev` — nothing else | Firebase + Cloudflare env vars (guide below) |
| Where content lives | Your browser's `localStorage` | Cloudflare KV, server-side |
| How you publish | Commit a JSON file, `git push` | Press **Save** |
| Editing | `/?edit=true` or `Ctrl/Cmd + Shift + E` | Same editor, gated by sign-in |

The **JSON document is the bridge**: export from either side, import into the other, same schema (`src/types/schema.ts`, validated by `prepareDocument`).

> The committed `content/portfolio.json` is a **demo portfolio** (also hosted at `/u/demo` on hosted deploys) that showcases every block type and doubles as the user guide — see [Demo seed](#demo-seed).

**Contents:** [Setup: Product B](#setup-product-b--self-hosted-fork) · [Setup: Product A](#setup-product-a--hosted) · [Tech stack](#tech-stack) · [Architecture](#architecture) · [Demo seed](#demo-seed) · [Quirks & gotchas](#quirks--gotchas) · [Limitations](#limitations) · [Vercel deploy checklist](#vercel-deploy-checklist)

## Setup: Product B — self-hosted / fork

Zero config. Two commands and you're in:

```bash
npm install
npm run dev
```

Then:

1. **Edit** — open http://localhost:3000 and enter edit mode with `/?edit=true` or `Ctrl/Cmd + Shift + E`. Add blocks (hero, app grid, rich text, entry list, marquee, blog, custom HTML), pick a per-block **art direction** (default / cutie / editorial / riso), drag to reorder, undo with `Ctrl/Cmd + Z`. Hidden **Posts** and **Site** tabs appear in edit mode — the blog composer lives at `/write`, skins / accent / font / view scale in Site settings.
2. **Publish** — press **Export** in the editor toolbar, then open the downloaded `portfolio-data.json`, **select all and copy-paste** its contents into `content/portfolio.json` in your repo (the committed file must stay valid JSON — paste over the whole file), and `git push`. The rebuild publishes it (the default content is baked at build time).
3. **Keep your images publishable — what NOT to gitignore.** Two rules:
   - `content/portfolio.json` must **stay committed** (never add it to `.gitignore`) — it *is* your published portfolio.
   - Images you reference must travel with the repo. Committed images belong in `public/images/`. Runtime uploads land in `public/uploads/`, which **is gitignored** by default — so before publishing, either move the uploads you want to keep into `public/images/` (and fix their URLs in the JSON), or delete the `/public/uploads` line from `.gitignore` to ship them as-is (fine on a persistent host you control; pointless on Vercel, where they vanish on deploy — see [Quirks](#quirks--gotchas)).
4. **Optional gate** — set `ADMIN_PASSWORD` in `.env.local` to password-gate edit mode, or `ALLOW_EDIT=false` for a fully read-only public site. Setup (incl. the bcrypt `$`-in-`.env` trap) is documented in `.env.example`. It's a guardrail, not real security.

That's the whole product. Everything below only matters if you want the hosted version.

## Setup: Product A — hosted

Hosted mode **activates only when its config exists** — absent env vars, the app is pure Product B. Four moving parts: Firebase (accounts), Cloudflare KV (documents), Cloudflare R2 (images), and Vercel (hosting). Rough order:

### 1. Firebase (accounts + sessions)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com); add a **Web app** to get the client config.
2. Enable **Authentication → Email/Password** (and Google if wanted).
3. Copy the client trio (`NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID`) and the admin service-account trio (`FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` — the private key stays on ONE line with literal `\n`). The `$`-in-`.env` trap applies to all of these — see [Quirks](#quirks--gotchas).

### 2. Cloudflare KV + R2 (documents + images)

1. Create a **Workers KV namespace** (Workers & Pages → KV). Copy `CLOUDFLARE_ACCOUNT_ID`, `KV_NAMESPACE_ID`, `CLOUDFLARE_API_TOKEN`.
2. Create an **R2 bucket** (same account). Copy the S3 credentials into `R2_ENDPOINT` / `R2_BUCKET` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (+ `R2_PUBLIC_URL` only if you want a custom public domain; the built-in `/api/r2` proxy needs nothing extra).

### 3. Deploy + first run

Full env table + first-deploy steps are in the [Vercel deploy checklist](#vercel-deploy-checklist). Short version: set the env vars in Vercel, deploy, sign up from the hub (`/dashboard` → Sign in), onboarding builds your first portfolio, **Save** publishes it to `/u/<your-slug>`.

Migrating existing content (from a B fork or another account): the dashboard's **Export JSON / Import from file** panel. One known limit — the bridge moves **content, not image bytes** (see [Limitations](#limitations)).

## Tech stack

| Piece | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, route handlers, Node runtime) |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS v4 (token-driven skins via CSS variables) |
| Rich text | TipTap v3 (`@tiptap/react` + starter-kit + extensions) |
| Drag and drop | `@dnd-kit/core` / `sortable` / `utilities` |
| Auth | Firebase Auth (client SDK + `firebase-admin` session cookies) |
| Hosted documents | Cloudflare Workers KV (blob store behind `src/lib/kv.ts`) |
| Image hosting | Cloudflare R2 (S3 API via `@aws-sdk/client-s3`) |
| HTML sanitization | `isomorphic-dompurify` (tag allowlist + embed-host scoping) |
| Icons | `lucide-react` (no brand icons) |

## Architecture

One core, two shells (full context in `AGENTS.md` — Two-Product Architecture):

```
CORE  (zero Firebase knowledge) = editor + designs + block types + JSON schema + rendering + motion
B SHELL = core + localStorage (4 touchpoints) + optional env-password gate   <- zero-config
A SHELL = core + Firebase Auth + KV store + dashboard/onboarding + /u/<slug> <- opt-in via config
```

- **Storage seam**: B reads/writes `localStorage` at exactly 4 touchpoints (`src/lib/storage.ts` + the layout pre-paint script); A swaps in KV behind the same document shape. `prepareDocument` is the single validation/migration gate both paths share.
- **Server rule**: the server is the authority. Every state change (login, save, import, upload, delete) is a route handler running `authenticate -> authorize -> validate/sanitize -> do it -> return confirmed`; the client reflects, never decides.
- **Uploads triad**: `POST /api/upload` swaps internals per config — R2 (hosted default), local `public/uploads/` (B fallback), custom S3 endpoint (placeholder). The document stores **URLs only**, never bytes.
- **`content/portfolio.json`** is B's publish file and the seed every fresh clone boots from (`src/data/initialData.ts` imports it).
- **Sanitization**: hosted writes (and reads) run every HTML-bearing field through `src/lib/sanitize-html.ts` — tag/attribute allowlists, URL scheme guards, and iframes only on allowlisted https embed hosts with `/embed/`-style paths.

## Demo seed

The committed `content/portfolio.json` is a **demo portfolio** — a self-documenting showcase (marketing pitch on Home, art directions on Showcase, instructions on Guide, custom HTML + embeds on Playground) instead of any real person's content. Fresh clones and fresh hosted deploys show it; replace it with your own exported document whenever you like.

A dedicated **demo account** hosts the same document publicly at `/u/demo` (also listed in the showcase gallery, so a fresh hosted deploy never looks empty). `scripts/seed-demo.ts` keeps it in sync:

```bash
npx tsx scripts/seed-demo.ts
```

What it does: signs in with the demo credentials (creating the account on first run) -> mints a session cookie -> PUTs `content/portfolio.json` to `/api/portfolio` with `slug: 'demo'`, public + showcased -> verifies `/u/demo` renders and the showcase lists it. Idempotent — rerun any time to re-sync the committed file.

Setup:

1. Set `DEMO_EMAIL` + `DEMO_PASSWORD` in `.env.local` (or shell env) — see `.env.example`. The **server** must also know `DEMO_EMAIL`: locally that means setting it and **restarting `next dev`** (route handlers read env at startup); on Vercel it means adding the var and redeploying. Without it, the claim fails with `invalid-slug` (the script prints this hint).
2. Requires the hosted stack (Firebase + KV) configured; the script hits your running server, never spawns one.
3. Never commit real credential values — anyone holding them can deface `/u/demo`. On success the script writes them to gitignored `demo-credentials.local.txt`.
4. **Against a Vercel deploy**, run it from your machine pointed at the deployed URL:
   ```bash
   SEED_BASE_URL=https://your-app.vercel.app npx tsx scripts/seed-demo.ts
   ```

The demo account is a **mannequin**: it edits nothing by hand. The `demo` slug is reserved for everyone through the UI, and the seed script is the only writer — hand edits would be stomped by the next seed run.

Migrating **your real content** (B -> A or between accounts): the dashboard's **Export JSON / Import from file** panel (the 5f bridge). One known limitation: the bridge migrates **content, not image bytes** — image URL references break across products (A's `/api/r2/...` proxy needs A's R2 env; B's `/uploads/...` files don't travel to the host). Externally hosted (absolute https) image URLs migrate cleanly; anything else means re-uploading via the media vault after importing.

## Quirks & gotchas

- **`$` in `.env` values gets eaten.** Next loads `.env*` via dotenv-expand, which interpolates `$name` — a bcrypt hash (`$2y$10$…`) is silently emptied. Quoting does NOT help. Use plaintext for dev, or set the value as a real environment variable (bypasses the file loader). Full note in `.env.example`.
- **ONE `next dev` per project directory.** This modified Next build enforces it; a second instance exits invisibly and reads as readiness timeouts. Verify scripts preflight the lock.
- **Verify serially (WSL2).** Never run heavy commands (tsc/build/lint/verify scripts) in parallel — false failures abound.
- **Vercel's ephemeral filesystem doesn't persist `public/uploads/`.** Runtime uploads vanish on the next deploy; use R2 on hosted deploys (or a long-lived Node host for local uploads, or commit images to `public/images/`).
- **Draft model: last-save-wins.** `localStorage['portfolio-data']` is the draft store; hosted saves PUT the whole document — two devices editing means the last Save wins (no merge). A fresh browser with an unsaved draft gets the amber load-offer banner rather than silently clobbering the hosted doc.

## Limitations

- **Auth is a guardrail, not a fortress** — the B session token is opaque/unsigned and client-writable; for real auth use the hosted Firebase shell.
- **Last-save-wins** document persistence (see above); no conflict detection.
- **KV index race window**: the `portfolios:index` registry is read-modify-write, so concurrent first-saves can race (the next save heals it).
- **Single-tenant `dev` uploads are uncapped** (no per-user quota without a session).
- **The bridge migrates URLs, not bytes** (see Demo seed above).
- **The demo showcase seat has no off switch** — the seed always lists `/u/demo` in the gallery (a fresh deploy never looks empty is the point); see `AGENTS.md` Future plans for the parked opt-out knob.

## Vercel deploy checklist

Env var names and purposes only — values live in your Vercel project settings (and each is documented in place in `.env.example`):

| Var(s) | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` | Firebase client (public-safe; gates the hosted login bundle) |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin (session minting/verification). Private key on ONE line with literal `\n` |
| `CLOUDFLARE_ACCOUNT_ID` / `KV_NAMESPACE_ID` / `CLOUDFLARE_API_TOKEN` | Workers KV — hosted document store |
| `R2_ENDPOINT` (or `R2_ACCOUNT_ID`) / `R2_BUCKET` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_PUBLIC_URL` / `R2_USER_PREFIX` | R2 image storage |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata/OG (unset = localhost) |
| `ADMIN_PASSWORD` / `ALLOW_EDIT` | B-shell edit gate / read-only switch (see `.env.example` for the `$` trap) |
| `LOCAL` | Upload storage switch (auto / local / R2 — semantics in `.env.example`) |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Demo seed account (server needs `DEMO_EMAIL` + redeploy; see Demo seed) |

First deploy:

1. Create the Firebase app; enable the Email/Password (+ Google if wanted) providers.
2. Create the Workers KV namespace and the R2 bucket (same Cloudflare account).
3. Set the env vars above, deploy.
4. Run `SEED_BASE_URL=https://your-app.vercel.app npx tsx scripts/seed-demo.ts` from your machine to provision `/u/demo`.
5. Sign up from the hub, onboard (or Import from file to migrate), flip visibility to Public in the dashboard when ready — private is the default and `/u/<slug>` 404s for strangers until then.
6. Custom domain: add it in Vercel, set `NEXT_PUBLIC_SITE_URL`, redeploy.

Roadmap, accepted trade-offs, and hard-won gotchas live in `AGENTS.md` (Future plans + Hard-Won Gotchas sections).
