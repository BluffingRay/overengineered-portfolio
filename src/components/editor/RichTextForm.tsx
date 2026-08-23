'use client';

import type { RichTextBlock as RichTextBlockData } from '@/types/schema';
import { BlockWidthPicker } from './editor-shared';
import RichTextEditor from '@/components/rich/RichTextEditor';

export default function RichTextForm({
  block,
  patch,
}: {
  block: RichTextBlockData;
  patch: (p: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium opacity-50">Width</span>
        <BlockWidthPicker
          value={block.width}
          onChange={(width) => patch({ width })}
        />
      </div>
      <RichTextEditor
        content={block.content}
        onChange={(html) => patch({ content: html })}
        minHeight="9rem"
      />
    </div>
  );
}
