import { isYoutubeVideoUrl, SongNoRecordingSchema, SongYoutubeLinkSchema } from '../SongLinkSchema';

const SONG_ID = '00000000-1111-4000-a000-000000000001';

describe('isYoutubeVideoUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=6pYMZKVZ9Ws',
    'https://youtube.com/watch?v=6pYMZKVZ9Ws&t=12s',
    'https://m.youtube.com/watch?v=6pYMZKVZ9Ws',
    'https://music.youtube.com/watch?v=6pYMZKVZ9Ws',
    'https://youtu.be/6pYMZKVZ9Ws',
    'https://www.youtube.com/shorts/abc_DEF-123',
  ])('accepts a single video: %s', (url) => {
    expect(isYoutubeVideoUrl(url)).toBe(true);
  });

  it.each([
    ['a search page', 'https://www.youtube.com/results?search_query=feist+1234'],
    ['a channel', 'https://www.youtube.com/@feist'],
    ['a playlist without a video', 'https://www.youtube.com/playlist?list=PL123'],
    ['watch without an id', 'https://www.youtube.com/watch'],
    ['a bare youtu.be', 'https://youtu.be/'],
    ['another site', 'https://vimeo.com/12345'],
    ['a look-alike host', 'https://youtube.com.evil.example/watch?v=abc'],
    ['plain http', 'http://www.youtube.com/watch?v=6pYMZKVZ9Ws'],
    ['not a url', 'feist 1234'],
    ['a script url', 'javascript:alert(1)'],
  ])('rejects %s', (_, url) => {
    expect(isYoutubeVideoUrl(url)).toBe(false);
  });
});

describe('SongYoutubeLinkSchema', () => {
  it('trims the pasted link', () => {
    const parsed = SongYoutubeLinkSchema.parse({
      songId: SONG_ID,
      url: '  https://youtu.be/6pYMZKVZ9Ws \n',
    });
    expect(parsed.url).toBe('https://youtu.be/6pYMZKVZ9Ws');
  });

  it('refuses a non-video link and a malformed song id', () => {
    expect(
      SongYoutubeLinkSchema.safeParse({ songId: SONG_ID, url: 'https://www.youtube.com/@feist' })
        .success
    ).toBe(false);
    expect(
      SongYoutubeLinkSchema.safeParse({ songId: 'nope', url: 'https://youtu.be/6pYMZKVZ9Ws' })
        .success
    ).toBe(false);
  });
});

describe('SongNoRecordingSchema', () => {
  it('knows only the two no-recording kinds', () => {
    expect(SongNoRecordingSchema.safeParse({ songId: SONG_ID, kind: 'exercise' }).success).toBe(
      true
    );
    expect(SongNoRecordingSchema.safeParse({ songId: SONG_ID, kind: 'other' }).success).toBe(true);
    expect(SongNoRecordingSchema.safeParse({ songId: SONG_ID, kind: 'Rock' }).success).toBe(false);
  });
});
