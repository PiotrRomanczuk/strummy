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
import type { TabRow } from '@/lib/private-data/private-data.types';

import { LAB_PATH } from '../lab.helpers';

type Props = { tabs: TabRow[] };

export async function LabTabList({ tabs }: Props) {
  const t = await getTranslations('Lab.tabs');
  if (tabs.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>;
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columnTab')}</TableHead>
            <TableHead>{t('columnTracks')}</TableHead>
            <TableHead>{t('columnTuning')}</TableHead>
            <TableHead className="text-right">{t('columnTempo')}</TableHead>
            <TableHead className="text-right">{t('columnBars')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabs.map((tab) => (
            <TableRow key={tab.sha1}>
              <TableCell className="min-w-56">
                <Link
                  href={`${LAB_PATH}/tabs/${tab.sha1}`}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {tab.title || '—'}
                </Link>
                <span className="block text-xs text-muted-foreground">
                  {tab.artist} · {tab.format}
                  {tab.exercise && ` · ${tab.exercise.topic}`}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {tab.roles.map((role) => (
                    <Badge key={role} variant="outline" className="text-[11px]">
                      {t(`role.${role}`)}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-xs">{tab.tunings.join(', ')}</TableCell>
              <TableCell className="text-right tabular-nums">{tab.tempo ?? ''}</TableCell>
              <TableCell className="text-right tabular-nums">{tab.measures ?? ''}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
