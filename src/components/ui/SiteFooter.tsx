import type { FooterConfig, SocialLink } from '@/types/schema';
import SocialIcon from './SocialIcon';

interface Props {
  footer?: FooterConfig;
  socials?: SocialLink[];
}

export default function SiteFooter({ footer, socials }: Props) {
  if (!footer?.enabled) return null;

  const showSocials = footer.showSocials === true && (socials?.length ?? 0) > 0;
  if (!showSocials && !footer.copyrightText) return null;

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

      {footer.copyrightText && (
        <p className="text-xs opacity-60">
          {footer.copyrightText.replace(/\{year\}/g, String(year))}
        </p>
      )}
    </footer>
  );
}
