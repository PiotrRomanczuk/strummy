'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { Badge } from '@/components/ui/badge';
import { useSortableTable } from '@/hooks/useSortableTable';
import type { AppleShortcutSongImportLog } from './import-logs.types';

interface ImportLogsTableProps {
  logs: AppleShortcutSongImportLog[];
}

export function ImportLogsTable({ logs }: ImportLogsTableProps) {
  const { sortedItems, sortKey, direction, toggleSort } = useSortableTable(logs, {
    getSortValue: (log, key) => {
      if (key === 'song_title') return log.song_title ?? '';
      return log[key as keyof AppleShortcutSongImportLog] as string;
    },
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead
            sortKey="created_at"
            activeSortKey={sortKey}
            direction={direction}
            onSort={toggleSort}
          >
            Date
          </SortableTableHead>
          <SortableTableHead
            sortKey="song_title"
            activeSortKey={sortKey}
            direction={direction}
            onSort={toggleSort}
          >
            Song
          </SortableTableHead>
          <SortableTableHead
            sortKey="status"
            activeSortKey={sortKey}
            direction={direction}
            onSort={toggleSort}
          >
            Status
          </SortableTableHead>
          <TableHead>Error Message</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedItems.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
              No import logs found
            </TableCell>
          </TableRow>
        ) : (
          sortedItems.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                {new Date(log.created_at).toLocaleString('en-US')}
              </TableCell>
              <TableCell>
                {log.song_title ? (
                  <div className="flex flex-col">
                    <span className="font-medium">{log.song_title}</span>
                    {log.song_artist && (
                      <span className="text-xs text-muted-foreground">by {log.song_artist}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    log.status === 'success'
                      ? 'completed'
                      : log.status === 'error'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {log.status}
                </Badge>
              </TableCell>
              <TableCell
                className="max-w-xs truncate text-muted-foreground"
                title={log.error_message || ''}
              >
                {log.error_message || '-'}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
