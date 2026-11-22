import { getTranslations } from 'next-intl/server';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SourcePage } from '@/lib/private-data/private-data.types';

import { formatCell } from './lab.helpers';
import { LabRowDialog } from './LabRowDialog';

type Props = { result: SourcePage };

/** A page of raw source rows: every column, one line per cell, the full row behind the row number. */
export async function LabSourceTable({ result }: Props) {
  const t = await getTranslations('Lab');
  if (result.rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>;
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            {result.columns.map((column) => (
              <TableHead key={column} className="whitespace-nowrap">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row, index) => {
            const number = result.rowNumbers[index] + 1;
            return (
              <TableRow key={number}>
                <TableCell>
                  <LabRowDialog title={t('rowDetails', { number })} value={row} />
                </TableCell>
                {result.columns.map((column) => (
                  <TableCell key={column} className="max-w-xs truncate whitespace-nowrap text-xs">
                    {formatCell(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
