/**
 * Phase 4b — session helpers for the Product B auth gate.
 *
 * A lightweight, client-side session. This is a GUARDRAIL, not real auth:
 * the whole thing lives in the browser and is trivially bypassable by
 * anyone who sets the key — which is the accepted tradeoff (see AGENTS.md).
 * The one real win is that the password/compare happens server-side
 * (`/api/auth/verify`), so the secret never ships to the client.
 *
 * Storage principle (matches the document + skin override): the session is
 * a separate key, NEVER part of the portfolio document, never in undo
 * history, never exported/imported.
 *
 * TTL: 24h. "Remember me" picks the store: localStorage (persists across
 * tabs & reloads) vs sessionStorage (dies with the tab).
 */

export const SESSION_KEY = 'portfolio-session';

/** 24 hours, in milliseconds. */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type StoredSession = {
  /** Opaque token issued by /api/auth/verify (not signed — cosmetic). */
  token: string;
  /** Epoch ms when the session expires. */
  exp: number;
};

function safeParse(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as StoredSession).token === 'string' &&
      typeof (parsed as StoredSession).exp === 'number'
    ) {
      return { token: (parsed as StoredSession).token, exp: (parsed as StoredSession).exp };
    }
  } catch {
    // Corrupt — ignore.
  }
  return null;
}

/** Read a non-expired session from whichever store holds it. */
export function readStoredSession(): StoredSession | null {
  try {
    const session =
      safeParse(window.localStorage.getItem(SESSION_KEY)) ??
      safeParse(window.sessionStorage.getItem(SESSION_KEY));
    return session && session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function hasValidSession(): boolean {
  return readStoredSession() !== null;
}

/** Write a fresh session. `remember` → localStorage; else sessionStorage. */
export function writeStoredSession(token: string, remember: boolean): StoredSession {
  const session: StoredSession = { token, exp: Date.now() + SESSION_TTL_MS };
  const serialized = JSON.stringify(session);
  try {
    if (remember) {
      window.localStorage.setItem(SESSION_KEY, serialized);
      window.sessionStorage.removeItem(SESSION_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_KEY, serialized);
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Storage unavailable — session just won't persist this tab.
  }
  return session;
}

export function clearStoredSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
