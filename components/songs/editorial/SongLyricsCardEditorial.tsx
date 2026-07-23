import { Card, CardHeader } from './primitives';

type Props = { lyrics: string | null | undefined };

/** A `[Section]` header line, e.g. `[Verse 1]` or `[Chorus]`. */
const isSectionHeader = (line: string): boolean => /^\s*\[.+\]\s*$/.test(line);

/**
 * Renders the song's `lyrics_with_chords` on the detail page. The column stores
 * plain "chords-over-lyrics" text (a chord line above each lyric line, aligned
 * by hand in a monospace font — see the create/edit form's Lyrics field), so we
 * render it verbatim in monospace with whitespace preserved: that keeps the
 * teacher's chord positioning intact without re-parsing it. `[Section]` headers
 * are lifted into gold labels to give the block an editorial rhythm.
 *
 * Returns null when there are no lyrics on file, so lyric-less songs show no
 * empty card. Visible to teachers and students alike (mounted in the Overview
 * column of SongDetailEditorial), which is the point: lyrics teachers enter in
 * the form were previously written but never displayed anywhere.
 */
export const SongLyricsCardEditorial = ({ lyrics }: Props) => {
  const text = lyrics?.trim();
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <Card>
      <CardHeader eyebrow="Lyrics & chords" title="Lyrics" />
      <div
        style={{
          padding: '0 24px 24px',
          overflowX: 'auto',
          fontFamily: 'var(--mono)',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        {lines.map((line, i) =>
          isSectionHeader(line) ? (
            <div
              key={i}
              style={{
                color: 'var(--gold-2)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                fontSize: 11,
                margin: i === 0 ? '0 0 4px' : '16px 0 4px',
              }}
            >
              {line.replace(/[[\]]/g, '').trim()}
            </div>
          ) : (
            <div key={i} style={{ whiteSpace: 'pre', color: 'var(--ink-2)', minHeight: '1.6em' }}>
              {line}
            </div>
          )
        )}
      </div>
    </Card>
  );
};
