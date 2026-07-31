import { getTranslations } from 'next-intl/server';

import { Card, CardHeader } from './SongPrimitives';

type Props = { notes: string | null | undefined };

/**
 * The song's free-text `notes` column (capo hints, BPM, arrangement remarks —
 * also filled by the WhatsApp importer). Previously stored but never displayed.
 * Visible to every role. Returns null when no notes are on file.
 */
export const SongNotesCard = async ({ notes }: Props) => {
  const text = notes?.trim();
  if (!text) return null;

  const t = await getTranslations('Songs');

  return (
    <Card>
      <CardHeader eyebrow={t('notesEyebrow')} title={t('notesTitle')} />
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
