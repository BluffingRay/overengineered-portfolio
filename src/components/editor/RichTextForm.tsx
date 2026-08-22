'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import type { RichTextBlock as RichTextBlockData } from '@/types/schema';

const BTN =
  'rounded-skin px-2 py-1 text-xs font-medium opacity-70 transition-opacity hover:opacity-100';

function ToolButton({
  label,
  title,
  active,
  onClick,
}: {
  label: React.ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={!!active}
      onClick={onClick}
      className={`${BTN} ${active ? 'bg-accent text-background opacity-100' : ''}`}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-4 w-px bg-current/20" />;
}

export default function RichTextForm({
  block,
  patch,
}: {
  block: RichTextBlockData;
  patch: (p: Record<string, unknown>) => void;
}) {
  const contentRef = useRef(block.content);
  const [, setTick] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: block.content,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      if (html === contentRef.current) return;
      contentRef.current = html;
      patch({ content: html });
    },
    onTransaction() {
      setTick((tick) => tick + 1);
    },
  });

  useEffect(() => {
    if (!editor || block.content === contentRef.current) return;
    contentRef.current = block.content;
    editor.commands.setContent(block.content, { emitUpdate: false });
  }, [editor, block.content]);

  if (!editor) return null;

  function insertLink() {
    const current = editor!.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', current ?? 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div className="overflow-hidden rounded-skin border border-[var(--border)] bg-background">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] p-1"
      >
        <ToolButton
          label={<span className="font-bold">B</span>}
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolButton
          label={<span className="italic">I</span>}
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolButton
          label={<span className="underline">U</span>}
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolButton
          label={<span className="line-through">S</span>}
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />

        <Divider />

        {([1, 2, 3] as const).map((level) => (
          <ToolButton
            key={level}
            label={`H${level}`}
            title={`Heading ${level}`}
            active={editor.isActive('heading', { level })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level }).run()
            }
          />
        ))}

        <Divider />

        <ToolButton
          label="• List"
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolButton
          label="1. List"
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolButton
          label="❝"
          title="Blockquote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />

        <Divider />

        <ToolButton
          label="⯇"
          title="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        />
        <ToolButton
          label="≡"
          title="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        />
        <ToolButton
          label="⯈"
          title="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        />

        <Divider />

        <ToolButton
          label="🔗"
          title="Insert / edit link (empty to remove)"
          active={editor.isActive('link')}
          onClick={insertLink}
        />
      </div>

      <div className="rich-text rich-editor min-h-[9rem]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
