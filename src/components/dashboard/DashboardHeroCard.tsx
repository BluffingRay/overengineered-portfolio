'use client';

import Link from 'next/link';
import { ACTION_BTN, CARD } from './styles';

interface DashboardHeroCardProps {
  heroTitle: string | null;
  heroTitleReady: boolean;
  slug: string | null;
  visibility: 'private' | 'public';
  showcase: boolean;
  copied: boolean;
  settingsOpen: boolean;
  justSaved: boolean;
  onCopyShareLink: (slug: string) => void;
  onToggleSettings: () => void;
}

export default function DashboardHeroCard({
  heroTitle,
  heroTitleReady,
  slug,
  visibility,
  showcase,
  copied,
  settingsOpen,
  justSaved,
  onCopyShareLink,
  onToggleSettings,
}: DashboardHeroCardProps) {
  return (
    <div className={`settle-in mt-3 ${CARD}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">
            {heroTitleReady ? heroTitle : <span className="opacity-40">…</span>}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {slug ? (
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono">
                /u/{slug}
              </span>
            ) : (
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 opacity-60">
                No link yet — claim it in onboarding
              </span>
            )}
            <span
              className={`rounded-full border px-2 py-0.5 ${
                visibility === 'public'
                  ? 'border-accent/40 text-accent'
                  : 'border-[var(--border)] opacity-60'
              }`}
            >
              {visibility === 'public' ? 'Public' : 'Private'}
            </span>
            {showcase && (
              <span className="rounded-full border border-accent/40 px-2 py-0.5 text-accent">
                In showcase
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/?edit=true"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-skin border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-background"
          >
            Edit
          </Link>
          {slug ? (
            <Link
              href={`/u/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={ACTION_BTN}
            >
              View
            </Link>
          ) : (
            <button type="button" disabled title="Claim your link in onboarding first" className={ACTION_BTN}>
              View
            </button>
          )}
          <button
            type="button"
            disabled={!slug}
            title={slug ? 'Copy the public link' : 'Claim your link in onboarding first'}
            onClick={() => {
              if (slug) onCopyShareLink(slug);
            }}
            className={ACTION_BTN}
          >
            {copied ? 'Copied' : 'Copy share link'}
          </button>
          <button type="button" onClick={onToggleSettings} className={ACTION_BTN}>
            {settingsOpen ? 'Close' : justSaved ? 'Saved' : 'Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
