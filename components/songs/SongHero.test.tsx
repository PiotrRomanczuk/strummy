/**
 * SongHero's "Edit song" link and "Delete song" button are both gated behind
 * `canEdit` (teacher/admin only — wired from `isAdmin || isTeacher` in
 * app/dashboard/songs/[id]/page.tsx). This locks in that they render when
 * allowed, point at/act on the right song, and — critically — stay absent by
 * default so students never see them.
 */
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { SongHero } from './SongHero';
import type { Song } from '@/components/songs/types';

const SONG = { id: 'song-abc', title: 'Wonderwall' } as Song;

describe('SongHero — edit link gating', () => {
  it('renders no "Edit song" link when canEdit is omitted (students)', async () => {
    await renderServerTree(<SongHero song={SONG} chordTokens={[]} />);
    expect(screen.queryByRole('link', { name: 'Edit song' })).not.toBeInTheDocument();
  });

  it('renders no "Edit song" link when canEdit is false', async () => {
    await renderServerTree(<SongHero song={SONG} chordTokens={[]} canEdit={false} />);
    expect(screen.queryByRole('link', { name: 'Edit song' })).not.toBeInTheDocument();
  });

  it('renders an "Edit song" link to the edit route when canEdit is true', async () => {
    await renderServerTree(<SongHero song={SONG} chordTokens={[]} canEdit />);
    const link = screen.getByRole('link', { name: 'Edit song' });
    expect(link).toHaveAttribute('href', '/dashboard/songs/song-abc/edit');
  });
});

describe('SongHero — delete button gating', () => {
  it('renders no "Delete song" button when canEdit is omitted (students)', async () => {
    await renderServerTree(<SongHero song={SONG} chordTokens={[]} />);
    expect(screen.queryByRole('button', { name: 'Delete song' })).not.toBeInTheDocument();
  });

  it('renders no "Delete song" button when canEdit is false', async () => {
    await renderServerTree(<SongHero song={SONG} chordTokens={[]} canEdit={false} />);
    expect(screen.queryByRole('button', { name: 'Delete song' })).not.toBeInTheDocument();
  });

  it('renders a "Delete song" button when canEdit is true', async () => {
    await renderServerTree(<SongHero song={SONG} chordTokens={[]} canEdit />);
    expect(screen.getByRole('button', { name: 'Delete song' })).toBeInTheDocument();
  });
});
