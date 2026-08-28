'use client';

import { useEffect, useState } from 'react';

type Props = {
  src?: string | null;
  alt?: string;
  sizeClass?: string;
  ratioClass?: string;
  roundedClass?: string;
  frameClass?: string;
  className?: string;
  placeholderLabel?: string;
  imgClassName?: string;
};

export default function ManagedImage({
  src,
  alt = '',
  sizeClass = '',
  ratioClass = '',
  roundedClass = '',
  frameClass = '',
  className = '',
  placeholderLabel = 'No image',
  imgClassName = 'h-full w-full object-cover',
}: Props) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error');

  useEffect(() => {
    setStatus(src ? 'loading' : 'error');
  }, [src]);

  const outer = `${sizeClass} ${ratioClass} ${roundedClass} ${frameClass} ${className}`.trim();

  if (!src || status === 'error') {
    return (
      <div className={`relative flex flex-col overflow-hidden ${outer}`}>
        <img
          src="/images/placeholder.svg"
          alt={placeholderLabel}
          decoding="async"
          loading="lazy"
          className={`h-full w-full object-cover opacity-60 ${roundedClass}`.trim()}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col overflow-hidden ${outer}`}>
      {status === 'loading' && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-current/[0.08]" />}
      <img
        src={src}
        alt={alt}
        decoding="async"
        loading="lazy"
        className={`min-h-0 w-full flex-1 object-cover ${imgClassName}`.trim()}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}
