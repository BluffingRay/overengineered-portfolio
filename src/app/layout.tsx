import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { buildPortfolioMetadata } from "@/lib/metadata";
import { initialData } from "@/data/initialData";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 5d-a — base metadata composed from the committed Product B doc
// (content/portfolio.json, baked at build time via initialData): the root /
// portfolio page inherits the real title/description/OG. The consequence is
// the design: in hosted mode the seed name can only appear on routes
// without their own metadata — /blog, /write, /dashboard, /onboarding and
// /u/<slug> all carry explicit overrides (5d-a spec).
const docMeta = buildPortfolioMetadata(initialData);

export const metadata: Metadata = {
  // Canonical base for URL-bearing tags. NEXT_PUBLIC_SITE_URL (see
  // .env.example) wins when set — `||` (not `??`) so the set-but-empty
  // template line falls back instead of crashing `new URL('')` at boot;
  // localhost keeps dev working.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  ...docMeta,
  // default = child routes without their own title; template = their suffix
  // (absolute child titles ignore it).
  title: {
    default: docMeta.title,
    template: `%s · ${docMeta.title}`,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Runs synchronously before the body paints: pulls the saved document
  // straight from localStorage and applies skin/accent/font/view-scale to
  // <html>, so even the first frame already wears the visitor's theme (no
  // HUD flash). A persisted visitor skin override (SkinSwitcher pick, incl.
  // 'auto') wins over the document's official default — and survives
  // navigation to the standalone /write and /blog routes. The view scale
  // (admin default + visitor override) applies on desktop widths only.
  // Skipped entirely: /u/<slug> (the hosted public render is doc-
  // deterministic — its wrapper applies the doc's own theme + scale, and
  // zoom cannot be subtree-overridden the way tokens can) and the admin
  // surfaces /dashboard + /onboarding (fixed neutral admin chrome — the
  // visitor's B-localStorage theme must never leak into app chrome).
  const prePaintTheme = `
    try {
      var el = document.documentElement;
      if (
        location.pathname.lastIndexOf('/u/', 0) === 0 ||
        location.pathname.lastIndexOf('/dashboard', 0) === 0 ||
        location.pathname.lastIndexOf('/onboarding', 0) === 0
      ) {
        // /u/<slug> — doc-deterministic; /dashboard + /onboarding — fixed
        // admin chrome. B keys must not leak onto either.
      } else {
        var d = JSON.parse(localStorage.getItem('portfolio-data') || 'null');
        var t = (d && typeof d === 'object' && d.theme) || {};
        var locked = t.lockSkin === true;
        var over = locked ? null : localStorage.getItem('portfolio-skin-override');
        var skins = ['hud', 'notebook', 'clean'];
        if (over === 'auto') {
          over = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'hud'
            : 'clean';
        }
        if (!locked && skins.includes(over)) {
          el.dataset.skin = over;
        } else if (d && typeof d === 'object' && d.skin) {
          el.dataset.skin = d.skin;
        }
        if (t.accentColor) el.style.setProperty('--accent', t.accentColor);
        if (t.fontFamily) {
          el.style.setProperty('--font', t.fontFamily);
          el.style.setProperty('--font-custom', t.fontFamily);
        }
        var scaleOverride = parseFloat(localStorage.getItem('portfolio-view-scale-override'));
        var viewScale = isFinite(scaleOverride)
          ? scaleOverride
          : (typeof t.viewScale === 'number' ? t.viewScale : 1);
        if (viewScale !== 1 && window.matchMedia('(min-width: 768px)').matches) {
          el.style.zoom = String(Math.min(1.2, Math.max(0.8, viewScale)));
        }
      }
    } catch (e) {}
  `;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: prePaintTheme }} />
        {children}
      </body>
    </html>
  );
}
