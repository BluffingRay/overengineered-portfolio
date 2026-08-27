'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  clearStoredSession,
  hasValidSession,
  writeStoredSession,
} from '@/lib/auth';

export type LoginResult = { ok: boolean; error?: string };

/**
 * Auth state for the Product B gate. `enabled` is whether any
 * `ADMIN_PASSWORD` is configured (loaded from the server); when it's off,
 * the gate is inactive and edit mode works as before. `authenticated` seeds
 * synchronously from the stored session — the same lazy-backed `useState`
 * pattern the skin override + last-tab use, so hydration reads real storage.
 * `allowEdit` reflects the `ALLOW_EDIT` env toggle (default true); when false
 * the site is read-only and the editor/shortcut are hidden.
 */
export function useAuth() {
  const [enabled, setEnabled] = useState(true);
  const [allowEdit, setAllowEdit] = useState(true);
  const [authenticated, setAuthenticated] = useState(() => hasValidSession());

  useEffect(() => {
    let active = true;
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data: { enabled?: unknown; allowEdit?: unknown }) => {
        if (!active) return;
        setEnabled(data.enabled === true);
        setAllowEdit(data.allowEdit !== false);
      })
      .catch(() => {
        // Leave `enabled`/`allowEdit` at their defaults (on) — fail toward
        // keeping edit available rather than locking the owner out.
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (password: string, remember: boolean): Promise<LoginResult> => {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const data: { ok?: unknown; token?: unknown; error?: unknown } =
          await res.json();
        if (res.ok && data.ok === true && typeof data.token === 'string') {
          writeStoredSession(data.token, remember);
          setAuthenticated(true);
          return { ok: true };
        }
        return {
          ok: false,
          error:
            data.error === 'invalid'
              ? 'Wrong password.'
              : 'Could not sign you in.',
        };
      } catch {
        return { ok: false, error: 'Network error — try again.' };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    clearStoredSession();
    setAuthenticated(false);
  }, []);

  return { enabled, authenticated, login, logout, allowEdit };
}
