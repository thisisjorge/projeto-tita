import { useRef, useState } from 'react';

/** Editing text belongs to the input; only valid numbers cross the domain boundary. */
export function useNumericDraft(
  value: number | undefined,
  commit: (value: number | undefined) => void,
  integer: boolean,
  onInvalidCommit?: () => void,
) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const latest = useRef(value);
  if (draft === null) latest.current = value;
  const parse = (text: string) => {
    const n = Number(text.replace(',', '.'));
    return text.trim() !== '' && Number.isFinite(n) && n >= 0 && (!integer || Number.isInteger(n))
      ? n
      : undefined;
  };
  return {
    invalid,
    current: () => latest.current,
    set: (next: number) => {
      latest.current = next;
      setInvalid(false);
      setDraft(null);
      commit(next);
    },
    input: {
      value: draft ?? (value === undefined ? '' : String(value)),
      'aria-invalid': invalid || undefined,
      onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
        setDraft(event.currentTarget.value);
        event.currentTarget.select();
      },
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const text = event.currentTarget.value;
        setDraft(text);
        setInvalid(false);
        const next = parse(text);
        if (next !== undefined) {
          latest.current = next;
          commit(next);
        }
      },
      onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
        if (parse(event.currentTarget.value) === undefined) {
          setInvalid(true);
          onInvalidCommit?.();
          // Retain the saved number and make the unfinished edit explicit.
        }
        setDraft(null);
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          event.currentTarget.value = value === undefined ? '' : String(value);
          setDraft(null);
          setInvalid(false);
          event.currentTarget.blur();
        }
      },
    },
  };
}
