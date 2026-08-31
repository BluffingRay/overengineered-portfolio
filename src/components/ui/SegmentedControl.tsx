'use client';

type Option<T extends string> = { value: T; label: string };

interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly Option<T>[] | readonly T[];
  onChange: (next: T) => void;
  ariaLabel?: string;
}

export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const normalized: Option<T>[] = (options as unknown[]).map((o) =>
    typeof o === 'string' ? { value: o as T, label: o } : (o as Option<T>),
  );
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden rounded-skin border border-[var(--border)]"
    >
      {normalized.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-xs font-medium capitalize ${
            value === opt.value ? 'bg-accent text-background' : 'opacity-60 hover:opacity-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
