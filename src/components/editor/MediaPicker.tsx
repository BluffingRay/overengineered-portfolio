'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Trash2 } from 'lucide-react';
import { usePortfolioData } from '@/hooks/usePortfolioData';

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
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageFiles, setStorageFiles] = useState<{ url: string; key: string; source: 'r2' | 'local' }[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const reload = () => {
    setReloading(true);
    setError(null);
    fetch('/api/upload?list=1', { cache: 'no-store', credentials: 'same-origin' }).then((r) => r.json()).then((j: { files?: typeof storageFiles }) => setStorageFiles(j.files ?? [])).catch(() => setError('Reload failed')).finally(() => setReloading(false));
  };

  useEffect(() => {
    if (!open) return;
    reload();
  }, [open, data.assets]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) onClose();
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

  // Paste image from clipboard (screenshot, copied file) while the library is open
  useEffect(() => {
    if (!open) return;
    function onPaste(event: ClipboardEvent) {
      if (event.defaultPrevented) return;
      const items = event.clipboardData?.files;
      const files = items ? Array.from(items).filter((f) => f.type.startsWith('image/')) : [];
      if (files.length > 0) {
        // Don't let the underlying input or editor also handle it
        event.preventDefault();
        void handleFiles(files);
        return;
      }
      // Fallback: some browsers put the image as item kind 'file' not in files list
      const clipboardItems = event.clipboardData?.items;
      if (clipboardItems) {
        const fileFromItem: File[] = [];
        for (const item of Array.from(clipboardItems)) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const f = item.getAsFile();
            if (f) fileFromItem.push(f);
          }
        }
        if (fileFromItem.length > 0) {
          event.preventDefault();
          void handleFiles(fileFromItem);
          return;
        }
      }
    }
    document.addEventListener('paste', onPaste as unknown as EventListener);
    return () => document.removeEventListener('paste', onPaste as unknown as EventListener);
  }, [open]);

  if (!open) return null;

  function pick(url: string) {
    if (url && url !== '/images/placeholder.svg' && !(data.assets ?? []).some((a) => a.url === url)) {
      mutate((current) => ({
        ...current,
        assets: [{ id: crypto.randomUUID(), url, name: url.split('/').pop() }, ...(current.assets ?? [])].slice(0, 200),
      }));
    }
    onSelect(url);
    onClose();
  }

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body, credentials: 'same-origin' });
      const json = (await res.json()) as { url?: string; name?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed');
      mutate((current) => ({
        ...current,
        assets: [{ id: crypto.randomUUID(), url: json.url!, name: json.name }, ...(current.assets ?? [])].slice(0, 200),
      }));
      pick(json.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    if (imageFiles.length === 1) {
      await handleUpload(imageFiles[0]!);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of imageFiles) {
        const body = new FormData();
        body.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body, credentials: 'same-origin' });
        const json = (await res.json()) as { url?: string; name?: string; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error ?? `Upload failed for ${file.name}`);
        urls.push(json.url);
        mutate((current) => ({
          ...current,
          assets: [{ id: crypto.randomUUID(), url: json.url!, name: json.name }, ...(current.assets ?? [])].slice(0, 200),
        }));
      }
      // Keep the library open so the user sees all uploads; auto-select the first for convenience
      if (urls[0]) {
        // Add silently already done; now select first without re-adding
        onSelect(urls[0]);
        onClose();
      }
      // Refresh the R2 inventory so newly uploaded keys show immediately
      fetch('/api/upload?list=1', { cache: 'no-store', credentials: 'same-origin' }).then((r) => r.json()).then((j: { files?: typeof storageFiles }) => setStorageFiles(j.files ?? [])).catch(() => {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removeAsset(id: string) {
    const isStorage = id.startsWith('storage:');
    const isRef = id.startsWith('ref:');
    const url = isStorage ? id.slice(8) : isRef ? id.slice(4) : (data.assets ?? []).find((a) => a.id === id)?.url;
    if (!url) return;
    const key = (storageFiles ?? []).find((f) => f.url === url)?.key ?? (() => { try { return new URL(url, 'http://x').pathname.replace(/^\//, ''); } catch { return null; } })();
    if (!window.confirm(`Delete ${url.split('/').pop() ?? url}? ${isRef ? 'Remove from doc — file stays in bucket if it exists.' : 'Delete file (R2 + local) and clear doc refs?'}`)) return;
    const doDelete = isRef ? Promise.resolve({ ok: true } as Response) : fetch(`/api/upload?${key ? `key=${encodeURIComponent(key)}` : `url=${encodeURIComponent(url)}`}`, { method: 'DELETE', credentials: 'same-origin' });
    doDelete.then(async (r) => {
      if (!r.ok) { const j = await (r as Response).json().catch(() => ({})) as { error?: string }; throw new Error(j.error ?? 'Delete failed'); }
      setStorageFiles((prev) => (prev ?? []).filter((f) => f.url !== url));
      mutate((cur) => {
        const clearContent = (html: string) => html.replace(new RegExp(`<img[^>]*src=["']${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'g'), '');
        return {
          ...cur,
          assets: (cur.assets ?? []).filter((a) => a.url !== url),
          tabs: cur.tabs.map((tab) => ({ ...tab, blocks: tab.blocks.map((b) => {
            const rec = b as unknown as Record<string, unknown>;
            let nb: typeof b = b;
            if (rec.thumbnail === url) nb = { ...nb, thumbnail: undefined } as unknown as typeof b;
            if (typeof rec.content === 'string' && (rec.content as string).includes(url)) nb = { ...nb, content: clearContent(rec.content as string) } as unknown as typeof b;
            return nb;
          }) })),
          cards: (cur.cards ?? []).map((c) => (c.coverImage === url || (c.icon as string) === url ? { ...c, coverImage: c.coverImage === url ? undefined : c.coverImage, icon: (c.icon as string) === url ? undefined : c.icon } : c)),
          posts: (cur.posts ?? []).map((p) => {
            let np = p.coverImage === url ? { ...p, coverImage: undefined } : p;
            if (typeof p.content === 'string' && p.content.includes(url)) np = { ...np, content: clearContent(p.content) };
            return np;
          }),
        };
      });
    }).catch((e: Error) => setError(e.message));
  }

  const inventory = (() => {
    const seen = new Set<string>();
    const list: { id: string; url: string; name?: string }[] = [];
    const push = (id: string, url: string) => { if (!url || url === '/images/placeholder.svg' || seen.has(url)) return; seen.add(url); list.push({ id, url, name: url.split('/').pop() }); };
    for (const a of data.assets ?? []) push(a.id, a.url);
    for (const f of storageFiles ?? []) push(`storage:${f.url}`, f.url);
    const addRef = (u?: string | null) => { if (!u || seen.has(u) || u === '/images/placeholder.svg') return; if (u.startsWith('/') || u.startsWith('http')) push(`ref:${u}`, u); };
    for (const tab of data.tabs ?? []) for (const b of tab.blocks as unknown as Record<string, unknown>[]) {
      addRef(b.thumbnail as string);
      if (typeof b.content === 'string') for (const m of b.content.matchAll(/src=["']([^"']+)["']/g)) addRef(m[1]);
    }
    for (const c of data.cards ?? []) { addRef(c.coverImage as string); const ic = c.icon as string; if (ic?.startsWith('/') || ic?.startsWith('http')) addRef(ic); }
    for (const p of data.posts ?? []) { addRef(p.coverImage as string); if (typeof p.content === 'string') for (const m of p.content.matchAll(/src=["']([^"']+)["']/g)) addRef(m[1]); }
    return list;
  })();

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div
        ref={rootRef}
        role="dialog"
        aria-label="Media library"
        onDragOver={(e) => {
          e.preventDefault();
          if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('text/uri-list')) setDragOver(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
          if (files.length > 0) {
            void handleFiles(files);
            return;
          }
          // Dropped URL (e.g. dragging an image from another tab)
          const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
          const url = uri?.trim().split('\n')[0]?.trim();
          if (url && (/^https?:\/\//i.test(url) || url.startsWith('/') || url.startsWith('data:image'))) {
            pick(url);
          }
        }}
        className={`w-full max-w-xl rounded-skin border bg-surface p-4 shadow-xl ${dragOver ? 'border-accent ring-2 ring-accent/30' : 'border-[var(--border)]'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Media library</p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={reload} disabled={reloading} aria-label="Reload library" title="Reload from R2 + local (bypass cache)" className="rounded-skin border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-50">{reloading ? '…' : '↻ Reload'}</button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-skin border border-accent/60 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent hover:text-background">
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              {uploading ? 'Uploading…' : 'Upload'}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" multiple className="hidden" disabled={uploading} onChange={(event) => { const files = event.target.files ? Array.from(event.target.files) : []; event.target.value = ''; if (files.length) void handleFiles(files); }} />
            </label>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] leading-none">
          <span className="opacity-50">Storage:</span>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-medium text-emerald-700">● Hosted (R2 + uploads/)</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 opacity-50">Custom API — Coming soon</span>
        </div>
            {dragOver && <p className="mt-2 rounded-skin bg-accent/10 px-2 py-1 text-center text-xs font-medium text-accent">Drop image to upload</p>}
            {uploading && <p className="mt-2 text-center text-xs opacity-60">Uploading…</p>}
            {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
            {inventory.length > 0 ? (
              <ul className="mt-3 grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {inventory.map((asset) => (
                  <li key={asset.id} className="group relative">
                    <button type="button" title={asset.name ?? asset.url} onClick={() => pick(asset.url)} className="block aspect-video w-full overflow-hidden rounded-skin border border-[var(--border)] hover:border-accent bg-black/[0.03]">
                      <img src={asset.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/placeholder.svg'; (e.currentTarget as HTMLImageElement).style.opacity = '0.6'; }} />
                    </button>
                    <button type="button" aria-label={`Remove ${asset.name ?? 'asset'}`} title={asset.id.startsWith('ref:') ? 'Remove from doc (clear thumbnail/cover)' : 'Delete file (R2 + local) and clear doc refs'} onClick={() => removeAsset(asset.id)} className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full border border-current/20 bg-background text-red-500 group-hover:flex">
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs opacity-50">Nothing here yet — upload your first image above.</p>
            )}
            <form className="mt-3 flex gap-1.5 border-t border-current/10 pt-3" onSubmit={(event) => { event.preventDefault(); if (urlDraft.trim()) pick(urlDraft.trim()); }}>
              <input
                value={urlDraft}
                onChange={(event) => setUrlDraft(event.target.value)}
                onPaste={(event) => {
                  // If pasting an image file, upload instead of filling the URL field
                  const files = Array.from(event.clipboardData.files).filter((f) => f.type.startsWith('image/'));
                  if (files.length > 0) {
                    event.preventDefault();
                    void handleFiles(files);
                  }
                }}
                placeholder="…or paste an image URL — or drop/paste an image anywhere here (⌘V)"
                aria-label="Paste image URL"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-skin border border-[var(--border)] bg-background px-2 py-1 font-mono text-xs"
              />
              <button type="submit" disabled={!urlDraft.trim()} className="rounded-skin border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:pointer-events-none disabled:opacity-30">Use</button>
            </form>
            <p className="mt-2 text-center text-[10px] opacity-40">Tip: drag & drop images onto this dialog, or paste (Ctrl/⌘+V) a screenshot — they upload automatically</p>
      </div>
    </div>,
    document.body,
  );
}
