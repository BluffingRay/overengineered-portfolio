'use client';

export default function ImagePlaceholder({ label = 'No image' }: { label?: string }) {
  return (
    <span className="flex h-full w-full items-center justify-center bg-current/[0.04] px-4 py-10 text-center font-mono text-xs uppercase tracking-widest text-current/40">
      <span aria-hidden="true" className="mr-2 text-base">☹</span>
      {label}
    </span>
  );
}
