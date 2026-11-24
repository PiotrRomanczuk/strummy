/**
 * useCardReview: a change shows at once and is saved in the background; a failed save goes back to what was
 * stored; only the answer to the latest change counts.
 */

import { act, renderHook } from '@testing-library/react';

import { saveSongCardReview } from '@/app/dashboard/songs/[id]/card/actions';
import { EMPTY_REVIEW, type CardReview } from '@/lib/music-theory/song-card-review';

import { useCardReview } from './useCardReview';

jest.mock('@/app/dashboard/songs/[id]/card/actions', () => ({ saveSongCardReview: jest.fn() }));

type Answer = Awaited<ReturnType<typeof saveSongCardReview>>;

/** Each save waits until the test answers it. */
const pending: ((answer: Answer) => void)[] = [];
beforeEach(() => {
  pending.length = 0;
  jest
    .mocked(saveSongCardReview)
    .mockImplementation(() => new Promise<Answer>((resolve) => void pending.push(resolve)));
});

const answer = async (index: number, result: Answer) => {
  await act(async () => pending[index](result));
};

const stored = (groups: string[]): CardReview => ({ ...EMPTY_REVIEW, approvedGroups: groups });

const render = () =>
  renderHook(() => useCardReview({ songId: 's1', videoId: 'v1', initial: EMPTY_REVIEW }));

describe('useCardReview', () => {
  it('shows a change at once and keeps what the server stored', async () => {
    const { result } = render();
    act(() => result.current.save({ kind: 'approve', group: 'verse:I', isApproved: true }));
    expect(result.current.review.approvedGroups).toEqual(['verse:I']);
    expect(saveSongCardReview).toHaveBeenCalledWith('s1', 'v1', {
      kind: 'approve',
      group: 'verse:I',
      isApproved: true,
    });
    await answer(0, { review: stored(['verse:I']) });
    expect(result.current).toMatchObject({ review: stored(['verse:I']), hasFailed: false });
  });

  it('goes back to the stored review when the save fails', async () => {
    const { result } = render();
    act(() => result.current.save({ kind: 'chord', bar: 3, chord: 'G' }));
    expect(result.current.review.chordEdits).toEqual({ 3: 'G' });
    await answer(0, { error: 'failed' });
    expect(result.current).toMatchObject({ review: EMPTY_REVIEW, hasFailed: true });
  });

  it('ignores a late answer to an older change', async () => {
    const { result } = render();
    act(() => result.current.save({ kind: 'approve', group: 'verse:I', isApproved: true }));
    act(() => result.current.save({ kind: 'approve', group: 'chorus:IV', isApproved: true }));
    await answer(0, { review: stored(['verse:I']) });
    expect(result.current.review.approvedGroups).toEqual(['verse:I', 'chorus:IV']);
    await answer(1, { review: stored(['verse:I', 'chorus:IV']) });
    expect(result.current.review.approvedGroups).toEqual(['verse:I', 'chorus:IV']);
  });
});
