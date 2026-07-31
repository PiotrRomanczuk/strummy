'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import type { CSSProperties } from 'react';

import { buildListHref, type FilterValue } from './list-filters.helpers';
import { filterLabelStyle } from './ListFilters';

/**
 * The text/select half of a filter bar, shared by every list.
 *
 * Selects apply immediately; text inputs debounce at 350ms and use `replace`
 * so typing does not stack a history entry per keystroke. That behaviour came
 * from the Songs list — the only page that had got it right — and is now the
 * behaviour everywhere rather than a per-page decision.
 *
 * Chips stay in the server component (see `FilterChipRow`): they are plain
 * links and do not need a client bundle. Only these live-updating controls do.
 */

const controlStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--rule)',
  fontSize: 12,
  background: 'var(--paper)',
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
};

export type FilterField =
  | {
      kind: 'search' | 'text';
      /** URL param this field writes to. */
      name: string;
      label?: string;
      placeholder: string;
      ariaLabel: string;
      value?: string;
      /** Grow to fill the row. One field per bar should set this. */
      grow?: boolean;
    }
  | {
      kind: 'select';
      name: string;
      label?: string;
      ariaLabel: string;
      value?: string;
      /** First option is the "any"/clear choice; its value must be ''. */
      options: { value: string; label: string }[];
    };

type Props = {
  basePath: string;
  current: Record<string, FilterValue>;
  defaults?: Record<string, FilterValue>;
  fields: FilterField[];
};

export const ListFiltersForm = ({ basePath, current, defaults, fields }: Props) => {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hrefFor = (next: Record<string, FilterValue>) =>
    buildListHref({ basePath, current, next, defaults });

  const apply = (next: Record<string, FilterValue>) =>
    router.push(hrefFor(next), { scroll: false });

  const applyDebounced = (next: Record<string, FilterValue>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      router.replace(hrefFor(next), { scroll: false });
    }, 350);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Enter should apply immediately rather than wait out the debounce.
        if (timer.current) clearTimeout(timer.current);
        const data = new FormData(e.currentTarget);
        const next: Record<string, FilterValue> = {};
        for (const field of fields) {
          next[field.name] = String(data.get(field.name) ?? '').trim() || undefined;
        }
        apply(next);
      }}
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        padding: '10px 14px',
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 10,
        flexWrap: 'wrap',
      }}
    >
      {fields.map((field) => (
        <span
          key={field.name}
          style={{
            display: 'contents',
          }}
        >
          {field.label && <span style={filterLabelStyle}>{field.label}</span>}
          {field.kind === 'select' ? (
            <select
              name={field.name}
              aria-label={field.ariaLabel}
              defaultValue={field.value ?? ''}
              onChange={(e) => apply({ [field.name]: e.target.value || undefined })}
              style={controlStyle}
            >
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.kind === 'search' ? 'search' : 'text'}
              name={field.name}
              defaultValue={field.value ?? ''}
              placeholder={field.placeholder}
              aria-label={field.ariaLabel}
              onChange={(e) => applyDebounced({ [field.name]: e.target.value.trim() || undefined })}
              style={{
                ...controlStyle,
                ...(field.grow ? { flex: 1, minWidth: 180 } : { minWidth: 140 }),
              }}
            />
          )}
        </span>
      ))}
    </form>
  );
};
