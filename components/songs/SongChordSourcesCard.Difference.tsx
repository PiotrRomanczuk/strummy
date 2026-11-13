import type { getTranslations } from 'next-intl/server';

import type { ChordDifference } from '@/schemas/SongChordReviewSchema';

import { msToClock } from './song-format.helpers';

type Translate = Awaited<ReturnType<typeof getTranslations>>;

type Props = { difference: ChordDifference; t: Translate };

/** "B → Bm", "+ G", "− Asus2": what is written against what is heard. */
const chordsOf = ({ kind, sheet, audio, audio_as_written }: ChordDifference): string => {
  const heard = audio_as_written ? `${audio} (${audio_as_written})` : audio;
  if (kind === 'missing_in_sheet') return `+ ${heard}`;
  if (kind === 'not_heard') return `− ${sheet}`;
  return `${sheet} → ${heard}`;
};

/** One difference between Strummy's chords and the recording, with where it is heard and who agrees. */
export const ChordSourcesDifference = ({ difference, t }: Props) => {
  const at = difference.first_s === null ? '' : msToClock(difference.first_s * 1000);
  const votes = (['analyze', 'chordonomicon'] as const).filter((source) => difference[source]);
  return (
    <li
      className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 ${
        difference.confirmed ? 'border-[var(--gold)] bg-[var(--gold-tint)]' : 'border-[var(--rule)]'
      }`}
    >
      <span className="flex flex-wrap items-baseline gap-x-2">
        <strong className="font-medium text-[var(--ink)]">{chordsOf(difference)}</strong>
        <span className="text-xs text-[var(--ink-3)]">
          {t(`chordSourcesKind.${difference.kind}`)}
        </span>
      </span>
      <span className="text-xs text-[var(--ink-3)]">
        {[
          at && t('chordSourcesAt', { time: at }),
          difference.share > 0 &&
            t('chordSourcesShare', { percent: Math.round(difference.share * 100) }),
          t(difference.confirmed ? 'chordSourcesConfirmed' : 'chordSourcesUnconfirmed'),
          ...votes.map((source) =>
            t(`chordSourcesVote.${source}`, {
              side: t(`chordSourcesSide.${difference[source]}`),
            })
          ),
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
    </li>
  );
};
