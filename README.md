# overengineered-portfolio

A block-based, **local-first portfolio CMS** built with Next.js (App Router), TypeScript, and Tailwind CSS v4. Your entire portfolio is one JSON document in your browser's `localStorage` — no database, no account, no backend for your content. Edit it live, export/import it, and it's yours.

One codebase, two products:
- **Product B — self-hosted / fork** (works now): run it locally, everything in `localStorage`.
- **Product A — hosted SaaS** (planned): sign-up, hosted portfolios, real accounts.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Editing your portfolio

Enter **edit mode** with **⌘/Ctrl + Shift + E**, or open `/?edit=true`. This reveals the admin toolbar (undo/redo, import/export, tabs, blocks, hidden **Posts** and **Site** tabs). The shortcut is remappable in **Site → Edit-mode shortcut**.

Content lives in `localStorage` (`portfolio-data`). Preferences live in their own keys (skin override, shortcut, session) and are **never** part of the exported document.

## Publishing your site (self-hosted Product B)

Product B is **local-first**: editing the *deployed* site only writes to that browser's own `localStorage` — it is not shared. So to **publish** content for everyone, you edit locally and commit.

**The workflow is one file + your assets:**
1. **Edit `content/portfolio.json`** — the seed document that new visitors see (what the app falls back to when a browser has empty/corrupt `localStorage`). You can build your portfolio in the editor, **Export JSON**, and put that file here.
2. **Put your images in `public/`** (committed) — e.g. `public/images/…`. These are tracked and ship with the repo. (Images uploaded through the editor go to gitignored `public/uploads/` — see the note below.)
3. **`git push` → your host rebuilds → deployed.** The build imports `content/portfolio.json` and serves your committed `public/` assets.

```
edit content/portfolio.json  +  add images to public/  →  git push  →  redeploy  →  published
```

> ⚠️ **Runtime image uploads don't persist on Vercel, and are gitignored by default.** `/api/upload` writes to `public/uploads/`, which is in `.gitignore` — so those files aren't committed and Vercel's ephemeral serverless FS loses them between requests. **To ship images reliably, commit them to `public/` (a folder like `public/images/`)** rather than relying on the in-editor upload.
>
> **Only if you self-host on a persistent Node server and want runtime uploads tracked:** remove `/public/uploads` from `.gitignore` (and commit `public/uploads/`), or point uploads at a cloud bucket by swapping `/api/upload`'s internals.
>
> Also note `initialData` is baked at **build** time from `content/portfolio.json`, so publishing always means a new build/deploy (not a live file swap).

## Optional admin gate (password)

By default edit mode is open. To stop casual visitors from wandering into edit mode, set a single admin password.

**For a public self-host (e.g. Vercel), the simplest way to make your site read-only is `ALLOW_EDIT=false`** — it hides the editor entirely (no shortcut toggle, `?edit=true` shows nothing). Works on its own or combined with the password gate:

```
# read-only public site (local dev stays zero-config)
ALLOW_EDIT=false
```

**The gate turns on only when `ADMIN_PASSWORD` is set.** Put it in `.env.local` (gitignored):

```
ADMIN_PASSWORD='your-password'
```

For local dev a **plaintext** password is fine (a console warning appears). For production use a **bcrypt hash**.

> ⚠️ **Never put a bcrypt hash inside a `.env` file.** Next loads `.env` via `dotenv-expand`, which treats `$name` as a variable. A bcrypt hash is full of `$` (e.g. `$2y$10$…`), so it gets silently eaten and auth never matches — quoting does **not** help. Use plaintext in `.env` for dev, or set a hash as a **real environment variable** (your host's env config, or `ADMIN_PASSWORD='$2y$…' next start`).

**Generate a bcrypt hash** — the project already ships `bcryptjs`, so you can generate one without installing anything:

```bash
# Using the project's own bcryptjs:
node -e "import('bcryptjs').then(m => { const b = m.default ?? m; console.log(b.hashSync(process.argv[1], 10)); })" 'your-password'

# Or, if you have Apache's htpasswd:
htpasswd -nbB -C 10 x 'your-password' | cut -d: -f2
```

### How the gate works
- The password is checked **server-side** (`/api/auth/verify`) — the secret never ships to the browser.
- On success a **session** is stored under a separate `portfolio-session` key with a **24h expiry**. "Remember me" keeps it in `localStorage`; unchecked, it uses `sessionStorage`.
- **Never** prefix the var with `NEXT_PUBLIC_` (that would ship it to every visitor), and never commit `.env.local` or put the password into the exported JSON.

> This is a lightweight **guardrail** — it stops accidental edits, not a determined attacker. For real auth, see Product A.

## Data & storage swap

The document is a plain JSON blob read/written through a small surface (`usePortfolioData`, import/export), so the storage engine can be swapped later (localStorage now → a KV/DB later) without touching any consumers. The document stores **URLs only**, never blobs. Images live in `public/` (committed) and can be uploaded via `/api/upload` on a persistent server — swap that handler's internals for S3/R2 later, consumers unchanged.

## Editing this project

See `AGENTS.md` for the architecture, conventions, and hard-won gotchas (including the `.env` `$`-mangling trap, the lint rules, and the storage-swap principle).

## Roadmap

- **Phase 3** — done: block editor, rich text (TipTap), media vault, blog, art-direction designs (default/cutie/editorial/riso).
- **Phase 4** — auth gate (configurable shortcut + password card + session). `4a`/`4b` shipped; `4c` docs here.
- **Phase 5** — hosted SaaS (Product A): accounts, real DB, dashboard, SEO, hub. (DB choice is deliberate research, not a commitment.)
- **Phase 6** — polish & cross-product: a11y, popover animations, drag previews, skeletons, focus audit, PWA.
