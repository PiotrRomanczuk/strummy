import { getTranslations } from 'next-intl/server';

import { parseChordsColumn } from '@/lib/music-theory/chord-parser';
import type { Song, SongSection } from '@/components/songs/types';
import type {
  RelatedSongRow,
  SongLearner,
  SongUsageStats,
  ViewerSongEntry,
} from '@/lib/services/song-detail-queries';
import type { StudentPickerOption } from '@/components/users/student-picker/StudentPicker';

import { SongChordsCard } from './SongChordsCard';
import { SongLyricsCard } from './SongLyricsCard';
import { SongNotesCard } from './SongNotesCard';
import { SongResourcesCard } from './SongResourcesCard';
import { SongDetailTabs } from './SongDetailTabs';
import { SongDetailContentTabs } from './SongDetail.ContentTabs';
import { SongHero } from './SongHero';
import { SongSections } from './SongSections';
import { SongAudioPlayer } from './SongAudioPlayer';
import {
  LearnersCard,
  QuickAssignCard,
  RelatedCard,
  UsageCard,
  YourProgressCard,
} from './SongSidebar';

type Props = {
  song: Song;
  stats: SongUsageStats;
  learners: SongLearner[];
  related: RelatedSongRow[];
  sections: SongSection[];
  /** Teacher/admin only — roster for the Quick Assign sidebar widget. */
  students?: StudentPickerOption[];
  /** The viewer's own repertoire row for this song, if they have one. */
  viewerEntry?: ViewerSongEntry | null;
  /** Student viewers may mark the song "want to learn"; parents may not. */
  canPickToLearn?: boolean;
  /** Teacher/admin only — gates the Production tab. Students never see it. */
  canSeeProduction: boolean;
  /** Teacher/admin only — shows the "Edit song" link in the hero. */
  canEdit?: boolean;
};

const upperCaseChordRoots = (chords: string | null | undefined): string => {
  if (!chords) return '';
  return chords.replace(/(^|[,\s{])([a-g])/g, (_, sep, c) => `${sep}${c.toUpperCase()}`);
};

const chordTokensFromSong = (song: Song): string[] => {
  const parsed = parseChordsColumn(upperCaseChordRoots(song.chords));
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const c of parsed) {
    if (seen.has(c.raw)) continue;
    seen.add(c.raw);
    tokens.push(c.raw);
  }
  return tokens;
};

export const SongDetail = async ({
  song,
  stats,
  learners,
  related,
  sections,
  students = [],
  viewerEntry = null,
  canPickToLearn = false,
  canSeeProduction,
  canEdit = false,
}: Props) => {
  const t = await getTranslations('Songs');
  const chordTokens = chordTokensFromSong(song);

  // Students get their own progress, not studio analytics phrased for staff.
  const isStaffViewer = canSeeProduction;

  const chordsAndStructure = (
    <>
      <SongChordsCard title={song.title ?? t('thisSongFallback')} chordTokens={chordTokens} />
      {canSeeProduction && <SongSections songId={song.id} sections={sections} canEdit={canEdit} />}
    </>
  );

  const lyrics = (
    <>
      <SongLyricsCard lyrics={song.lyrics_with_chords} />
      <SongNotesCard notes={song.notes} />
    </>
  );

  const overview = (
    <div className="ui-grid-hero" style={{ padding: '24px 32px 0' }}>
      <SongDetailContentTabs chords={chordsAndStructure} lyrics={lyrics} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SongResourcesCard
          ultimateGuitarLink={song.ultimate_guitar_link}
          youtubeUrl={song.youtube_url}
          spotifyLinkUrl={song.spotify_link_url}
          tiktokShortUrl={song.tiktok_short_url}
        />
        {isStaffViewer ? (
          <>
            <UsageCard stats={stats} />
            <QuickAssignCard songId={song.id} students={students} />
            <LearnersCard learners={learners} />
          </>
        ) : (
          <YourProgressCard entry={viewerEntry} songId={song.id} canPick={canPickToLearn} />
        )}
        <RelatedCard related={related} />
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
        padding: '0 0 60px',
      }}
    >
      <SongHero song={song} chordTokens={chordTokens} canEdit={canEdit} />
      <div style={{ padding: '20px 32px 0' }}>
        <SongAudioPlayer audioFiles={song.audio_files} />
      </div>
      {canSeeProduction ? <SongDetailTabs songId={song.id} overview={overview} /> : overview}
    </div>
  );
};
