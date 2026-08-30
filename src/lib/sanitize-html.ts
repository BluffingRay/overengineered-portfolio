import DOMPurify from 'isomorphic-dompurify';
import type { Config } from 'isomorphic-dompurify';
import type { PortfolioData } from '@/types/schema';

/**
 * FIX-A — server-side HTML sanitization for the hosted store.
 *
 * One seam: `PUT /api/portfolio` runs every HTML-bearing field through
 * `sanitizeRichHtml`/`sanitizeCustomHtml` AFTER `prepareDocument`
 * (shape) and BEFORE `kvPut` (persist). The store stays clean, so
 * exports, the seed, and `/u/<slug>` renders all inherit sanitized
 * HTML — no render-site sanitization to forget later.
 *
 * The allowlist matches what TipTap's editor serializes (see
 * RichTextEditor.tsx + ResizableImage.tsx + ClearFloat.ts), so a
 * legitimate editor document round-trips while scripts, event
 * handlers, dangerous URLs, and non-whitelisted CSS are stripped:
 * - Task lists:  `ul[data-type=taskList] > li[data-type=taskItem][data-checked]`
 *                > label > input[type=checkbox][checked][disabled]
 * - Images:      img[data-width][data-layout][style] (float/margin/width%)
 * - Clear float: p[data-clear=both]
 * - Highlight:   mark[data-color]
 * - Font size/color: span[style] (allowed properties only)
 * - Tables:      table/thead?/tbody/tr/th/td (+ data-colwidth,
 *                colspan/rowspan)
 * - Text align:  text-align inside style on headings/paragraphs
 *
 * DOMPurify does NOT filter CSS properties itself (a raw `style` attr
 * would let `position:fixed` through), so a module-level
 * `uponSanitizeAttribute` hook filters `style` declarations to the
 * properties TipTap emits and rejects `url()`/`expression()` values.
 * The hook is idempotent for concurrent sanitize calls (it only
 * rewrites the pending attribute payload), and this module is the
 * single place that configures DOMPurify — do not add hooks elsewhere.
 *
 * Product B (localStorage) intentionally does NOT sanitize on save —
 * own browser, own doc — but hosted reads (`GET /api/portfolio`,
 * `/u/[slug]`) still pass KV values through here, so a KV doc written
 * before this fix (or by API directly) is cleaned at read time too.
 */

const RICH_TEXT_TAGS = [
  'p', 'br',
  'h1', 'h2', 'h3',
  'strong', 'b', 'em', 'i', 'u', 's',
  'sub', 'sup',
  'blockquote', 'code', 'pre',
  'a',
  'img',
  'span',
  'mark',
  'ul', 'ol', 'li',
  'label', 'input',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
  'hr',
];

const RICH_TEXT_ATTRS = [
  'href',          // a — protocol-guarded by ALLOWED_URI_REGEXP
  'target',        // a (TipTap sets _blank)
  'rel',           // a (noopener noreferrer nofollow)
  'src',           // img — protocol-guarded by ALLOWED_URI_REGEXP
  'alt',           // img
  'title',         // img, a
  'style',         // property-filtered by the hook below
  'data-checked',  // task item
  'data-type',     // task list/task item
  'data-width',    // resizable image
  'data-layout',   // resizable image
  'data-clear',    // clear-float paragraph
  'data-color',    // highlight mark
  'data-colwidth', // table cell column widths
  'colspan',       // table cells
  'rowspan',
  'checked',       // task-item checkbox
  'disabled',      // task-item checkbox (static in view)
  'type',          // input[type=checkbox]
];

/** Inline styles TipTap emits — nothing positional, no url(), no behavior hooks. */
const ALLOWED_STYLE_PROPERTIES = new Set([
  'text-align',
  'font-size',
  'color',
  'background-color',
  'float',
  'margin',
  'margin-left',
  'margin-right',
  'margin-top',
  'margin-bottom',
  'width',
  'max-width',
  'display',
]);

const DANGEROUS_CSS_VALUE = /url\(|expression\(|javascript:|behavior\s*:|@import|-moz-binding/i;

/**
 * Style policies: `rich` = property allowlist (TipTap-emitted only);
 * `custom` = any property, but dangerous VALUES are still blocked —
 * custom_html exists for pasted markup and legitimately uses richer
 * CSS (letter-spacing, text-transform, even sticky positioning), while
 * url()/expression()/@import are the actual injection vectors.
 */
type StylePolicy = 'rich' | 'custom';
let currentStylePolicy: StylePolicy = 'rich';

function filterStyleValue(attrValue: string, policy: StylePolicy): string | null {
  const rawDecls = attrValue.split(';');
  const kept: string[] = [];
  for (const raw of rawDecls) {
    const decl = raw.trim();
    if (!decl) continue;
    const idx = decl.indexOf(':');
    if (idx < 1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (policy === 'rich' && !ALLOWED_STYLE_PROPERTIES.has(prop)) continue;
    if (!value || DANGEROUS_CSS_VALUE.test(value)) continue;
    kept.push(decl); // raw text — no reformatting
  }
  if (kept.length === 0) return null; // drop the attribute entirely
  // Nothing was removed and nothing re-added → keep the ORIGINAL string
  // byte-for-byte so clean documents round-trip with zero churn.
  if (kept.length === rawDecls.filter((d) => d.trim() !== '').length) return attrValue;
  return kept.join(';');
}

const CONFIG: Config = {
  ALLOWED_TAGS: RICH_TEXT_TAGS,
  ALLOWED_ATTR: RICH_TEXT_ATTRS,
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'style', 'link', 'meta', 'base'],
  FORBID_ATTR: ['srcset', 'formaction', 'ping', 'is', 'slot'],
  // http(s), mailto, tel, relative, fragment — no javascript:, no data:.
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

/**
 * custom_html allowlist: everything the rich editor emits PLUS the
 * structural tags pasted markup legitimately uses. Scripts, forms,
 * object/embed stay forbidden. iframes are allowed ONLY for the scoped
 * video-embed hosts (see EMBED_HOSTS) — enforced by the element hook,
 * which removes any iframe whose src isn't an approved embed URL.
 */
const CUSTOM_EXTRA_TAGS = [
  'div', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
  'figure', 'figcaption', 'picture', 'source',
  'details', 'summary', 'dialog',
  'video', 'audio',
  'iframe',
  'caption',
  'font',
  'center',
];

/** Presentation attrs for native video/audio/source + iframe geometry. */
const CUSTOM_EXTRA_ATTRS = [
  'controls', 'poster', 'preload', 'autoplay', 'muted', 'loop', 'playsinline',
  'allow', 'allowfullscreen', 'referrerpolicy',
];

/**
 * Video-embed hosts permitted in iframes — embed/player endpoints only,
 * never the main site (youtube.com/watch would show the whole site UI
 * and is also the most-abused URL shape). Add hosts here as needed;
 * everything else gets the iframe dropped.
 */
const EMBED_HOSTS: readonly string[] = [
  'www.youtube.com', 'youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com',
  'player.vimeo.com',
  'streamable.com',
  'www.dailymotion.com',
];

function isAllowedEmbedUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    if (!(url.pathname.startsWith('/embed/') || url.pathname.startsWith('/video/') || url.pathname.startsWith('/e/'))) return false;
    return EMBED_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

const CUSTOM_CONFIG: Config = {
  ...CONFIG,
  ALLOWED_TAGS: [...RICH_TEXT_TAGS, ...CUSTOM_EXTRA_TAGS],
  // iframe moves from FORBID to ALLOWED here — but ONLY embed-host srcs
  // survive (element hook). FORBID_TAGS wins over ALLOWED_TAGS, so the
  // base list must be filtered, not just appended to.
  FORBID_TAGS: CONFIG.FORBID_TAGS!.filter((tag) => tag !== 'iframe'),
  // `class` survives for Tailwind utilities — classes can't execute
  // (JIT ships only compiled utilities) and style tags are FORBIDden.
  ALLOWED_ATTR: [...RICH_TEXT_ATTRS, 'class', 'id', ...CUSTOM_EXTRA_ATTRS],
};

let hooksInstalled = false;
function installHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName !== 'style') return;
    const filtered = filterStyleValue(String(data.attrValue ?? ''), currentStylePolicy);
    if (filtered === null) {
      data.keepAttr = false; // every declaration rejected — drop the attribute
    } else {
      data.attrValue = filtered;
    }
  });
  // Video-embed iframe scoping (custom_html only — rich text doesn't
  // allow the iframe tag at all, so this hook is a no-op there).
  // An iframe src outside the embed hosts gets the WHOLE element
  // dropped via the documented hook-detach pattern (node.remove()):
  // keeping a src-less iframe renders a dead box.
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (currentStylePolicy !== 'custom') return;
    if (data.tagName !== 'iframe') return;
    const el = node as Element;
    const src = el.getAttribute('src') ?? '';
    if (isAllowedEmbedUrl(src)) return;
    el.remove();
  });
}

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/|#)/i;

/** Allow http(s)/mailto/tel/root-relative/#anchor URLs only. */
export function isSafeUrl(value: string): boolean {
  return SAFE_URL.test(value.trim());
}

/**
 * Sanitize editor-authored rich HTML (rich_text.content, posts[].content).
 * Returns the cleaned HTML, or '<p></p>' for empty input so every
 * content field stays a parseable non-null string.
 */
export function sanitizeRichHtml(html: string | undefined | null): string {
  installHooks();
  if (typeof html !== 'string' || html.trim() === '') return '<p></p>';
  currentStylePolicy = 'rich';
  const clean = DOMPurify.sanitize(html, CONFIG) as unknown as string;
  currentStylePolicy = 'rich'; // reset for safety (no concurrent callers)
  return clean.trim() === '' ? '<p></p>' : clean;
}

/**
 * Sanitize custom_html blocks. Same allowlist as rich text — the block
 * exists to paste arbitrary *markup*, not to smuggle scripts. Scripts
 * pasted here today are silently dropped on save (and at hosted reads).
 */
export function sanitizeCustomHtml(html: string | undefined | null): string {
  installHooks();
  if (typeof html !== 'string' || html.trim() === '') return '';
  // Wider CSS policy: any property, but url()/expression()/@import values
  // still blocked — pasted markup legitimately uses rich CSS.
  currentStylePolicy = 'custom';
  const clean = DOMPurify.sanitize(html, CUSTOM_CONFIG) as unknown as string;
  currentStylePolicy = 'rich';
  return clean;
}

/**
 * Sanitize a full PortfolioData document in place. Runs AFTER
 * prepareDocument (shape guarantees hold), BEFORE kvPut (hosted) —
 * and again on hosted reads, so legacy KV values are covered too.
 * Returns the same object with HTML fields cleaned.
 */
export function sanitizePortfolioDocument(doc: PortfolioData): PortfolioData {
  // Blocks: rich_text content, custom_html html, unsafe hero URLs
  for (const tab of doc.tabs) {
    for (const block of tab.blocks) {
      if (block.type === 'rich_text') {
        block.content = sanitizeRichHtml(block.content);
      } else if (block.type === 'custom_html') {
        block.html = sanitizeCustomHtml(block.html);
      } else if (block.type === 'featured_hero') {
        // ctaHref is required by the schema but renderers treat '' as
        // "no CTA" — neutralize unsafe values to '' instead of deleting.
        if (block.ctaHref && !isSafeUrl(block.ctaHref)) block.ctaHref = '';
        if (block.secondaryAction && !isSafeUrl(block.secondaryAction.url)) {
          block.secondaryAction = undefined;
        }
      } else if (block.type === 'entry_list') {
        // Entry links render as anchors on the title — an unsafe scheme
        // loses the field entirely (absent, never null).
        for (const entry of block.entries) {
          if (entry.link && !isSafeUrl(entry.link)) delete entry.link;
        }
      }
    }
  }
  // Posts
  for (const post of doc.posts ?? []) {
    post.content = sanitizeRichHtml(post.content);
  }
  // Card URLs rendered into anchors — strip javascript: etc. `href` is
  // required by the schema (an empty string means "no link"), optional
  // extras are unset so they serialize to absent, never null.
  for (const card of doc.cards) {
    if (card.href && !isSafeUrl(card.href)) card.href = '';
    for (const key of ['demoUrl', 'githubUrl', 'customUrl'] as const) {
      const value = card[key];
      if (typeof value === 'string' && value !== '' && !isSafeUrl(value)) {
        delete card[key];
      }
    }
  }
  // Social URLs
  for (const social of doc.socials ?? []) {
    if (!isSafeUrl(social.url)) social.url = '#';
  }
  return doc;
}
