import type { ReactNode } from 'react';
import type { FooterConfig, SocialLink } from '@/types/schema';
import SocialIcon from './SocialIcon';

interface Props {
  footer?: FooterConfig;
  socials?: SocialLink[];
  /**
   * 5g-b followup — optional platform credit (the hosted render only; B
   * never passes it). Renders INLINE after the copyright — same line, dot
   * separated, dimmer than the owner's text — instead of a stacked line of
   * its own, so a user-defined footer keeps its length and the credit
   * never reads as owning the footer. With the owner's footer disabled it
   * stands alone as the same whisper.
   */
  badge?: ReactNode;
}

export default function SiteFooter({ footer, socials, badge }: Props) {
  const showSocials = footer?.showSocials === true && (socials?.length ?? 0) > 0;
  const copyright = footer?.copyrightText;
  if (!footer?.enabled && !badge) return null;
  if (!showSocials && !copyright && !badge) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-current/15 pt-6 pb-2">
      {showSocials && (
        <ul className="mb-4 flex items-center gap-1.5" aria-label="Social links">
          {socials!.map((link) => (
            <li key={link.id}>
              <a
                href={link.url}
                title={link.label ?? link.platform}
                aria-label={link.label ?? link.platform}
                target={
                  link.url.startsWith('mailto:') ? undefined : '_blank'
                }
                rel="noreferrer noopener"
                className="flex h-8 w-8 items-center justify-center rounded-skin border border-[var(--border)] bg-surface p-1.5 text-current opacity-70 hover:scale-110 hover:border-accent hover:text-accent hover:opacity-100"
              >
                <SocialIcon link={link} />
              </a>
            </li>
          ))}
        </ul>
      )}

      {copyright ? (
        <p className="text-xs opacity-60">
          {copyright.replace(/\{year\}/g, String(year))}
          {badge ? (
            <span className="opacity-50">
              {' · '}
              {badge}
            </span>
          ) : null}
        </p>
      ) : badge ? (
        <p className="text-xs opacity-60">{badge}</p>
      ) : null}
    </footer>
  );
}
