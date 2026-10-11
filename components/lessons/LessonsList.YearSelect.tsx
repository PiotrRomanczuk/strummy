'use client';

import { useRouter } from 'next/navigation';

type Option = { value: string; label: string; href: string };

/** The filter row's year `<select>` — each option is a URL, so it navigates. */
export function LessonsYearSelect({
  value,
  options,
  label,
}: {
  value: string;
  options: Option[];
  label: string;
}) {
  const router = useRouter();
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => {
        const next = options.find((o) => o.value === event.target.value);
        if (next) router.push(next.href);
      }}
      style={{
        padding: '5px 8px',
        borderRadius: 6,
        border: '1px solid var(--rule)',
        background: 'var(--card)',
        color: 'var(--ink-2)',
        fontSize: 12,
        fontFamily: 'var(--sans)',
        cursor: 'pointer',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
