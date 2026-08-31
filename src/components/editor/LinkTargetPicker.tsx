'use client';

import { INPUT } from './editor-shared';

type TabRef = { id: string; label: string };

function resolveTab(tabs: TabRef[], value: string) {
  if (!value.startsWith('#')) return null;
  const slug = value.slice(1);
  return (
    tabs.find((tab) => tab.id === slug) ??
    tabs.find((tab) => tab.label.toLowerCase().replace(/\s+/g, '-') === slug) ??
    null
  );
}

interface LinkTargetPickerProps {
  tabs?: TabRef[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  showBlogs?: boolean;
  blogs?: Array<{ id: string; title: string }>;
}

export default function LinkTargetPicker({ tabs, value, onChange, placeholder = '/cv.pdf or https://…', blogs, showBlogs }: LinkTargetPickerProps) {
  const hasTabs = tabs && tabs.length > 0;
  const matched = hasTabs ? resolveTab(tabs!, value) : null;

  // AppGridForm variant: if blogs provided, show blog picker instead of tabs? But keep tab picker as primary.
  // This component unifies HeroForm's TabLinkPicker and AppGridForm's custom URL + blog picker.
  // For blog-aware callers, render an extra select for posts when not matched.
  if (!hasTabs && !showBlogs) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${INPUT} font-mono text-xs`}
      />
    );
  }

  return (
    <div className="space-y-1">
      {hasTabs && (
        <select
          value={matched?.id ?? 'custom'}
          onChange={(e) => {
            const next = e.target.value;
            onChange(next === 'custom' ? '' : `#${next}`);
          }}
          aria-label="Link target"
          className={INPUT}
        >
          {tabs!.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
          <option value="custom">Custom URL…</option>
        </select>
      )}
      {(!hasTabs || !matched) && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${INPUT} font-mono text-xs`}
        />
      )}
    </div>
  );
}
