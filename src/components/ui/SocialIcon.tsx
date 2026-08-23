import type { LucideIcon } from 'lucide-react';
import {
  AtSign,
  BriefcaseBusiness,
  FolderGit2,
  Globe,
  Mail,
  MessagesSquare,
} from 'lucide-react';
import type { SocialLink, SocialPlatform } from '@/types/schema';
import { isImageSource, resolveAppIcon } from '@/components/blocks/iconMap';

export const PLATFORM_ICONS: Record<SocialPlatform, LucideIcon> = {
  github: FolderGit2,
  linkedin: BriefcaseBusiness,
  twitter: AtSign,
  email: Mail,
  discord: MessagesSquare,
  custom: Globe,
};

interface Props {
  link: SocialLink;
  className?: string;
}

export default function SocialIcon({ link, className }: Props) {
  const custom = link.customIcon;
  const Fallback = PLATFORM_ICONS[link.platform];

  if (custom && isImageSource(custom)) {
    return (
      <img
        src={custom}
        alt=""
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-contain ${className ?? ''}`}
      />
    );
  }

  const CustomLucide = resolveAppIcon(custom);
  const Icon = CustomLucide ?? Fallback;

  return (
    <Icon
      aria-hidden="true"
      className={`h-full w-full ${className ?? ''}`}
      strokeWidth={1.75}
    />
  );
}
