'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { TableCell, TableRow } from '@/components/ui/table';

import { valueOrDash } from './repertoire-stats.helpers';
import type { SongTableRow } from './RepertoireStats.SongsTable';

const DATA_FLAGS = ['hasLink', 'hasAnalysis', 'hasTranscription'] as const;

/** One song of the table: entered / measured values side by side, which data it has, and a compare toggle. */
export function RepertoireStatsSongRow({ row }: { row: SongTableRow }) {
  const t = useTranslations('RepertoireStats');
  return (
    <TableRow>
      <TableCell>
        <Link href={`/dashboard/songs/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
        <div className="text-xs text-muted-foreground">{valueOrDash(row.author)}</div>
      </TableCell>
      <TableCell>{valueOrDash(row.category)}</TableCell>
      <TableCell className="font-mono tabular-nums">
        {valueOrDash(row.tempo)} / {valueOrDash(row.bpm)}
      </TableCell>
      <TableCell className="font-mono">
        {valueOrDash(row.key)} / {valueOrDash(row.measuredKey)}
      </TableCell>
      <TableCell className="font-mono">{valueOrDash(row.metre)}</TableCell>
      <TableCell className="font-mono tabular-nums">{valueOrDash(row.bassPerBar)}</TableCell>
      <TableCell className="font-mono">{row.bassRange}</TableCell>
      <TableCell className="font-mono">{row.vocalRange}</TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {DATA_FLAGS.map((flag) => (
          <span
            key={flag}
            className={row[flag] ? 'text-foreground' : 'text-muted-foreground line-through'}
          >
            {t(`flag.${flag}`)}{' '}
          </span>
        ))}
      </TableCell>
      <TableCell>
        <Link href={row.compareHref} className="text-xs underline underline-offset-2">
          {row.isCompared ? t('compareRemove') : t('compareAdd')}
        </Link>
      </TableCell>
    </TableRow>
  );
}
