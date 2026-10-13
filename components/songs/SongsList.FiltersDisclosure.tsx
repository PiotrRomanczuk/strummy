'use client';

import { useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';

/**
 * Phone-only fold for the secondary filters (level, sort, key, author).
 *
 * On a 390 px screen those rows stacked six deep above the first song, so the
 * library — the thing the page is for — started at 60% of the viewport. From
 * `md` up the button disappears and the children always show, exactly as
 * before. Opens by itself when a filter is already applied, so a shared or
 * reloaded filtered URL never hides why the list is short.
 */
export const SongsListFiltersDisclosure = ({
  label,
  activeCount,
  children,
}: {
  /** "Filters" / "Filters · 2" — already translated. */
  label: string;
  activeCount: number;
  children: ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(activeCount > 0);
  return (
    <div className="mt-2.5 mb-3 md:mb-0">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] md:hidden ${
          activeCount > 0
            ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
            : 'border-[var(--rule)] bg-[var(--card)] text-[var(--ink-2)]'
        }`}
      >
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        {label}
      </button>
      <div className={isOpen ? 'mt-2.5 block space-y-2.5 md:mt-0' : 'hidden space-y-2.5 md:block'}>
        {children}
      </div>
    </div>
  );
};
