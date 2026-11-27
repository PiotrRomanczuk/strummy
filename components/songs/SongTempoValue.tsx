import { useTranslations } from 'next-intl';

import type { SongTempo } from '@/lib/music-theory/song-tempo';

type Props = { tempo: SongTempo };

/**
 * A song's tempo the same way on the song page, its song map and its card (#1241): the tempo to play at, the beat
 * song2logic counted when that is double or half of it, and a "check" mark when the recording and the teacher's
 * tempo disagree.
 */
export const SongTempoValue = ({ tempo }: Props) => {
  const t = useTranslations('Songs');
  const bpm = Math.round(tempo.bpm);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5" data-testid="song-tempo">
      <span>{t('tempoBpm', { tempo: bpm })}</span>
      {tempo.countedBpm !== null && (
        <span className="text-[11px] font-normal text-[var(--ink-4)]">
          {t('tempoCounted', { counted: Math.round(tempo.countedBpm) })}
        </span>
      )}
      {tempo.checkAgainst !== null && (
        <span
          title={t('tempoCheckHint', { recording: bpm, song: Math.round(tempo.checkAgainst) })}
          className="rounded-full border border-[var(--gold-dim)] bg-[var(--gold-tint)] px-1.5 text-[10px] uppercase tracking-[.08em] text-[var(--gold-2)]"
        >
          {t('tempoCheck')}
        </span>
      )}
    </span>
  );
};
