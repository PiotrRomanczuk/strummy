import { getLocale, getTranslations } from 'next-intl/server';

import {
  NUMERIC_IDS,
  keyDistribution,
  numericDistribution,
} from '@/lib/repertoire-stats/distributions';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { RepertoireStatsKeyCard } from './RepertoireStats.KeyCard';
import { RepertoireStatsNumericCard } from './RepertoireStats.NumericCard';
import { RepertoireStatsSongPicker } from './RepertoireStats.SongPicker';
import { CoverageIcons, StatsCard, StatsLabel, StudentCount } from './RepertoireStatsPrimitives';
import type { StatsParams } from './repertoire-stats.helpers';
import { keyLabel, type Translate } from './repertoire-stats.i18n';

type Props = { songs: RepertoireSong[]; params: StatsParams };
type Translator = Translate & { has: (key: string) => boolean };

const HELP = ['numbers', 'key', 'few'] as const;

function SongFacts({ song, t }: { song: RepertoireSong; t: Translator }) {
  const level =
    song.level && (t.has(`level.${song.level}`) ? t(`level.${song.level}`) : song.level);
  return (
    <>
      <CoverageIcons
        has={[song.hasLink, !!song.measured, !!song.transcription]}
        labels={[t('coverage.link'), t('coverage.analysis'), t('coverage.transcription')]}
      />
      <span className="text-[var(--ink-3)]">
        {[song.category, level].filter(Boolean).join(' · ')}
      </span>
      <StudentCount count={song.students} label={t('gaps.studentsHint')} />
    </>
  );
}

/** "How does this song sit in the repertoire?": its tempo, key, vocal range and bass density against the rest. */
export async function RepertoireStatsContext({ songs, params }: Props) {
  const [t, locale] = await Promise.all([getTranslations('RepertoireStats'), getLocale()]);
  const song = songs.find((candidate) => candidate.id === params.song) ?? null;
  const keyText = song?.measured?.key ? keyLabel(song.measured.key, params.names, t) : null;
  const card = (id: (typeof NUMERIC_IDS)[number]) => (
    <RepertoireStatsNumericCard
      key={id}
      distribution={numericDistribution(id, songs, song?.id ?? null)}
      names={params.names}
      locale={locale}
      t={t}
    />
  );
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3.5">
        <RepertoireStatsSongPicker
          params={params}
          options={songs.map(({ id, title, author }) => ({ id, title, author }))}
          selected={song ? { id: song.id, title: song.title, author: song.author } : null}
        />
        {song && <SongFacts song={song} t={t} />}
      </div>
      {song && !song.measured && (
        <StatsCard className="mb-5 px-5 py-6 text-center">
          <div className="font-serif text-[18px] font-medium">{t('context.noAnalysisTitle')}</div>
          <div className="mx-auto mt-1 max-w-[420px] text-[var(--ink-3)]">
            {t('context.noAnalysis', { title: song.title })}
          </div>
        </StatsCard>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {card('tempo')}
        <RepertoireStatsKeyCard
          keys={keyDistribution(songs, song?.id ?? null)}
          names={params.names}
          chosen={song && keyText ? { title: song.title, key: keyText } : null}
          t={t}
        />
        {NUMERIC_IDS.filter((id) => id !== 'tempo').map(card)}
        <StatsCard className="bg-[var(--paper)] p-5">
          <StatsLabel>{t('context.helpTitle')}</StatsLabel>
          <div className="mt-2.5 flex flex-col gap-2 text-[var(--ink-3)]">
            {HELP.map((item) => (
              <p key={item}>
                <b className="font-medium text-[var(--ink)]">{t(`context.help.${item}.title`)}</b>{' '}
                {t(`context.help.${item}.text`)}
              </p>
            ))}
          </div>
        </StatsCard>
      </div>
    </div>
  );
}
