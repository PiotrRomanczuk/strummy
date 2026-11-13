import type { RecordQuality } from '@/lib/data-quality/quality.types';
import type { SongEntity } from '@/lib/private-data/private-data.types';

import { LabCard } from './SongSidebar.LabCard';
import { QualityCard } from './SongSidebar.QualityCard';

export type SongAdminData = {
  /** Data-quality score and what is missing. */
  quality: RecordQuality | null;
  /** The song in the owner's private data hub; null anywhere but the owner's Mac. */
  labEntity: SongEntity | null;
};

/** The sidebar cards only the admin sees. */
export function AdminCards({ quality, labEntity, songId }: SongAdminData & { songId: string }) {
  return (
    <>
      {quality && <QualityCard quality={quality} songId={songId} />}
      {labEntity && <LabCard entity={labEntity} />}
    </>
  );
}
