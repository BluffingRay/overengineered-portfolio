'use client';

import type { LucideIcon } from 'lucide-react';
import { isImageSource, resolveAppIcon } from '@/components/blocks/iconMap';
import ManagedImage from './ManagedImage';

interface Props {
  icon?: string;
  appName: string;
}

export default function ProjectIcon({ icon, appName }: Props) {
  let content: React.ReactNode;

  if (isImageSource(icon)) {
    content = (
      <ManagedImage
        src={icon}
        className="h-5 w-5 object-contain"
        draggable={false}
      />
    );
  } else {
    // Intentional dynamic dispatch: resolveAppIcon returns stable
    // module-level Lucide references (see REGISTRY invariant), so the
    // identity is stable per icon string and nothing remounts. The
    // static-components rule can't verify registry stability —
    // keep REGISTRY free of inline components.
    const Icon: LucideIcon | null = resolveAppIcon(icon);

    content = Icon ? (
      // eslint-disable-next-line react-hooks/static-components
      <Icon className="h-5 w-5" aria-hidden="true" />
    ) : (
      <span className="text-sm font-semibold">
        {appName.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-current/15 bg-current/10">
      {content}
    </span>
  );
}
