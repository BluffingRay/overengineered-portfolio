'use client';

import dynamic from 'next/dynamic';
import type { FirebaseLoginFormProps } from './FirebaseLoginForm';

/**
 * FirebaseLoginCard (Product A shell) — SDK-free host for the real form.
 *
 * FIX-G: the firebase SDK used to ride into every Product B bundle through
 * this component's static import. The SDK-backed form now lives in
 * FirebaseLoginForm and loads via next/dynamic ONLY when a hosted login
 * surface renders it. The dynamic import sits behind a BUILD-TIME gate on
 * the inlined NEXT_PUBLIC_FIREBASE_* keys (same trio getFirebaseConfig()
 * requires — keep in sync): in a Product B build the branch folds false and
 * no firebase chunk is emitted at all. The RUNTIME gate — the server's
 * hosted flag (auth.hosted) — still decides whether the card ever renders;
 * client env presence alone must never activate Product A UI (see
 * PortfolioView).
 */

const FirebaseLoginForm =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ? dynamic(() => import('./FirebaseLoginForm'), { ssr: false })
    : null;

/** Hosted mode without client Firebase config (deploy misconfig) — the same "not set up" card the form itself shows. */
function SignInNotConfigured() {
  return (
    <div className="mx-auto w-full max-w-xs pt-10">
      <div className="rounded-skin border border-[var(--border)] bg-surface p-5 text-center">
        <p className="text-sm font-medium">Sign-in isn&apos;t set up on this site</p>
        <p className="mt-1 text-xs opacity-60">The site owner needs to connect an account provider first.</p>
      </div>
    </div>
  );
}

export default function FirebaseLoginCard(props: FirebaseLoginFormProps) {
  if (!FirebaseLoginForm) return <SignInNotConfigured />;
  return <FirebaseLoginForm {...props} />;
}
