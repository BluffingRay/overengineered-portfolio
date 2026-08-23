'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Full-screen floating page — covers whatever is behind (editor, nav,
 * everything) without any navigation. Portals to <body> per the house
 * rule: transformed ancestors turn position:fixed into row-relative
 * positioning. Escape closes unless focus sits in an editing surface
 * (inputs, TipTap, dialogs handle their own Escape first).
 */
export default function FloatingPage({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'input, textarea, select, [contenteditable="true"], [role="dialog"]',
        )
      ) {
        return;
      }
      onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="settle-in fixed inset-0 z-50 overflow-y-auto bg-background text-foreground">
      {children}
    </div>,
    document.body,
  );
}
