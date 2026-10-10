'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type Match = { id: string; title: string; author: string };

type Props = { title: string; author: string };

/** Advisory-only duplicate check — reuses the existing song search endpoint,
 * doesn't block saving (a teacher may legitimately want a second arrangement). */
export const SongFormDuplicateWarning = ({ title, author }: Props) => {
  const t = useTranslations('Songs');
  const [match, setMatch] = useState<Match | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!title.trim() || !author.trim()) {
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/song/search?q=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=5`
        );
        if (!res.ok) return;
        const body = (await res.json()) as { songs?: Match[] };
        const found = (body.songs ?? []).find(
          (s) =>
            s.title.trim().toLowerCase() === title.trim().toLowerCase() &&
            s.author.trim().toLowerCase() === author.trim().toLowerCase()
        );
        setMatch(found ?? null);
      } catch {
        // Advisory only — a failed check just means no warning shows.
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [title, author]);

  if (!match || !title.trim() || !author.trim()) return null;

  // Claude Design duplicate warning: gold wash, ⚠, message, "View existing →".
  return (
    <div
      role="status"
      style={{
        marginTop: 14,
        padding: '10px 14px',
        background: 'color-mix(in srgb, var(--gold) 7%, transparent)',
        border: '1px solid var(--gold-dim)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        fontSize: 12,
      }}
    >
      <span aria-hidden="true" style={{ color: 'var(--gold-2)', fontSize: 14, marginTop: 1 }}>
        ⚠
      </span>
      <span style={{ color: 'var(--ink-2)', flex: 1 }}>
        {t('formDuplicateWarningMessage', { title: match.title, author: match.author })}
      </span>
      <Link
        href={`/dashboard/songs/${match.id}`}
        style={{
          color: 'var(--gold-2)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          textDecoration: 'none',
        }}
      >
        {t('formDuplicateWarningViewLink')}
      </Link>
    </div>
  );
};
