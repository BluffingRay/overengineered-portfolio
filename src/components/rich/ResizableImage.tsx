'use client';
import { useRef, useState } from 'react';
import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { AlignCenterHorizontal, AlignEndVertical, AlignStartVertical } from 'lucide-react';

/**
 * Word-style resizable image: select it, drag the corner handle to scale,
 * pick a layout (wrap-left / centered / wrap-right) from the mini toolbar.
 *
 * Width lives in the document as a percentage and the layout as
 * float/auto-margin inline styles, so everything survives save/load AND
 * reads identically in the public viewer — no editor required.
 *
 * Deliberately NOT draggable: ProseMirror's native node drag duplicates
 * images on vertical drags. Move = delete + reinsert (or change layout).
 */

const MIN_PCT = 10;
const MAX_PCT = 100;

type ImageLayout = 'left' | 'center' | 'right';

/**
 * Serialized into the stored HTML — this is the SINGLE source of truth
 * for how an image lays out everywhere (editor mirrors it live via the
 * NodeView wrapper, posts get it for free). Keep values symmetric with
 * the editor wrapper's own spacing.
 */
const LAYOUT_STYLES: Record<ImageLayout, string> = {
  // Floats pull text around the image; center stays its own block.
  left: 'display:block;float:left;margin:0.25rem 0.75rem 0.5rem 0;',
  center: 'display:block;margin:0.25rem auto;',
  right: 'display:block;float:right;margin:0.25rem 0 0.5rem 0.75rem;',
};

function ImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [previewPct, setPreviewPct] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const src: string | undefined = node.attrs.src;
  // Render-phase adjustment (house pattern): reset the broken flag when
  // the node src changes. No setState-in-effect; onError sets it after.
  const [seenSrc, setSeenSrc] = useState(src);
  if (seenSrc !== src) {
    setSeenSrc(src);
    setFailed(!src);
  }
  const width = previewPct ?? Number(node.attrs.width ?? 100);
  const layout = (node.attrs.layout ?? 'center') as ImageLayout;
  function startDrag(event: React.PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();

    const wrap = wrapRef.current;
    if (!wrap) return;

    // Percentages resolve against the editor COLUMN, not the wrapper's
    // own (already-sized) parent — measuring the parent made every new
    // drag restart from ~100% and snap previously-shrunk images wide.
    const columnWidth =
      wrap.closest('.ProseMirror')?.getBoundingClientRect().width ??
      wrap.parentElement?.getBoundingClientRect().width ??
      wrap.getBoundingClientRect().width;
    if (columnWidth === 0) return;

    const startX = event.clientX;
    // The committed value is the source of truth — never re-derive it
    // from current pixels.
    const startPct = Number(node.attrs.width ?? 100);
    let next = startPct;

    function onMove(moveEvent: PointerEvent) {
      const pxPerPercent = columnWidth / 100;
      next = Math.round(
        Math.min(MAX_PCT, Math.max(MIN_PCT, startPct + (moveEvent.clientX - startX) / pxPerPercent)),
      );
      setPreviewPct(next);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setPreviewPct(null);
      if (next !== node.attrs.width) updateAttributes({ width: next });
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <NodeViewWrapper
      as="div"
      className="my-1 leading-none"
      style={{
        width: `${width}%`,
        maxWidth: '100%',
        // Editor mirrors the serialized layout styles so what you see
        // while writing matches the published post.
        ...(layout === 'center'
          ? { marginLeft: 'auto', marginRight: 'auto' }
          : layout === 'left'
            ? { float: 'left', marginRight: '0.75rem', marginBottom: '0.5rem' }
            : { float: 'right', marginLeft: '0.75rem', marginBottom: '0.5rem' }),
        ...(previewPct !== null ? { position: 'relative', zIndex: 10 } : {}),
      }}
    >
      <div
        ref={wrapRef}
        className={`relative w-full ${selected ? 'ring-2 ring-accent' : ''}`}
      >
        {failed || !src ? (
          // eslint-disable-next-line @next/next/no-img-element -- editor node view, TipTap attrs
          <img
            src="/images/placeholder.svg"
            alt="No image"
            loading="lazy"
            decoding="async"
            className="block h-auto w-full rounded-skin opacity-60"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- editor node view, TipTap attrs
          <img
            src={src}
            alt={node.attrs.alt ?? ''}
            title={node.attrs.title}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full rounded-skin"
            onError={() => setFailed(true)}
          />
        )}

        {selected && (
          <div className="absolute -top-8 left-0 flex overflow-hidden rounded-skin border border-[var(--border)] bg-surface shadow">
            {(
              [
                { mode: 'left' as ImageLayout, Icon: AlignStartVertical, label: 'Image left — text beside it' },
                { mode: 'center' as ImageLayout, Icon: AlignCenterHorizontal, label: 'Centered on its own line' },
                { mode: 'right' as ImageLayout, Icon: AlignEndVertical, label: 'Image right — text beside it' },
              ] as const
            ).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={layout === mode}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => updateAttributes({ layout: mode })}
                className={`flex h-7 w-8 items-center justify-center ${
                  layout === mode
                    ? 'bg-accent text-background'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ))}
            <span className="border-l border-[var(--border)] px-1.5 py-1 font-mono text-[10px] leading-5 opacity-50">
              {width}%
            </span>
          </div>
        )}

        <span
          role="presentation"
          onPointerDown={startDrag}
          onDoubleClick={() => updateAttributes({ width: 100 })}
          title={`Drag to resize (${width}%) — double-click resets`}
          className={`absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-background bg-accent shadow ${
            selected ? '' : 'hidden'
          }`}
        />
      </div>
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  selectable: true,
  // No native node dragging — vertical drags used to duplicate the image.
  draggable: false,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 100,
        parseHTML: (element) => {
          const raw =
            element.getAttribute('data-width') ?? element.style.width ?? '';
          const parsed = parseFloat(raw);
          return Number.isFinite(parsed) && parsed > 0
            ? Math.min(MAX_PCT, parsed)
            : 100;
        },
      },
      layout: {
        default: 'center',
        parseHTML: (element) => {
          const value = element.getAttribute('data-layout');
          return value === 'left' || value === 'right' ? value : 'center';
        },
      },
    };
  },

  // Single serializer so width + layout compose into one style attribute:
  // floats/margins wrap text around the image exactly as in the editor,
  // and .rich-text img's max-width:100% keeps big percentages safe.
  renderHTML({ node }) {
    const width = Math.min(
      MAX_PCT,
      Math.max(MIN_PCT, Number(node.attrs.width ?? 100)),
    );
    const layout = (node.attrs.layout ?? 'center') as ImageLayout;
    return [
      'img',
      {
        src: node.attrs.src ?? '',
        alt: node.attrs.alt ?? '',
        title: node.attrs.title,
        'data-width': String(width),
        'data-layout': layout,
        style: `${LAYOUT_STYLES[layout]}width:${width}%;`,
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});
