import { Card, CardHeader } from './primitives';

type Props = { notes: string | null | undefined };

/**
 * The song's free-text `notes` column (capo hints, BPM, arrangement remarks —
 * also filled by the WhatsApp importer). Previously stored but never displayed.
 * Visible to every role. Returns null when no notes are on file.
 */
export const SongNotesCardEditorial = ({ notes }: Props) => {
  const text = notes?.trim();
  if (!text) return null;

  return (
    <Card>
      <CardHeader eyebrow="From the studio" title="Notes" />
      <div
        style={{
          padding: '0 24px 22px',
          fontFamily: 'var(--serif)',
          fontSize: 15,
          fontStyle: 'italic',
          lineHeight: 1.5,
          color: 'var(--ink-2)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </div>
    </Card>
  );
};
