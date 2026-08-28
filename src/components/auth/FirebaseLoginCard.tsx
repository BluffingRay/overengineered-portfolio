'use client';

import { useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider, isFirebaseConfigured } from '@/lib/firebase/client';
import type { LoginResult } from '@/hooks/useAuth';

/** Firebase error codes -> plain language. Raw SDK messages are developer-speak. */
function humanizeFirebaseError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const known: Record<string, string> = {
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'No account with that email yet — sign up instead?',
    'auth/email-already-in-use': 'That email already has an account. Try signing in.',
    'auth/weak-password': 'Password is too weak — use at least 6 characters.',
    'auth/invalid-email': 'That email address does not look right.',
    'auth/too-many-requests': 'Too many attempts — wait a moment and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
    'auth/network-request-failed': 'Network problem — check your connection and try again.',
    'auth/operation-not-allowed': 'This sign-in method is turned off. Contact the site owner.',
  };
  if (code && known[code]) return known[code];
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}

export default function FirebaseLoginCard({
  onLoginWithIdToken,
}: {
  onLoginWithIdToken: (idToken: string) => Promise<LoginResult>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [submitting, setSubmitting] = useState(false);

  const configured = isFirebaseConfigured();

  async function handleIdToken(idToken: string) {
    const result = await onLoginWithIdToken(idToken);
    if (!result.ok) setError(result.error ?? 'Could not sign you in.');
    return result.ok;
  }

  async function handleGoogle(withDrive = false) {
    if (!configured) {
      setError('Firebase not configured.');
      return;
    }
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase not configured');
      const provider = getGoogleProvider(withDrive);
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();
      await handleIdToken(idToken);
    } catch (e) {
      setError(humanizeFirebaseError(e));
    }
    setSubmitting(false);
  }

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !email || !password) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase not configured');
      let user;
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        user = cred.user;
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
      }
      const idToken = await user.getIdToken();
      await handleIdToken(idToken);
    } catch (e) {
      setError(humanizeFirebaseError(e));
    }
    setSubmitting(false);
  }

  async function handleReset() {
    if (!email) {
      setError('Enter your email first.');
      return;
    }
    setError(null);
    setInfo(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase not configured');
      await sendPasswordResetEmail(auth, email);
      setInfo('Check your inbox (and spam folder) — we sent a link to reset your password.');
    } catch (e) {
      setError(humanizeFirebaseError(e));
    }
  }

  if (!configured) {
    return (
      <div className="mx-auto w-full max-w-xs pt-10">
        <div className="rounded-skin border border-[var(--border)] bg-surface p-5 text-center">
          <p className="text-sm font-medium">Sign-in isn't set up on this site</p>
          <p className="mt-1 text-xs opacity-60">The site owner needs to connect an account provider first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md pt-10">
      <div className="settle-in space-y-4 rounded-skin border border-[var(--border)] bg-surface p-5 text-foreground">
        <div className="text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-skin bg-accent text-background"
          >
            ✦
          </div>
          <h2 className="text-sm font-semibold">Sign in to edit your portfolio</h2>
          <p className="mt-0.5 text-[11px] opacity-60">
            {mode === 'signup' ? 'Create a free account — it takes a minute.' : 'Use the account that owns this portfolio.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleGoogle(false)}
          disabled={submitting}
          className="w-full rounded-skin border border-[var(--border)] bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-background disabled:opacity-40"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-2 text-[10px] opacity-40">
          <span className="h-px flex-1 bg-[var(--border)]" />
          or
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-medium opacity-70">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-skin border border-[var(--border)] bg-background px-2 py-1.5 text-sm"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-medium opacity-70">Password</span>
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-skin border border-[var(--border)] bg-background px-2 py-1.5 text-sm"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}
          {info && <p className="text-[11px] font-medium text-emerald-600">{info}</p>}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="w-full rounded-skin border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-background disabled:opacity-40"
          >
            {submitting ? 'One moment…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          <div className="flex items-center justify-between text-[11px]">
            <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="opacity-60 hover:opacity-100">
              {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </button>
            <button type="button" onClick={handleReset} className="opacity-60 hover:opacity-100">
              Forgot password?
            </button>
          </div>
        </form>

        <p className="text-center text-[10px] opacity-40">Your password is never stored on this site — accounts are managed securely.</p>
      </div>
    </div>
  );
}
