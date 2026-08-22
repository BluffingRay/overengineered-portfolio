'use client';

import { usePortfolioData } from '@/hooks/usePortfolioData';
import { THEME_SKINS } from '@/types/schema';
import type { ThemeSkin } from '@/types/schema';

const SKIN_LABELS: Record<ThemeSkin, string> = {
  hud: 'HUD',
  notebook: 'Notebook',
  clean: 'Clean',
};

export default function SkinSwitcher() {
  const { data, mutate } = usePortfolioData();

  return (
    <div
      role="group"
      aria-label="Theme skin"
      className="inline-flex rounded-skin border border-[var(--border)] bg-surface p-1"
    >
      {THEME_SKINS.map((skin) => {
        const isActive = data.skin === skin;

        return (
          <button
            key={skin}
            type="button"
            aria-pressed={isActive}
            onClick={() =>
              mutate((current) => ({ ...current, skin }))
            }
            className={`rounded-skin px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-accent text-background'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            {SKIN_LABELS[skin]}
          </button>
        );
      })}
    </div>
  );
}
