'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CustomHtmlBlock as CustomHtmlBlockData } from '@/types/schema';
import { BlockWidthPicker, INPUT } from '../editor-shared';

interface Props {
  block: CustomHtmlBlockData;
  patch: (p: Record<string, unknown>) => void;
}

export default function CustomHtmlForm({ block, patch }: Props) {
  const htmlKey = block.html;
  const [draft, setDraft] = useState(htmlKey);
  const seedRef = useRef(htmlKey);

  // When the store changes from outside (undo, import), reseed the draft.
  useEffect(() => {
    if (htmlKey !== seedRef.current) {
      seedRef.current = htmlKey;
      setDraft(htmlKey);
    }
  }, [htmlKey]);

  // Commit raw + verbatim on blur — never trim/normalize HTML. One store
  // transaction per edit, so typing stays smooth and undo stays one entry.
  const commit = useCallback(
    (raw: string) => {
      if (raw === seedRef.current) return;
      seedRef.current = raw;
      patch({ html: raw });
    },
    [patch],
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium opacity-50">Width</span>
        <BlockWidthPicker
          value={block.width}
          onChange={(width) => patch({ width })}
        />
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        rows={15}
        spellCheck={false}
        aria-label="Custom HTML source"
        className={`${INPUT} min-h-[240px] resize-y font-mono text-xs leading-relaxed`}
      />
    </div>
  );
}
