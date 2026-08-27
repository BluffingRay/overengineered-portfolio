'use client';

import { useState, type FormEvent } from 'react';
import type { LoginResult } from '@/hooks/useAuth';

/**
 * Centered, branded card prompting for the single admin password.
 * Everything here is presentational — the password goes to the server via
 * `onLogin`, which returns whether it was accepted. A successful login is
 * reflected by the parent's auth state flipping, which unmounts this card
 * (the editor then appears), so this component only ever shows an error.
 */
export default function LoginCard({
  onLogin,
}: {
  onLogin: (password: string, remember: boolean) => Promise<LoginResult>;
}) {
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !password) return;
    setSubmitting(true);
    setError(null);
    const result = await onLogin(password, remember);
    if (!result.ok) setError(result.error ?? 'Could not sign you in.');
    setSubmitting(false);
  }

  return (
    <div className="mx-auto w-full max-w-xs pt-10">
      <form
        onSubmit={handleSubmit}
        className="settle-in space-y-3 rounded-skin border border-[var(--border)] bg-surface p-5 text-foreground"
      >
        <div className="text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-skin bg-accent text-background"
          >
            ✦
          </div>
          <h2 className="text-sm font-semibold">Admin access</h2>
          <p className="mt-0.5 text-[11px] opacity-60">
            Enter the password to edit this site.
          </p>
        </div>

        <label className="block">
          <span className="mb-0.5 block text-[11px] font-medium opacity-70">
            Password
          </span>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-skin border border-[var(--border)] bg-background px-2 py-1 text-sm"
            placeholder="••••••••"
          />
        </label>

        <label className="flex items-center gap-1.5 text-[11px] opacity-70">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="accent-[var(--accent)]"
          />
          Remember me for 24h
        </label>

        {error && (
          <p className="text-[11px] font-medium text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full rounded-skin border border-accent bg-accent px-2 py-1.5 text-sm font-medium text-background disabled:pointer-events-none disabled:opacity-40"
        >
          {submitting ? 'Checking…' : 'Unlock'}
        </button>

        <p className="text-center text-[10px] opacity-40">
          A lightweight guard — not a security boundary.
        </p>
      </form>
    </div>
  );
}
