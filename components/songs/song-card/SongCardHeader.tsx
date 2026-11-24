import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';

import type { SongCard } from '@/lib/music-theory/song-card';

import { formatClock } from './song-card.helpers';

type Props = {
  songId: string;
  title: string;
  author: string | null;
  card: SongCard | null;
};

const factLabel = 'font-mono text-[9.5px] uppercase tracking-[.16em] text-[var(--ink-4)]';
const factValue = 'mt-0.5 font-mono text-sm text-[var(--ink-2)]';

/** The card's title block: way back to the song, the analysis it is drawn from, and the song's facts. */
export const SongCardHeader = async ({ songId, title, author, card }: Props) => {
  const t = await getTranslations('SongCard');
  const ts = await getTranslations('Songs');
  const format = await getFormatter();
  const facts = card
    ? [
        card.key && {
          label: t('factKey'),
          value: ts(card.key.isMinor ? 'mapKeyMinor' : 'mapKeyMajor', { tonic: card.key.tonic }),
        },
        { label: t('factTempo'), value: `${Math.round(card.bpm)} BPM` },
        { label: t('factMetre'), value: `${card.beatsPerBar}/4` },
        { label: t('factLength'), value: formatClock(card.duration) },
        card.parts.length > 0 && { label: t('factParts'), value: String(card.parts.length) },
      ].filter((fact): fact is { label: string; value: string } => Boolean(fact))
    : [];

  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--ink-4)]">
        <Link href={`/dashboard/songs/${songId}`} className="hover:text-[var(--ink)]">
          {t('backToSong')}
        </Link>
        {card?.analysedOn && (
          <span className="ml-auto rounded-full border border-[var(--gold-dim)] bg-[var(--gold-tint)] px-2.5 py-1 text-[10.5px] uppercase tracking-[.08em] text-[var(--gold-2)]">
            {t('source', {
              date: format.dateTime(new Date(card.analysedOn), { dateStyle: 'medium' }),
            })}
          </span>
        )}
      </div>
      <h1 className="font-serif text-[clamp(36px,5.4vw,60px)] font-normal italic leading-[0.98] tracking-[-0.03em] text-[var(--ink)]">
        {title}
      </h1>
      {author && <p className="font-serif text-lg text-[var(--ink-3)]">{author}</p>}
      {facts.length > 0 && (
        <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className={factLabel}>{fact.label}</dt>
              <dd className={factValue}>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
};
