'use client';

import { useState } from 'react';

interface ManagedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  fallbackSrc?: string;
  sizeClass?: string;
  ratioClass?: string;
  roundedClass?: string;
  frameClass?: string;
  placeholderLabel?: string;
}

/**
 * M9 — single image wrapper that centralizes error fallback + hero media styling.
 * Replaces 6 `eslint-disable no-img-element` sites + hero media duplication (size/ratio/radius/frame).
 */
export default function ManagedImage({
  src,
  alt = '',
  fallbackSrc = '/images/placeholder.svg',
  sizeClass,
  ratioClass,
  roundedClass,
  frameClass,
  placeholderLabel,
  className,
  loading = 'lazy',
  decoding = 'async',
  ...props
}: ManagedImageProps) {
  const [errored, setErrored] = useState(false);
  const hasSrc = !!src && !errored;
  const effectiveSrc = hasSrc ? (src as string) : fallbackSrc;
  const wrapperClass = ['relative overflow-hidden', sizeClass, ratioClass, roundedClass, frameClass, className]
    .filter(Boolean)
    .join(' ');

  if (sizeClass || ratioClass || roundedClass || frameClass) {
    return (
      <div className={wrapperClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={effectiveSrc}
          alt={alt || placeholderLabel || ''}
          loading={loading}
          decoding={decoding}
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
          {...props}
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={effectiveSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={() => setErrored(true)}
      className={className}
      {...props}
    />
  );
}
