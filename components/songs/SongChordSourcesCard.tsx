import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getSongChordReview } from '@/lib/services/song-chord-review-queries';
import type { SongChordReview } from '@/schemas/SongChordReviewSchema';

import { Card, CardHeader } from './SongPrimitives';
import { ChordSourcesDifference } from './SongChordSourcesCard.Difference';

type Props = { songId: string };

// A review without a comparison (no recording heard, a tab in the chords field) has nothing to show here.
const SHOWN_STATUSES = new Set(['agree', 'check', 'conflict', 'no_sheet']);

const keyLabel = ({ tonic, scale }: NonNullable<SongChordReview['sounding_key']>) =>
  `${tonic}${scale === 'minor' ? 'm' : ''}`;

/**
 * Staff-only: Strummy's chords against what the recording sounds like (song2logic chord review, SNG-8) — the
 * reference source, both chord lists, each difference with the moment it is first heard, capo and key hints.
 * Fetches its own review (like ProductionTab); RLS returns nothing to a student.
 */
export const SongChordSourcesCard = async ({ songId }: Props) => {
  const review = await getSongChordReview(songId);
  if (!review?.reference || !SHOWN_STATUSES.has(review.status)) return null;

  const t = await getTranslations('Songs');
  const differences = review.differences ?? [];
  const isCapoHint = !!review.capo_hint && review.capo_matches === false;

  return (
    <Card>
      <CardHeader
        eyebrow={t('chordSourcesEyebrow')}
        title={t(`chordSourcesStatus.${review.status}`)}
      />
      <div className="flex flex-col gap-3 px-6 pb-6 text-sm text-[var(--ink-2)]">
        <p className="text-xs text-[var(--ink-3)]">
          {t(`chordSourcesReference.${review.reference}`)}
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-[var(--ink-3)]">{t('chordSourcesSheet')}</dt>
          <dd className="text-[var(--ink)]">{review.sheet_chords.join(', ') || '—'}</dd>
          <dt className="text-[var(--ink-3)]">{t('chordSourcesHeard')}</dt>
          <dd className="text-[var(--ink)]">{review.heard_chords.join(', ') || '—'}</dd>
        </dl>

        {differences.length > 0 && (
          <ul className="flex flex-col gap-2">
            {differences.map((difference) => (
              <ChordSourcesDifference
                key={`${difference.kind}-${difference.sheet}-${difference.audio}`}
                difference={difference}
                t={t}
              />
            ))}
          </ul>
        )}

        {isCapoHint && <p>{t('chordSourcesCapo', { fret: review.capo_hint ?? 0 })}</p>}
        {review.sounding_key && (
          <p>{t('chordSourcesKey', { key: keyLabel(review.sounding_key) })}</p>
        )}

        <Link
          href={`/dashboard/songs/${songId}/edit`}
          className="self-start text-xs font-medium text-[var(--ink)] underline underline-offset-2"
        >
          {t('chordSourcesEdit')}
        </Link>
      </div>
    </Card>
  );
};
