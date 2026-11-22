import type { SourceRow } from '@/lib/private-data/private-data.types';

import { recordFields } from './lab-entity.helpers';

type Props = { row: SourceRow };

export function LabRecordFields({ row }: Props) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-[max-content_1fr]">
      {recordFields(row).map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground">{key}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
