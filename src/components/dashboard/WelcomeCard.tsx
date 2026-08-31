'use client';

import Link from 'next/link';
import FirebaseLoginCard from '@/components/auth/FirebaseLoginCard';
import type { LoginResult } from '@/hooks/useAuth';
import { CARD } from './styles';

interface WelcomeCardProps {
  signInOpen: boolean;
  setSignInOpen: (v: boolean | ((open: boolean) => boolean)) => void;
  onLoginWithIdToken: (idToken: string) => Promise<LoginResult>;
}

export default function WelcomeCard({ signInOpen, setSignInOpen, onLoginWithIdToken }: WelcomeCardProps) {
  return (
    <section>
      <div className={`settle-in ${CARD}`}>
        <h1 className="font-mono text-xl font-semibold sm:text-2xl">
          ~/
          <span className="text-accent">overengineered-portfolio</span>
          <span className="caret-blink text-accent">▌</span>
        </h1>
        <p className="mt-2 text-sm opacity-60">
          A block-based, local-first portfolio CMS. Your entire portfolio is one JSON document — fork it, or host it here.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Product highlights">
          {['one JSON document', '4 art directions', 'self-host or hosted'].map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-[var(--border)] bg-background px-2.5 py-1 font-mono text-xs opacity-70"
            >
              {chip}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-expanded={signInOpen}
            onClick={() => setSignInOpen((open) => !open)}
            className="rounded-skin border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-background"
          >
            {signInOpen ? 'Hide sign-in' : 'Sign in to create yours'}
          </button>
          <a
            href="https://github.com/BluffingRay/overengineered-portfolio"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs opacity-40 hover:opacity-70"
          >
            fork it on GitHub ↗
          </a>
          <Link
            href="/playground"
            className="rounded-skin border border-accent/50 px-2.5 py-1 font-mono text-xs font-medium text-accent hover:bg-accent hover:text-background"
          >
            Try the demo ↗
          </Link>
        </div>
      </div>
      {signInOpen && (
        <div className="mt-3">
          <FirebaseLoginCard onLoginWithIdToken={onLoginWithIdToken} />
        </div>
      )}
    </section>
  );
}
