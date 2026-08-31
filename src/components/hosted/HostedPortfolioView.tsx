'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import type { PortfolioData } from '@/types/schema';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import SiteFooter from '@/components/ui/SiteFooter';
import SkinSwitcher from '@/components/SkinSwitcher';
import ViewScaleControl from '@/components/ViewScaleControl';
import FloatingPage from '@/components/FloatingPage';
import BlogSite from '@/components/blog/BlogSite';
import { usePortfolioShell } from '@/hooks/usePortfolioShell';
import PortfolioChrome from '@/components/PortfolioChrome';
import { clampViewScale } from '@/types/schema';

interface Props {
  doc: PortfolioData;
  slug: string;
  activeTabId: string;
}

export default function HostedPortfolioView({ doc, slug, activeTabId }: Props) {
  const shell = usePortfolioShell({
    tabs: doc.tabs,
    docSkin: doc.skin,
    docTheme: doc.theme,
    initialActiveTabId: activeTabId,
    usePushState: true,
    slug,
    ephemeralTheme: true,
    posts: doc.posts,
  });

  const [overlayPostId, setOverlayPostId] = useState<string | null>(null);

  const activeTab = shell.activeTab;
  const activeIndex = shell.activeIndex;
  const navDirection = shell.navDirection;
  const publishedPosts = shell.publishedPosts;

  const controls = (
    <>
      <ViewScaleControl
        value={shell.appliedScale}
        official={shell.officialViewScale}
        overridden={shell.scalePick !== null}
        onChange={(next) => shell.setScale(next === null ? null : clampViewScale(next))}
      />
      {!shell.isSkinLocked && (
        <SkinSwitcher
          value={shell.skinPick ?? shell.appliedSkin}
          official={doc.skin}
          onChange={shell.setSkin}
        />
      )}
    </>
  );

  return (
    <main
      data-skin={shell.appliedSkin}
      style={{ ...(shell.themeStyle as CSSProperties), minHeight: shell.wrapperMinHeight } as CSSProperties}
      className="flex min-h-dvh flex-col overflow-x-clip"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-6 pb-16">
        <PortfolioChrome
          tabs={doc.tabs}
          activeIndex={activeIndex}
          onTabChange={shell.switchTabLocal}
          hrefFor={shell.hrefFor}
          onKeyDown={shell.handleKeyDownForTabs}
          scrollable={shell}
          isDesktop={shell.isDesktopWidth}
          controls={controls}
        />

        {activeTab && (
          <div
            key={activeTab.id}
            role="tabpanel"
            id={`panel-${activeTab.id}`}
            aria-labelledby={`tab-${activeTab.id}`}
            className={`flex-1 ${
              navDirection === 1 ? 'tab-enter-right' : 'tab-enter-left'
            }`}
          >
            {activeTab.blocks.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                socials={doc.socials}
                cards={doc.cards}
                posts={publishedPosts}
                onNavigate={shell.handleNavigate}
                onOpenPost={(id) => setOverlayPostId(id)}
              />
            ))}
          </div>
        )}

        <SiteFooter
          footer={doc.footer}
          socials={doc.socials}
          badge={
            <Link href="/" className="opacity-40 hover:opacity-70">
              Built with overengineered-portfolio
            </Link>
          }
        />
      </div>

      {overlayPostId && (
        <FloatingPage
          onClose={() => setOverlayPostId(null)}
          themeSkin={shell.appliedSkin}
          themeStyle={shell.themeStyle as CSSProperties}
        >
          <BlogSite
            postId={overlayPostId}
            posts={publishedPosts}
            onClose={() => setOverlayPostId(null)}
          />
        </FloatingPage>
      )}
    </main>
  );
}
