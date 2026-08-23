'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Scroll-reveal wrapper: children start slightly offset/dimmed and ease in
 * (skin timing via .reveal tokens) the first time they enter the viewport.
 * Fires once — scrolling back never re-hides. Elements already in view at
 * mount (the hero) reveal immediately, which doubles as a soft entry.
 */
export default function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  /** Stagger offset in ms (used by grids so cards cascade). */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
