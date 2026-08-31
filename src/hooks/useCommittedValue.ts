import { useEffect, useRef, useState } from 'react';

/**
 * Generic draft buffer for fields that normalize on commit.
 * `serialize` turns the committed value into the text field's draft,
 * `deserialize` turns the draft back (or undefined when empty).
 * Commits raw onChange (so spaces stick) and normalized onBlur.
 */
export function useCommittedValue<T>(
  value: T | undefined,
  onCommit: (next: T | undefined) => void,
  serialize: (value: T | undefined) => string,
  deserialize: (draft: string) => T | undefined,
) {
  const [draft, setDraft] = useState(() => serialize(value));
  const echoRef = useRef<string | null>(null);

  useEffect(() => {
    const external = serialize(value);
    if (external !== echoRef.current) setDraft(external);
  }, [value, serialize]);

  return {
    draft,
    onChange(raw: string) {
      setDraft(raw);
      echoRef.current = serialize(deserialize(raw));
      onCommit(deserialize(raw));
    },
    onBlur() {
      const next = deserialize(draft);
      const serialized = serialize(next);
      setDraft(serialized);
      echoRef.current = serialized;
      onCommit(next);
    },
  };
}

/** String specialization – the common case (trimmed, whitespace-only → undefined). */
export function useTrimmedCommitGeneric(
  value: string | undefined,
  onCommit: (next: string | undefined) => void,
) {
  return useCommittedValue(value, onCommit, (v) => v ?? '', (draft) => {
    const trimmed = draft.trim();
    return trimmed === '' ? undefined : trimmed;
  });
}
