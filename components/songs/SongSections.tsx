import type { SongSection } from '@/components/songs/types';
import { getSongMap } from '@/lib/services/song-segments-queries';

import { SongSectionsCard } from './SongSections.Card';

type Props = {
  songId: string;
  sections: SongSection[];
  canEdit: boolean;
};

/**
 * The hand-written sections of a song. When there are none but song2logic's map of the recording is there, an
 * empty card under the map says nothing the map does not (#1242): staff who can edit keep a single "Add section"
 * button, everyone else sees nothing.
 */
export const SongSections = async ({ songId, sections, canEdit }: Props) => {
  if (sections.length === 0 && (await getSongMap(songId))) {
    return canEdit ? <SongSectionsCard songId={songId} sections={[]} canEdit isCompact /> : null;
  }
  return <SongSectionsCard songId={songId} sections={sections} canEdit={canEdit} />;
};
