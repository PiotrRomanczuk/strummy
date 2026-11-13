import { getTranslations } from 'next-intl/server';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TabTrack } from '@/lib/private-data/private-data.types';

import { techniquesLabel, tuningLabel } from './lab-tabs.helpers';

type Props = { tracks: TabTrack[] };

/** Each track: tuning low to high, capo, how many notes and which techniques they use. */
export async function LabTabTracks({ tracks }: Props) {
  const t = await getTranslations('Lab.tabs');
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('trackName')}</TableHead>
            <TableHead>{t('columnTuning')}</TableHead>
            <TableHead className="text-right">{t('capo')}</TableHead>
            <TableHead className="text-right">{t('notes')}</TableHead>
            <TableHead>{t('techniques')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tracks.map((track) => (
            <TableRow key={track.number}>
              <TableCell className="font-medium">{track.name || `#${track.number}`}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">
                {track.percussion ? t('role.drums') : tuningLabel(track.tuning)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{track.capo || ''}</TableCell>
              <TableCell className="text-right tabular-nums">{track.notes}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{techniquesLabel(track.techniques)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
