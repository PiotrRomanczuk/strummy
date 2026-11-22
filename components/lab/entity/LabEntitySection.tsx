import { getTranslations } from 'next-intl/server';

import type { SourceRow } from '@/lib/private-data/private-data.types';

import { LabRowDialog } from '../LabRowDialog';
import { LabChordSheet } from './LabChordSheet';
import { LabChordTimeline } from './LabChordTimeline';
import { LabRecordFields } from './LabRecordFields';
import { LabTabLinks } from './LabTabLinks';

type Props = {
  sourceId: string;
  label: string;
  value: SourceRow[] | SourceRow;
};

type BodyProps = {
  sourceId: string;
  row: SourceRow;
  labels: { chords: string; annotation: string; bestTab: string };
};

function versionsOf(row: SourceRow): SourceRow[] {
  return Array.isArray(row.versions) ? (row.versions as SourceRow[]) : [];
}

/** The readable part of a row; the rest is one click away in the JSON dialog. */
function SectionBody({ sourceId, row, labels }: BodyProps) {
  switch (sourceId) {
    case 'chord-id':
    case 'chord-id-strummy':
      return <LabChordTimeline chords={row.chords} label={labels.chords} />;
    case 'chordonomicon':
      return <LabChordSheet text={row.chords} />;
    case 'gp-songs':
      return <LabTabLinks row={row} bestLabel={labels.bestTab} />;
    case 'chordonomicon-versions':
      return (
        <div className="space-y-3">
          {versionsOf(row).map((version) => (
            <div key={String(version.id)} className="space-y-1">
              <p className="text-xs text-muted-foreground">#{String(version.id)}</p>
              <LabChordSheet text={version.chords} />
            </div>
          ))}
        </div>
      );
    case 'logic-projects':
      return (
        <div className="space-y-2">
          <LabRecordFields row={row} />
          {Array.isArray(row.chords) && <p className="font-mono text-xs">{row.chords.join('  ')}</p>}
        </div>
      );
    case 'mcgill-billboard':
      return (
        <div className="space-y-2">
          <LabRecordFields row={row} />
          {typeof row.salami_chords === 'string' && (
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">{labels.annotation}</summary>
              <pre className="mt-2 max-h-80 overflow-auto rounded bg-muted p-2 text-[11px] dark:bg-muted/50">
                {row.salami_chords}
              </pre>
            </details>
          )}
        </div>
      );
    default:
      return <LabRecordFields row={row} />;
  }
}

/** One source's rows about the song. */
export async function LabEntitySection({ sourceId, label, value }: Props) {
  const t = await getTranslations('Lab.entity');
  const rows = Array.isArray(value) ? value : [value];
  const labels = { chords: t('chords'), annotation: t('annotation'), bestTab: t('bestTab') };
  return (
    <section className="space-y-3 rounded-md border p-4 dark:border-input" aria-label={label}>
      <h2 className="text-base font-semibold">
        {label}
        {rows.length > 1 && <span className="ml-2 text-xs text-muted-foreground">×{rows.length}</span>}
      </h2>
      {rows.map((row, index) => (
        <div key={index} className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
          <SectionBody sourceId={sourceId} row={row} labels={labels} />
          <LabRowDialog title={t('rawRow', { source: label, number: index + 1 })} value={row} />
        </div>
      ))}
    </section>
  );
}
