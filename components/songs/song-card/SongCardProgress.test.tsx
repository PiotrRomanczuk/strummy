import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { markSongPartTempo } from '@/app/actions/song-part-progress';
import type { CardPart } from '@/lib/music-theory/song-card';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { SongCardProgress } from './SongCardProgress';

jest.mock('@/app/actions/song-part-progress', () => ({ markSongPartTempo: jest.fn() }));

const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/dashboard/songs/song-1/card',
  useSearchParams: () => new URLSearchParams('part=2&lesson=old'),
}));

const STUDENT = '11111111-1111-4111-8111-111111111111';
const SONG = '22222222-2222-4222-8222-222222222222';
const LESSON = '33333333-3333-4333-8333-333333333333';

const part = (n: number, label: string, kind: CardPart['kind']): CardPart => ({
  n,
  kind,
  label,
  ordinal: 1,
  ofKind: 1,
  firstBar: 0,
  bars: 8,
  start: 0,
  end: 10,
  group: label,
  roman: [],
  loop: [],
  drums: null,
  bass: null,
});

const PARTS = [
  part(1, 'A', 'verse'),
  part(2, 'B', 'chorus'),
  { ...part(3, 'A', 'verse'), ordinal: 2 },
];
const students = [{ id: STUDENT, name: 'Ala', email: null }];
const base = { songId: SONG, students, studentId: STUDENT, lessonId: null, initialMarks: [] };

beforeEach(() => {
  jest.mocked(markSongPartTempo).mockReset();
  replace.mockReset();
});

describe('SongCardProgress', () => {
  it('asks for a student before showing any progress', () => {
    renderWithIntl(<SongCardProgress {...base} parts={PARTS} studentId={null} />);
    expect(screen.getByText('Pick a student to see and mark their progress.')).toBeInTheDocument();
    expect(screen.queryByTestId('progress-status')).not.toBeInTheDocument();
  });

  it('puts the picked student in the address, dropping a lesson of the previous one', () => {
    renderWithIntl(<SongCardProgress {...base} parts={PARTS} studentId={null} />);
    fireEvent.change(screen.getByLabelText('Student'), { target: { value: STUDENT } });
    expect(replace).toHaveBeenCalledWith(`/dashboard/songs/song-1/card?part=2&student=${STUDENT}`, {
      scroll: false,
    });
  });

  it('shows one row per part letter with the latest tempo, and the derived status', () => {
    const initialMarks = [
      { partLabel: 'A', tempoPercent: 60, markedAt: '2026-11-20T10:00:00Z' },
      { partLabel: 'A', tempoPercent: 75, markedAt: '2026-11-25T10:00:00Z' },
    ];
    renderWithIntl(<SongCardProgress {...base} parts={PARTS} initialMarks={initialMarks} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const verse = screen.getByTestId('progress-row-A');
    expect(within(verse).getByText(/^75% ·/)).toBeInTheDocument();
    expect(within(verse).getByRole('button', { name: /75% tempo/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(screen.getByTestId('progress-row-B')).getByText('not marked yet')).toBeVisible();
    expect(screen.getByTestId('progress-status')).toHaveTextContent('started');
  });

  it('saves a tap on a tempo for the part and the lesson, and the song becomes mastered', async () => {
    jest.mocked(markSongPartTempo).mockResolvedValue({ success: true });
    const initialMarks = [{ partLabel: 'A', tempoPercent: 100, markedAt: '2026-11-25T10:00:00Z' }];
    renderWithIntl(
      <SongCardProgress {...base} parts={PARTS} lessonId={LESSON} initialMarks={initialMarks} />
    );
    const chorus = screen.getByTestId('progress-row-B');
    fireEvent.click(within(chorus).getByRole('button', { name: /100% tempo/ }));

    await waitFor(() =>
      expect(screen.getByTestId('progress-status')).toHaveTextContent('mastered')
    );
    expect(markSongPartTempo).toHaveBeenCalledWith({
      studentId: STUDENT,
      songId: SONG,
      partLabel: 'B',
      tempoPercent: 100,
      lessonId: LESSON,
    });
  });

  it('marks a song without parts as a whole', async () => {
    jest.mocked(markSongPartTempo).mockResolvedValue({ success: true });
    renderWithIntl(<SongCardProgress {...base} parts={[]} />);
    const whole = screen.getByTestId('progress-row-whole');
    expect(within(whole).getByText('Whole song')).toBeInTheDocument();
    expect(screen.getByTestId('progress-status')).toHaveTextContent('not started');

    fireEvent.click(within(whole).getByRole('button', { name: /50% tempo/ }));
    await waitFor(() => expect(screen.getByTestId('progress-status')).toHaveTextContent('started'));
    expect(markSongPartTempo).toHaveBeenCalledWith(
      expect.objectContaining({ partLabel: null, tempoPercent: 50 })
    );
    expect(jest.mocked(markSongPartTempo).mock.calls[0][0]).not.toHaveProperty('lessonId');
  });

  it('says so on the row when the mark was not saved, and keeps the history as it was', async () => {
    jest.mocked(markSongPartTempo).mockResolvedValue({ error: 'forbidden' });
    renderWithIntl(<SongCardProgress {...base} parts={PARTS} />);
    fireEvent.click(
      within(screen.getByTestId('progress-row-A')).getByRole('button', { name: /90% tempo/ })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByTestId('progress-status')).toHaveTextContent('not started');
  });
});
