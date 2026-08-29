'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Full-screen floating page — covers whatever is behind (editor, nav,
 * everything) without any navigation. Portals to <body> per the house
 * rule: transformed ancestors turn position:fixed into row-relative
 * positioning. Escape closes unless focus sits in an editing surface
 * (inputs, TipTap, dialogs handle their own Escape first).
 *
 * `themeSkin`/`themeStyle` re-declare the token contract ON the portaled
 * sheet for contexts whose tokens don't cascade to body level (the hosted
 * public render: <html> wears the visitor's B theme from the pre-paint
 * script, while the doc's theme lives on the wrapper subtree). Absent on
 * Product B pages, where the <html> tokens are already the right ones.
 */
export default function FloatingPage({
  onClose,
  children,
  themeSkin,
  themeStyle,
}: {
  onClose: () => void;
  children: ReactNode;
  themeSkin?: string;
  themeStyle?: CSSProperties;
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
    <div
      data-skin={themeSkin}
      style={themeStyle}
      className="settle-in fixed inset-0 z-50 overflow-y-auto bg-background text-foreground"
    >
      {children}
    </div>,
    document.body,
  );
}
