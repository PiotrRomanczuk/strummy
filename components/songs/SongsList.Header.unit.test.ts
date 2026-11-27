import type { SongsListFilters } from '@/lib/services/songs-list-queries';

import { songsColumns } from './SongsList.Header';
import { SONGS_TEMPLATE } from './songs-row.styles';

const t = (key: string) => key;
const filters = {} as SongsListFilters;

/** Tracks in a grid template; `minmax(0, 1fr)` counts as one. */
const trackCount = (template: string) => template.match(/minmax\([^)]*\)|\S+/g)?.length ?? 0;

describe('songs list header vs grid template', () => {
  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])('hasAction=%s isCompact=%s: one header per grid track', (hasAction, isCompact) => {
    const columns = songsColumns(t, filters, hasAction, isCompact);
    expect(columns).toHaveLength(trackCount(SONGS_TEMPLATE(hasAction, isCompact)));
  });

  it('drops mastery and added only in compact mode', () => {
    const labels = (isCompact: boolean) =>
      songsColumns(t, filters, false, isCompact).map((c) => c.label);
    expect(labels(false)).toEqual(expect.arrayContaining(['colMastery', 'colAdded']));
    expect(labels(true)).not.toEqual(expect.arrayContaining(['colMastery']));
    expect(labels(true)).not.toEqual(expect.arrayContaining(['colAdded']));
  });

  it('ignores ?selected= on its own: compact is the caller’s decision', () => {
    const withSelected = { selected: 'song-off-this-page' } as SongsListFilters;
    expect(songsColumns(t, withSelected, false)).toHaveLength(
      trackCount(SONGS_TEMPLATE(false, false))
    );
  });
});
