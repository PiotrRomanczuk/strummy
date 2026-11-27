import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SongEntity } from '@/lib/private-data/private-data.types';

import { LAB_PATH } from './lab.helpers';

type Props = {
  songs: SongEntity[];
  labels: Record<string, string>;
};

export async function LabSongList({ songs, labels }: Props) {
  const t = await getTranslations('Lab.songs');
  if (songs.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>;
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columnSong')}</TableHead>
            <TableHead>{t('columnSources')}</TableHead>
            <TableHead className="text-right">{t('columnTabs')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {songs.map((song) => (
            <TableRow key={song.id}>
              <TableCell className="min-w-56">
                <Link
                  href={`${LAB_PATH}/songs/${song.id}`}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {song.title || '—'}
                </Link>
                <span className="block text-xs text-muted-foreground">{song.artist}</span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(song.sources).map((source) => (
                    <Badge key={source} variant="outline" className="text-[11px]">
                      {labels[source] ?? source}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{song.tabs || ''}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
