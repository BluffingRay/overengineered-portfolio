'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Trash2 } from 'lucide-react';
import { usePortfolioData } from '@/hooks/usePortfolioData';

/**
 * Media library dialog — pick an existing asset, upload a new one, or
 * paste any URL. The document only ever stores URL references; file
 * bytes live behind /api/upload (swappable for S3 later).
 */
export default function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const { data, mutate } = usePortfolioData();
  const [urlDraft, setUrlDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Outside-click + Escape close (document listeners — same trap as
  // IconPicker/SkinSwitcher: no fixed backdrops inside transformed trees).
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function pick(url: string) {
    onSelect(url);
    onClose();
  }

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body });
      const json = (await res.json()) as { url?: string; name?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? 'Upload failed');
      }

      mutate((current) => ({
        ...current,
        // Newest first; library is capped so old imports can't balloon it.
        assets: [
          { id: crypto.randomUUID(), url: json.url!, name: json.name },
          ...(current.assets ?? []),
        ].slice(0, 200),
      }));

      pick(json.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removeAsset(id: string) {
    // Library-only removal: existing references keep their URLs working.
    mutate((current) => ({
      ...current,
      assets: (current.assets ?? []).filter((asset) => asset.id !== id),
    }));
  }

  // Portal to <body>: dnd-kit rows carry inline transforms, and any
  // transformed ancestor turns position:fixed into "relative to that
  // ancestor" — the dialog would center inside the editor row instead
  // of the viewport. Portaling escapes the trap entirely.
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div
        ref={rootRef}
        role="dialog"
        aria-label="Media library"
        className="w-full max-w-lg rounded-skin border border-[var(--border)] bg-surface p-3 shadow-xl"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Media library</p>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-skin border border-accent/60 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent hover:text-background">
            <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            {uploading ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void handleUpload(file);
              }}
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-xs text-red-500">
            {error}
          </p>
        )}

        {(data.assets?.length ?? 0) > 0 ? (
          <ul className="mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {data.assets!.map((asset) => (
              <li key={asset.id} className="group relative">
                <button
                  type="button"
                  title={asset.name ?? asset.url}
                  onClick={() => pick(asset.url)}
                  className="block aspect-video w-full overflow-hidden rounded-skin border border-[var(--border)] hover:border-accent"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${asset.name ?? 'asset'} from library`}
                  title="Remove from library (existing uses keep working)"
                  onClick={() => removeAsset(asset.id)}
                  className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full border border-current/20 bg-background text-red-500 group-hover:flex"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs opacity-50">
            Nothing here yet — upload your first image above.
          </p>
        )}

        <form
          className="mt-3 flex gap-1.5 border-t border-current/10 pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (urlDraft.trim()) pick(urlDraft.trim());
          }}
        >
          <input
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            placeholder="…or paste an image URL"
            aria-label="Paste image URL"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-skin border border-[var(--border)] bg-background px-2 py-1 font-mono text-xs"
          />
          <button
            type="submit"
            disabled={!urlDraft.trim()}
            className="rounded-skin border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:pointer-events-none disabled:opacity-30"
          >
            Use
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
