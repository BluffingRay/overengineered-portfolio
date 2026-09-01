'use client';

import { useEffect, useRef, useState } from 'react';

export default function ExpandableDescription({
  text,
  collapsedClass,
  textClass,
  threshold = 90,
}: {
  text: string;
  collapsedClass: string;
  textClass: string;
  threshold?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const pRef = useRef<HTMLParagraphElement>(null);
  const [showToggle, setShowToggle] = useState(text.length > threshold);

  useEffect(() => {
    const el = pRef.current;
    if (!el) return;
    const update = () => {
      if (expanded) return; // keep previous value when expanded (already truncated)
      // scrollHeight > clientHeight means clamped text is overflowing
      setShowToggle(el.scrollHeight > el.clientHeight + 2);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [text, expanded, collapsedClass, threshold]);

  // Also re-check when text crosses threshold initially (SSR guess)
  useEffect(() => {
    setShowToggle(text.length > threshold);
  }, [text, threshold]);

  if (!showToggle && !expanded) {
    return (
      <p ref={pRef} className={`${textClass} ${collapsedClass}`} title={text}>
        {text}
      </p>
    );
  }

  return (
    <div className="relative">
      <p
        ref={pRef}
        className={`${textClass} ${expanded ? '' : `${collapsedClass} pr-6`} ${!expanded ? 'cursor-pointer' : ''}`}
        title={expanded ? undefined : text}
        onClick={() => {
          if (!expanded) setExpanded(true);
        }}
      >
        {text}
      </p>
      {!expanded ? (
        <button
          type="button"
          aria-label="Show more"
          aria-expanded={false}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(true);
          }}
          className="absolute bottom-0 right-0 z-10 flex items-center bg-gradient-to-l from-surface via-surface/90 to-transparent pl-3 text-[11px] leading-none opacity-60 hover:opacity-100 hover:text-accent"
        >
          <span aria-hidden="true">…&nbsp;→</span>
        </button>
      ) : (
        <button
          type="button"
          aria-label="Show less"
          aria-expanded={true}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(false);
          }}
          className="relative z-10 mt-1 text-[11px] leading-none opacity-40 hover:opacity-100 hover:text-accent"
        >
          ↑ Show less
        </button>
      )}
    </div>
  );
}
