import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LessonTranscriptDraftCard } from './LessonDetail.TranscriptDraft';
import type { TranscriptDraftRecord } from '@/lib/services/transcript-draft.helpers';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pl',
}));
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
// Resolved lazily — `toast` is read at the hook module's import time, before
// this const initialises under jest.mock hoisting.
jest.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => mockToast.success(...a),
    error: (...a: unknown[]) => mockToast.error(...a),
    warning: (...a: unknown[]) => mockToast.warning(...a),
  },
}));

const actions = {
  generateTranscriptDraftAction: jest.fn(),
  discardTranscriptDraftAction: jest.fn(),
  acceptDraftNotesAction: jest.fn(),
  acceptDraftNextLessonAction: jest.fn(),
};
jest.mock('@/app/actions/transcript-draft', () => ({
  generateTranscriptDraftAction: (...a: unknown[]) => actions.generateTranscriptDraftAction(...a),
  discardTranscriptDraftAction: (...a: unknown[]) => actions.discardTranscriptDraftAction(...a),
  acceptDraftNotesAction: (...a: unknown[]) => actions.acceptDraftNotesAction(...a),
  acceptDraftNextLessonAction: (...a: unknown[]) => actions.acceptDraftNextLessonAction(...a),
}));
const acceptSong = jest.fn();
jest.mock('@/app/actions/transcript-draft-accept', () => ({
  acceptDraftSongAction: (...a: unknown[]) => acceptSong(...a),
  acceptDraftHomeworkAction: jest.fn(),
}));

const draft: TranscriptDraftRecord = {
  runId: 'run-1',
  generatedAt: '2026-10-14T10:00:00.000Z',
  model: 'test-model',
  accepted: { notes: false, songs: [], homework: [1], nextLesson: [] },
  resolvedSongs: [
    { match: 'matched', songId: 'song-1', title: "Now I'm Here", author: 'Queen', similarity: 1 },
    {
      match: 'candidates',
      candidates: [
        { songId: 'song-2', title: 'Hammer Falls Down', author: 'Queen', similarity: 0.5 },
      ],
    },
    { match: 'new' },
  ],
  draft: {
    notes_pl: 'Co ćwiczyliśmy\n- A-D-E',
    songs: [
      {
        title: "Now I'm Here",
        artist: 'Queen',
        confidence: 1,
        sentiment: 'enthusiastic',
        suggested_status: 'started',
        quotes: ['sztos'],
      },
      {
        title: 'Hammer to Fall',
        artist: 'Queen',
        confidence: 1,
        sentiment: 'neutral',
        suggested_status: 'to_learn',
        quotes: [],
      },
      {
        title: 'Brand New Song',
        confidence: 0.7,
        sentiment: 'neutral',
        suggested_status: 'to_learn',
        quotes: [],
      },
    ],
    homework: [
      { title: 'Ćwicz A-D-E', description: '5 minut dziennie' },
      { title: 'Już dodane', description: '' },
    ],
    next_lesson: ['Zwrotka'],
  },
};

beforeEach(() => jest.clearAllMocks());

describe('LessonTranscriptDraftCard', () => {
  it('without a draft shows the generate button and calls the action', async () => {
    actions.generateTranscriptDraftAction.mockResolvedValue({ ok: true });
    render(<LessonTranscriptDraftCard lessonId="l-1" studentId="s-1" draft={null} />);
    expect(screen.queryByText('draftDiscard')).toBeNull();
    fireEvent.click(screen.getByText('draftGenerate'));
    await waitFor(() => expect(actions.generateTranscriptDraftAction).toHaveBeenCalledWith('l-1'));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockToast.success).toHaveBeenCalledWith('draftReady');
  });

  it('with a draft renders notes, each song state, homework ✓ and next-lesson rows', () => {
    render(<LessonTranscriptDraftCard lessonId="l-1" studentId="s-1" draft={draft} />);
    expect(screen.getByText(/Co ćwiczyliśmy/)).toBeInTheDocument();
    expect(screen.getByText('draftSaveNotes')).toBeInTheDocument();
    // matched + candidates both offer "Dodaj do lekcji"; the new one links to the song form.
    expect(screen.getAllByText('draftAddToLesson')).toHaveLength(2);
    expect(screen.getByText('draftNewSong')).toHaveAttribute(
      'href',
      expect.stringContaining('/dashboard/songs/new?title=Brand+New+Song')
    );
    expect(screen.getByLabelText('draftPickCandidate')).toBeInTheDocument();
    expect(screen.getByText('draftEnthusiastic')).toBeInTheDocument();
    // homework[1] is accepted → ✓ instead of a button
    expect(screen.getAllByText('draftCreateAssignment')).toHaveLength(1);
    expect(screen.getAllByText('draftAccepted')).toHaveLength(1);
    expect(screen.getByText('draftToNextPlan')).toBeInTheDocument();
    expect(screen.getByText('draftDiscard')).toBeInTheDocument();
  });

  it('matched song: status prefilled from the suggestion, accept sends songId + status', async () => {
    acceptSong.mockResolvedValue({ ok: true });
    render(<LessonTranscriptDraftCard lessonId="l-1" studentId="s-1" draft={draft} />);
    const [status] = screen.getAllByLabelText('draftStatusLabel') as HTMLSelectElement[];
    expect(status.value).toBe('started');
    fireEvent.click(screen.getAllByText('draftAddToLesson')[0]);
    await waitFor(() =>
      expect(acceptSong).toHaveBeenCalledWith('l-1', {
        index: 0,
        songId: 'song-1',
        status: 'started',
      })
    );
  });

  it('candidate song: the accept button is disabled until a candidate is picked', () => {
    render(<LessonTranscriptDraftCard lessonId="l-1" studentId="s-1" draft={draft} />);
    const button = screen.getAllByText('draftAddToLesson')[1] as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('draftPickCandidate'), { target: { value: 'song-2' } });
    expect(button.disabled).toBe(false);
  });

  it('shows a warning toast and does not refresh when there is no next lesson', async () => {
    actions.acceptDraftNextLessonAction.mockResolvedValue({ ok: true, noNextLesson: true });
    render(<LessonTranscriptDraftCard lessonId="l-1" studentId="s-1" draft={draft} />);
    fireEvent.click(screen.getByText('draftToNextPlan'));
    await waitFor(() => expect(mockToast.warning).toHaveBeenCalledWith('draftNoNextLesson'));
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('surfaces an action error as an error toast', async () => {
    actions.acceptDraftNotesAction.mockResolvedValue({ ok: false, error: 'boom' });
    render(<LessonTranscriptDraftCard lessonId="l-1" studentId="s-1" draft={draft} />);
    fireEvent.click(screen.getByText('draftSaveNotes'));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('boom'));
  });
});
