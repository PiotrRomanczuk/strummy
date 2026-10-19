import { fireEvent, screen, waitFor } from '@testing-library/react';

import {
  applyLessonDraftAction,
  generateLessonDraftAction,
} from '@/app/dashboard/lessons/transcript-draft-actions';
import type { ResolvedLessonDraft } from '@/lib/ai/schemas/lesson-transcript-draft';
import type { LessonTranscriptDraftState } from '@/lib/services/lesson-transcript-queries';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { LessonTranscriptDraftCard } from './LessonDetail.TranscriptDraft';

jest.mock('@/app/dashboard/lessons/transcript-draft-actions', () => ({
  generateLessonDraftAction: jest.fn(),
  applyLessonDraftAction: jest.fn(),
  dismissLessonDraftAction: jest.fn(),
}));

const QUEEN = '22222222-2222-4222-8222-222222222222';
const LESSON = 'lesson-1';

const content: ResolvedLessonDraft = {
  isGuitarLesson: true,
  lessonTitle: 'Power chords',
  songs: [
    {
      heardTitle: 'Queen riff',
      heardArtist: 'Queen',
      catalogTitle: "Now I'm Here",
      role: 'practiced',
      status: 'started',
      sections: [],
      notes: ['Lighter palm muting'],
      songFacts: { capoFret: null, strummingPattern: null, chords: [] },
      confidence: 0.9,
      evidence: '',
      match: { songId: QUEEN, title: "Now I'm Here", author: 'Queen', score: 1 },
    },
    {
      heardTitle: 'Smoke on the Water',
      heardArtist: null,
      catalogTitle: null,
      role: 'mentioned',
      status: null,
      sections: [],
      notes: [],
      songFacts: { capoFret: null, strummingPattern: null, chords: [] },
      confidence: 0.9,
      evidence: '',
      match: { songId: null, title: null, author: null, score: 0 },
    },
  ],
  assignment: null,
  skills: [],
  notes: { technique: [], theory: [], wentWell: [], needsWork: [], other: [] },
  teacherCommitments: ['Send the tabs'],
  profileHints: [],
  logistics: [],
  questions: [],
};

const state = (overrides: Partial<LessonTranscriptDraftState>): LessonTranscriptDraftState => ({
  status: 'none',
  content: null,
  error: null,
  generatedAt: null,
  appliedAt: null,
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('LessonTranscriptDraftCard', () => {
  it('offers to generate when there is no draft and shows a failure', async () => {
    (generateLessonDraftAction as jest.Mock).mockResolvedValue({ success: false, error: 'rate limited' });
    renderWithIntl(<LessonTranscriptDraftCard lessonId={LESSON} draft={state({})} />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate draft' }));

    expect(generateLessonDraftAction).toHaveBeenCalledWith(LESSON);
    expect(await screen.findByRole('alert')).toHaveTextContent('rate limited');
  });

  it('shows the review with the matched song ticked and the mention unticked', () => {
    renderWithIntl(
      <LessonTranscriptDraftCard lessonId={LESSON} draft={state({ status: 'ready', content, generatedAt: 'x' })} />
    );
    const rows = screen.getAllByTestId('draft-song');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Now I'm Here");
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
    expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked();
    expect(screen.getByText('Send the tabs')).toBeInTheDocument();
  });

  it('applies only the ticked songs and never marks the lesson completed by default', async () => {
    (applyLessonDraftAction as jest.Mock).mockResolvedValue({ success: true });
    renderWithIntl(
      <LessonTranscriptDraftCard lessonId={LESSON} draft={state({ status: 'ready', content, generatedAt: 'x' })} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save to lesson' }));

    await waitFor(() => expect(applyLessonDraftAction).toHaveBeenCalled());
    const [, selection] = (applyLessonDraftAction as jest.Mock).mock.calls[0];
    expect(selection.songs).toEqual([{ songId: QUEEN, newSong: null, status: 'started', notes: 'Lighter palm muting' }]);
    expect(selection.markCompleted).toBe(false);
  });

  it('collapses to one line once applied', () => {
    renderWithIntl(
      <LessonTranscriptDraftCard
        lessonId={LESSON}
        draft={state({ status: 'applied', appliedAt: '2026-10-19T10:00:00Z' })}
      />
    );
    expect(screen.getByTestId('transcript-draft-applied')).toHaveTextContent('2026-10-19');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
