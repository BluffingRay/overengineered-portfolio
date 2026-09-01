'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import MediaPicker from '@/components/editor/MediaPicker';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Color, FontSize, TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { ResizableImage } from './ResizableImage';
import { ClearableParagraph } from './ClearFloat';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';

const BTN =
  'rounded-skin px-2 py-1 text-xs font-medium opacity-70 hover:opacity-100';

function ToolButton({
  label,
  title,
  active,
  disabled,
  onClick,
}: {
  label: React.ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={!!active}
      disabled={disabled}
      onClick={onClick}
      className={`${BTN} ${active ? 'bg-accent text-background opacity-100' : ''} ${
        disabled ? 'pointer-events-none opacity-20' : ''
      }`}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-4 w-px bg-current/20" />;
}

export interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  minHeight?: string;
  placeholder?: string;
}

/**
 * Reusable TipTap rich-text editor with the full formatting toolbar.
 * Block-agnostic on purpose: the future blog editor mounts this
 * directly instead of duplicating toolbar logic.
 */
export default function RichTextEditor({
  content,
  onChange,
  minHeight = '9rem',
  placeholder = 'Write something…',
}: RichTextEditorProps) {
  const contentRef = useRef(content);
  const [, setTick] = useState(0);
  const sizeRef = useRef<HTMLInputElement>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const { mutate } = usePortfolioData();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadImageFile = useCallback(async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) return null;
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body });
      const json = (await res.json()) as { url?: string; name?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed');
      mutate((current) => ({
        ...current,
        assets: [{ id: crypto.randomUUID(), url: json.url!, name: json.name }, ...(current.assets ?? [])].slice(0, 200),
      }));
      return json.url;
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  }, [mutate]);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const dt = event.dataTransfer;
        if (!dt) return false;
        const files = Array.from(dt.files).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        (async () => {
          for (const file of files) {
            const body = new FormData();
            body.append('file', file);
            try {
              const res = await fetch('/api/upload', { method: 'POST', body });
              const json = (await res.json()) as { url?: string; name?: string; error?: string };
              if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed');
              mutate((current) => ({
                ...current,
                assets: [{ id: crypto.randomUUID(), url: json.url!, name: json.name }, ...(current.assets ?? [])].slice(0, 200),
              }));
              const url = json.url;
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
              const node = view.state.schema.nodes.image?.create({ src: url });
              if (node) {
                const tr = view.state.tr.insert(pos, node);
                view.dispatch(tr);
              }
            } catch (e) {
              setUploadError(e instanceof Error ? e.message : 'Upload failed');
            }
          }
        })();
        return true;
      },
      handlePaste: (view, event) => {
        const dt = event.clipboardData;
        if (!dt) return false;
        const files: File[] = [];
        if (dt.files.length) {
          for (const f of Array.from(dt.files)) if (f.type.startsWith('image/')) files.push(f);
        } else {
          for (const item of Array.from(dt.items)) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
              const f = item.getAsFile();
              if (f) files.push(f);
            }
          }
        }
        if (files.length === 0) return false;
        event.preventDefault();
        (async () => {
          for (const file of files) {
            const body = new FormData();
            body.append('file', file);
            try {
              const res = await fetch('/api/upload', { method: 'POST', body });
              const json = (await res.json()) as { url?: string; name?: string; error?: string };
              if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed');
              mutate((current) => ({
                ...current,
                assets: [{ id: crypto.randomUUID(), url: json.url!, name: json.name }, ...(current.assets ?? [])].slice(0, 200),
              }));
              const url = json.url;
              const { state } = view;
              const pos = state.selection.from;
              const node = state.schema.nodes.image?.create({ src: url });
              if (node) view.dispatch(state.tr.insert(pos, node));
            } catch (e) {
              setUploadError(e instanceof Error ? e.message : 'Upload failed');
            }
          }
        })();
        return true;
      },
    },
    extensions: [
      // ClearableParagraph below IS the Paragraph node (extended with the
      // clear-float attribute) — StarterKit's bundled copy is disabled so
      // the editor doesn't register two extensions named 'paragraph'.
      StarterKit.configure({ paragraph: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      ResizableImage.configure({ allowBase64: true }),
      ClearableParagraph,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      if (html === contentRef.current) return;
      contentRef.current = html;
      onChange(html);
    },
    onTransaction() {
      setTick((tick) => tick + 1);
    },
  });

  useEffect(() => {
    if (!editor || content === contentRef.current) return;
    contentRef.current = content;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, content]);

  const handleWrapperDrop = useCallback(async (e: React.DragEvent) => {
    if (e.defaultPrevented) return;
    if (!editor) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    e.preventDefault();
    setDragOver(false);
    for (const file of files) {
      const url = await uploadImageFile(file);
      if (url) editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor, uploadImageFile]);

  const handleWrapperPaste = useCallback(async (e: React.ClipboardEvent) => {
    if (e.defaultPrevented) return;
    if (!editor) return;
    const files: File[] = [];
    if (e.clipboardData.files.length) {
      for (const f of Array.from(e.clipboardData.files)) if (f.type.startsWith('image/')) files.push(f);
    } else {
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
    }
    if (files.length === 0) return;
    e.preventDefault();
    for (const file of files) {
      const url = await uploadImageFile(file);
      if (url) editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor, uploadImageFile]);

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

  function insertImage() {
    setMediaOpen(true);
  }

  function applySize(refocus = false) {
    const input = sizeRef.current;
    if (!input) return;
    const raw = input.value.trim();
    // Never steal focus here: blur commits must leave the click target alone,
    // or the next control (color/highlight/etc.) silently loses its event.
    let chain = refocus ? editor!.chain().focus() : editor!.chain();
    if (raw === '') {
      chain = chain.unsetFontSize();
    } else {
      const value = /^\d+(\.\d+)?$/.test(raw) ? `${raw}px` : raw;
      chain = chain.setFontSize(value);
    }
    chain.run();
    input.value =
      (editor!.getAttributes('textStyle').fontSize as string | undefined) ?? '';
  }

  function setColor(event: React.ChangeEvent<HTMLInputElement>) {
    editor!.chain().focus().setColor(event.target.value).run();
  }

  function unsetColor() {
    editor!.chain().focus().unsetColor().run();
  }

  function setHighlight(event: React.ChangeEvent<HTMLInputElement>) {
    editor!.chain().focus().setHighlight({ color: event.target.value }).run();
  }

  function unsetHighlight() {
    editor!.chain().focus().unsetHighlight().run();
  }

  const inTable = editor.isActive('table');

  return (
    <div
      className={`overflow-hidden rounded-skin border bg-background ${dragOver ? 'border-accent ring-2 ring-accent/30' : 'border-[var(--border)]'}`}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (Array.from(e.dataTransfer.types).includes('Files')) setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={handleWrapperDrop}
      onPaste={handleWrapperPaste}
    >
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
          label="☑ List"
          title="Task list"
          active={editor.isActive('taskList')}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
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
        <ToolButton label="🖼" title="Insert image" onClick={insertImage} />
        <ToolButton
          label="⤵"
          title="This paragraph starts below floated images (toggle)"
          active={
            (editor.getAttributes('paragraph').clearBelow as boolean) === true
          }
          onClick={() => {
            const current =
              (editor!.getAttributes('paragraph').clearBelow as boolean) ===
              true;
            editor!
              .chain()
              .focus()
              .updateAttributes('paragraph', { clearBelow: !current })
              .run();
          }}
        />

        <Divider />

        <label className="flex items-center gap-0.5 px-0.5" title="Font size — a number (px) or any CSS value; blank resets">
          <span className="text-[10px] font-medium opacity-50">Size</span>
          <input
            ref={sizeRef}
            type="text"
            inputMode="decimal"
            placeholder="—"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applySize(true);
              }
            }}
            onBlur={() => applySize()}
            className="w-12 rounded-skin border border-[var(--border)] bg-background px-1 py-0.5 text-xs"
          />
        </label>
        <label
          className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-skin border border-current/30 text-[10px]"
          title="Text color (✕ on the swatch clears)"
        >
          A
          <input
            type="color"
            onChange={setColor}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Text color"
          />
        </label>
        <ToolButton label="␡" title="Clear text color" onClick={unsetColor} />
        <label
          className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-skin border border-current/30"
          title="Highlight (background) color"
        >
          🖍
          <input
            type="color"
            onChange={setHighlight}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Highlight color"
          />
        </label>
        <ToolButton label="␡" title="Clear highlight" onClick={unsetHighlight} />
        <ToolButton
          label={<span>X<sub>2</sub></span>}
          title="Subscript"
          active={editor.isActive('subscript')}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        />
        <ToolButton
          label={<span>X<sup>2</sup></span>}
          title="Superscript"
          active={editor.isActive('superscript')}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        />

        <Divider />

        <ToolButton
          label="⊞+"
          title="Insert table"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        />
        <ToolButton
          label="+↑"
          title="Add row above"
          disabled={!inTable || !editor.can().addRowBefore()}
          onClick={() => editor.chain().focus().addRowBefore().run()}
        />
        <ToolButton
          label="+↓"
          title="Add row below"
          disabled={!inTable || !editor.can().addRowAfter()}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        />
        <ToolButton
          label="+←"
          title="Add column left"
          disabled={!inTable || !editor.can().addColumnBefore()}
          onClick={() => editor.chain().focus().addColumnBefore().run()}
        />
        <ToolButton
          label="+→"
          title="Add column right"
          disabled={!inTable || !editor.can().addColumnAfter()}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        />
        <ToolButton
          label="Hdr"
          title="Toggle header row"
          disabled={!inTable}
          active={editor.isActive('tableHeader')}
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        />
        <ToolButton
          label="✕⊞"
          title="Delete table"
          disabled={!inTable}
          onClick={() => editor.chain().focus().deleteTable().run()}
        />
      </div>

      <div
        className="rich-text rich-editor relative"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-accent/10 backdrop-blur-[1px]">
            <span className="rounded-skin bg-surface px-3 py-1.5 text-xs font-medium shadow">Drop image to upload</span>
          </div>
        )}
      </div>
      {uploading && <p className="px-2 py-1 text-center text-xs opacity-60">Uploading image…</p>}
      {uploadError && <p role="alert" className="px-2 py-1 text-center text-xs text-red-500">{uploadError}</p>}

      <MediaPicker
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(url) => editor!.chain().focus().setImage({ src: url }).run()}
      />
    </div>
  );
}
