'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  clearStoredSession,
  hasValidSession,
  writeStoredSession,
} from '@/lib/auth';

export type LoginResult = { ok: boolean; error?: string };

/**
 * Auth state for both shells:
 * - Product B (self-host): ADMIN_PASSWORD gate via /api/auth/status + localStorage session
 * - Product A (hosted): Firebase session cookie via /api/auth/session (HttpOnly)
 * `hosted` (from the same status endpoint) decides which gate applies:
 * hosted mode ALWAYS requires the Firebase cookie for editing — the B
 * password gate and its (unsigned, bypassable) localStorage session are
 * meaningless there. Without the flag (Product B default), behavior is
 * exactly the Phase 4b gate as before.
 */
export function useAuth() {
  const [enabled, setEnabled] = useState(true);
  const [allowEdit, setAllowEdit] = useState(true);
  const [hosted, setHosted] = useState(false);
  // Status fetch resolved? Login-card picking waits on this so the B
  // password card and the A account card never flash in the wrong mode.
  const [hostedLoaded, setHostedLoaded] = useState(false);
  // Session-cookie fetch resolved? `hosted` (status fetch) resolves BEFORE
  // the cookie check does — gating the login card on hostedLoaded alone
  // still flashed it for signed-in hosted users during that gap.
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [bAuthenticated, setBAuthenticated] = useState(() => hasValidSession());
  const [firebaseAuthenticated, setFirebaseAuthenticated] = useState(false);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [firebaseEmail, setFirebaseEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data: { enabled?: unknown; allowEdit?: unknown; hosted?: unknown }) => {
        if (!active) return;
        setEnabled(data.enabled === true);
        setAllowEdit(data.allowEdit !== false);
        setHosted(data.hosted === true);
        setHostedLoaded(true);
      })
      .catch(() => {
        if (active) setHostedLoaded(true);
      });
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data: { authenticated?: unknown; uid?: unknown; email?: unknown }) => {
        if (!active) return;
        const authed = data.authenticated === true && typeof data.uid === 'string';
        setFirebaseAuthenticated(authed);
        setFirebaseUid(authed && typeof data.uid === 'string' ? data.uid : null);
        setFirebaseEmail(typeof data.email === 'string' ? data.email : null);
      })
      .catch(() => {
        if (!active) return;
        setFirebaseAuthenticated(false);
      })
      .finally(() => {
        if (active) setSessionLoaded(true);
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
          setBAuthenticated(true);
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

  const loginWithIdToken = useCallback(async (idToken: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data: { ok?: unknown; error?: unknown } = await res.json().catch(() => ({}));
      if (res.ok && data.ok === true) {
        setFirebaseAuthenticated(true);
        const status = await fetch('/api/auth/session').then((r) => r.json()).catch(() => ({}));
        if (status.authenticated === true && typeof status.uid === 'string') {
          setFirebaseUid(status.uid);
          setFirebaseEmail(typeof status.email === 'string' ? status.email : null);
        }
        return { ok: true };
      }
      return { ok: false, error: typeof data.error === 'string' ? data.error : 'Could not sign you in.' };
    } catch {
      return { ok: false, error: 'Network error — try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    clearStoredSession();
    setBAuthenticated(false);
    try {
      const res = await fetch('/api/auth/session', { method: 'DELETE' });
      // Reflect only after the server confirms (the rule this hook cites).
      if (res.ok) {
        setFirebaseAuthenticated(false);
        setFirebaseUid(null);
        setFirebaseEmail(null);
      }
    } catch {
      // Server unreachable — keep Firebase state (may still be signed in
      // server-side); B session is already cleared above.
    }
  }, []);

  // Combined gate. Hosted mode: ONLY the Firebase cookie counts (the B
  // localStorage token is not an identity source there). B mode: the
  // password gate as before. `enabled` here means "some gate applies":
  // hosted mode always applies one.
  const gated = hosted || enabled;
  const authenticated = hosted
    ? firebaseAuthenticated
    : !gated || bAuthenticated;

  // Both auth checks settled — the login card must wait for THIS. The
  // status fetch (`hosted`) resolves before the cookie check does, and a
  // card gated only on hostedLoaded flashes for signed-in hosted users.
  const authReady = hostedLoaded && sessionLoaded;

  return {
    enabled,
    hosted,
    hostedLoaded,
    authReady,
    gated,
    authenticated,
    login,
    loginWithIdToken,
    logout,
    allowEdit,
    firebaseAuthenticated,
    firebaseUid,
    firebaseEmail,
  };
}
