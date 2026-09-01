'use client';

import { useEffect, useRef, useState } from 'react';

export default function ExpandableDescription({
  text,
  collapsedClass,
  textClass,
  buttonClass = 'relative z-10 mt-1 text-xs font-medium text-accent hover:underline underline-offset-4',
  threshold = 90,
}: {
  text: string;
  collapsedClass: string;
  textClass: string;
  buttonClass?: string;
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
    <>
      <p
        ref={pRef}
        className={`${textClass} ${expanded ? '' : collapsedClass}`}
        title={expanded ? undefined : text}
      >
        {text}
      </p>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        className={buttonClass}
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </>
  );
}
