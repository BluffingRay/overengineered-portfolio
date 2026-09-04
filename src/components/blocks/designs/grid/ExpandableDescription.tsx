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

  // Render-phase adjustment (house pattern — UtilityBar precedent):
  // refresh the SSR length guess when the text prop changes. No
  // setState-in-effect; the ResizeObserver below corrects after paint.
  const [seenText, setSeenText] = useState(text);
  if (seenText !== text) {
    setSeenText(text);
    setShowToggle(text.length > threshold);
  }

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

  if (!showToggle && !expanded) {
    return (
      <p ref={pRef} className={`${textClass} ${collapsedClass}`} title={text}>
        {text}
      </p>
    );
  }

  return (
    <>
      <p
        ref={pRef}
        className={`${textClass} ${expanded ? '' : collapsedClass} ${!expanded ? 'cursor-pointer' : ''}`}
        title={expanded ? undefined : text}
        onClick={() => {
          if (!expanded) setExpanded(true);
        }}
      >
        {text}
      </p>
      <button
        type="button"
        aria-label={expanded ? 'Show less' : 'Show more'}
        aria-expanded={expanded}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        className="relative z-10 mt-1 ml-auto block text-right text-[11px] leading-none opacity-40 hover:opacity-100 hover:text-accent"
      >
        {expanded ? 'Show less ↑' : 'Show more ↓'}
      </button>
    </>
  );
}
