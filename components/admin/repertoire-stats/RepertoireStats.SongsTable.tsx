'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSortableTable } from '@/hooks/useSortableTable';

import { RepertoireStatsSongRow } from './RepertoireStats.SongRow';
import { RepertoireStatsSongsFilter } from './RepertoireStats.SongsFilter';

export interface SongTableRow {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  tempo: number | null;
  bpm: number | null;
  key: string | null;
  measuredKey: string | null;
  metre: number | null;
  bassRange: string;
  vocalRange: string;
  bassPerBar: number | null;
  hasLink: boolean;
  hasAnalysis: boolean;
  hasTranscription: boolean;
  isCompared: boolean;
  compareHref: string;
}

const SORTABLE = ['title', 'category', 'bpm', 'measuredKey', 'metre', 'bassPerBar'] as const;
const PLAIN = ['bassRange', 'vocalRange', 'data', 'compare'] as const;

const matches = (row: SongTableRow, needle: string, category: string) =>
  (!category || row.category === category) &&
  (!needle || `${row.title} ${row.author ?? ''}`.toLowerCase().includes(needle));

/** Every song with its entered and measured values; sorted and filtered in the browser, compared via the URL. */
export function RepertoireStatsSongsTable({ rows }: { rows: SongTableRow[] }) {
  const t = useTranslations('RepertoireStats');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = useMemo(
    () => [...new Set(rows.flatMap((row) => (row.category ? [row.category] : [])))].sort(),
    [rows]
  );
  const filtered = useMemo(
    () => rows.filter((row) => matches(row, query.trim().toLowerCase(), category)),
    [rows, query, category]
  );
  // Rows arrive sorted by title from the server; no initial client sort, because localeCompare orders some titles
  // differently in Node and in the browser, which broke hydration.
  const { sortedItems, sortKey, direction, toggleSort } = useSortableTable(filtered);

  return (
    <section className="space-y-3">
      <RepertoireStatsSongsFilter
        query={query}
        onQuery={setQuery}
        category={category}
        onCategory={setCategory}
        categories={categories}
        shown={sortedItems.length}
        total={rows.length}
      />
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {SORTABLE.map((key) => (
                <SortableTableHead
                  key={key}
                  sortKey={key}
                  activeSortKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                >
                  {t(`column.${key}`)}
                </SortableTableHead>
              ))}
              {PLAIN.map((key) => (
                <TableHead key={key}>{t(`column.${key}`)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((row) => (
              <RepertoireStatsSongRow key={row.id} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
