/**
 * Phase 4a — configurable edit-mode shortcut.
 *
 * A single, self-contained owner of how the admin toggles edit mode is
 * represented, matched, stored, and displayed. Deliberately plain TS (no
 * React) so both PortfolioView (the keydown listener) and GlobalSettings
 * (the capture control) can share it without duplicating the logic.
 *
 * Storage principle (matches the skin override): this is a *preference*,
 * NOT document data. It lives in its own localStorage key and is never
 * written into the portfolio document, never enters undo history, and
 * never triggers a schema version bump / migration.
 *
 * `mod` means "Ctrl OR Cmd" — platform-agnostic, and exactly what the
 * existing handler already uses (`event.ctrlKey || event.metaKey`), so the
 * default `Ctrl/Cmd + Shift + E` behaves identically on every OS.
 */

export const EDIT_SHORTCUT_KEY = 'portfolio-edit-shortcut';

export type Modifier = 'mod' | 'shift' | 'alt';
export type EditShortcut = {
  mods: Modifier[];
  /** event.key, normalized (lower-cased); see normalizeKey. */
  key: string;
};

/** The shipped default — what every existing install already uses. */
export const DEFAULT_SHORTCUT: EditShortcut = { mods: ['mod', 'shift'], key: 'e' };

const MODS: Modifier[] = ['mod', 'shift', 'alt'];

/** Keys that are themselves modifiers — never a valid shortcut key. */
const MODIFIER_KEYS = new Set([
  'shift',
  'control',
  'meta',
  'alt',
  'capslock',
  'numlock',
]);

/**
 * Undo/redo chords we must not let the edit toggle steal, or Ctrl/Cmd+Z
 * stops undoing. Compared as exact modifier-set + key matches.
 */
const RESERVED_CHORDS: EditShortcut[] = [
  { mods: ['mod'], key: 'z' },
  { mods: ['mod', 'shift'], key: 'z' },
  { mods: ['mod'], key: 'y' },
];

function normalizeKey(key: string): string {
  // Lower-casing is lossless for the keys we care about ('E'→'e',
  // 'Enter'→'enter', '+','.', ' ' all unchanged) and keeps matching
  // independent of Shift.
  return key.toLowerCase();
}

/**
 * True when the event's key is itself a modifier (Shift/Control/Meta/…).
 * The capture control uses this to wait for the *actual* key of a chord
 * instead of stopping on the first modifier press.
 */
export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(normalizeKey(key));
}

function modsEqual(a: Modifier[], b: Modifier[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((m) => set.has(m));
}

/** Build a shortcut from a real (non-modifier) keydown. */
export function shortcutFromEvent(event: KeyboardEvent): EditShortcut {
  const mods: Modifier[] = [];
  if (event.ctrlKey || event.metaKey) mods.push('mod');
  if (event.altKey) mods.push('alt');
  if (event.shiftKey) mods.push('shift');
  return { mods, key: normalizeKey(event.key) };
}

/** True when the event triggers the given shortcut. */
export function shortcutMatches(event: KeyboardEvent, sc: EditShortcut): boolean {
  const held: Record<Modifier, boolean> = {
    mod: event.ctrlKey || event.metaKey,
    shift: event.shiftKey,
    alt: event.altKey,
  };
  if (normalizeKey(event.key) !== sc.key) return false;
  const required = new Set(sc.mods);
  // Exact match: the required modifiers are held AND no unlisted one is.
  for (const mod of MODS) {
    if (required.has(mod) ? !held[mod] : held[mod]) return false;
  }
  return true;
}

/**
 * Returns an error string when the shortcut is unusable, else null.
 * Rules: a real key (not a modifier), at least one primary modifier
 * (`mod` or `alt`) so we never hijack plain typing or Shift+letter, and
 * never the reserved undo/redo chords.
 */
export function validateShortcut(sc: EditShortcut): string | null {
  if (!sc.key) return 'Press a key.';
  if (MODIFIER_KEYS.has(sc.key)) return 'Pick a non-modifier key.';
  if (!sc.mods.includes('mod') && !sc.mods.includes('alt')) {
    return 'Include Ctrl/Cmd or Alt.';
  }
  if (
    RESERVED_CHORDS.some(
      (r) => modsEqual(r.mods, sc.mods) && r.key === sc.key,
    )
  ) {
    return 'Reserved — that combo is undo/redo.';
  }
  return null;
}

export function isEditShortcut(x: unknown): x is EditShortcut {
  if (!x || typeof x !== 'object') return false;
  const c = x as { mods?: unknown; key?: unknown };
  if (typeof c.key !== 'string' || !Array.isArray(c.mods)) return false;
  return c.mods.every((m) => m === 'mod' || m === 'shift' || m === 'alt');
}

export function serializeShortcut(sc: EditShortcut): string {
  return JSON.stringify(sc);
}

export function parseShortcut(raw: string): EditShortcut | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isEditShortcut(parsed)) return null;
    return { mods: [...parsed.mods], key: normalizeKey(parsed.key) };
  } catch {
    return null;
  }
}

const isMac = () =>
  typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);

function keyLabel(key: string): string {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function formatShortcut(sc: EditShortcut): string {
  const mac = isMac();
  const parts: string[] = [];
  if (mac) {
    if (sc.mods.includes('mod')) parts.push('⌘');
    if (sc.mods.includes('alt')) parts.push('⌥');
    if (sc.mods.includes('shift')) parts.push('⇧');
  } else {
    if (sc.mods.includes('mod')) parts.push('Ctrl');
    if (sc.mods.includes('alt')) parts.push('Alt');
    if (sc.mods.includes('shift')) parts.push('Shift');
  }
  parts.push(keyLabel(sc.key));
  return mac ? parts.join('') : parts.join('+');
}

export function readStoredShortcut(): EditShortcut {
  try {
    const raw = window.localStorage.getItem(EDIT_SHORTCUT_KEY);
    if (raw) {
      const parsed = parseShortcut(raw);
      if (parsed && validateShortcut(parsed) === null) return parsed;
    }
  } catch {
    // localStorage unavailable (private mode) — fall through to default.
  }
  return DEFAULT_SHORTCUT;
}

export function writeStoredShortcut(sc: EditShortcut): void {
  try {
    window.localStorage.setItem(EDIT_SHORTCUT_KEY, serializeShortcut(sc));
  } catch {
    // Persist is best-effort; the in-memory state still applies this session.
  }
}
