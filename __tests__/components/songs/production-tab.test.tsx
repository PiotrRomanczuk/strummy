/**
 * production-tab.test — the song page's inline content tabs
 * (SongDetailContentTabs) carry the staff-only Production tab next to
 * Chords & structure / Lyrics, and SongDetail only passes it for teacher/admin
 * (canSeeProduction).
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl, renderServerTree } from '@/lib/testing/intl-test-utils';

// Stub out heavy children so the render stays fast.
jest.mock('@/components/songs/production/RecordingList', () => ({
  __esModule: true,
  default: ({ songId }: { songId: string }) => (
    <div data-testid="recording-list" data-song-id={songId} />
  ),
}));

jest.mock('@/components/songs/production/PostList', () => ({
  __esModule: true,
  default: ({ songId }: { songId: string }) => (
    <div data-testid="post-list" data-song-id={songId} />
  ),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
  usePathname: jest.fn(() => '/dashboard/songs/song-abc'),
}));

import ProductionTab from '@/components/songs/production/ProductionTab';
import { SongDetailContentTabs } from '@/components/songs/SongDetail.ContentTabs';
import { SongDetail } from '@/components/songs/SongDetail';
import type { Song } from '@/components/songs/types';

const SONG_ID = 'song-abc';
const ChordsStub = <div data-testid="chords-stub">Chords content</div>;
const LyricsStub = <div data-testid="lyrics-stub">Lyrics content</div>;

function renderTabs(withProduction: boolean) {
  return renderWithIntl(
    <SongDetailContentTabs
      chords={ChordsStub}
      lyrics={LyricsStub}
      production={withProduction ? <ProductionTab songId={SONG_ID} /> : undefined}
    />
  );
}

describe('SongDetailContentTabs', () => {
  it('shows the Chords & structure tab by default', () => {
    renderTabs(true);
    expect(screen.getByTestId('chords-stub')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Chords & structure' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByTestId('post-list')).not.toBeInTheDocument();
  });

  it('switches to the Production tab on click and passes songId down', () => {
    renderTabs(true);
    fireEvent.click(screen.getByRole('tab', { name: 'Production' }));
    expect(screen.getByTestId('post-list')).toHaveAttribute('data-song-id', SONG_ID);
    expect(screen.getByTestId('recording-list')).toHaveAttribute('data-song-id', SONG_ID);
    expect(screen.queryByTestId('chords-stub')).not.toBeInTheDocument();
  });

  it('switches back to Chords & structure after visiting Production', () => {
    renderTabs(true);
    fireEvent.click(screen.getByRole('tab', { name: 'Production' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Chords & structure' }));
    expect(screen.getByTestId('chords-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('post-list')).not.toBeInTheDocument();
  });

  it('omits the Production tab when no production content is passed', () => {
    renderTabs(false);
    expect(screen.queryByRole('tab', { name: 'Production' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Lyrics' }));
    expect(screen.getByTestId('lyrics-stub')).toBeInTheDocument();
  });
});

describe('SongDetail — canSeeProduction gate', () => {
  const minimalSong = { id: SONG_ID, title: 'Test Song', chords: null, level: null } as Song;
  const stats = { assignedTo: 0, usedInLessons: 0, inLibrarySince: null, avgMastery: 0 };

  it('renders the Production tab for teacher/admin', async () => {
    await renderServerTree(
      <SongDetail
        song={minimalSong}
        stats={stats}
        learners={[]}
        related={[]}
        sections={[]}
        canSeeProduction
      />
    );
    expect(screen.getByRole('tab', { name: 'Production' })).toBeInTheDocument();
  });

  it('omits the Production tab for students (canSeeProduction=false)', async () => {
    await renderServerTree(
      <SongDetail
        song={minimalSong}
        stats={stats}
        learners={[]}
        related={[]}
        sections={[]}
        canSeeProduction={false}
      />
    );
    expect(screen.queryByRole('tab', { name: 'Production' })).not.toBeInTheDocument();
  });
});
