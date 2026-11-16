import Link from 'next/link';
import { Download } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';

import { NOTE_NAMINGS } from '@/lib/music-theory/note-naming';

import { StatsLabel } from './RepertoireStatsPrimitives';
import {
  VIEWS,
  csvHref,
  statsHref,
  type RepertoireView,
  type StatsParams,
} from './repertoire-stats.helpers';

type Props = { params: StatsParams; counts: Partial<Record<RepertoireView, number>> };

const pill = (isActive: boolean) =>
  `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] ${
    isActive
      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
      : 'border-[var(--rule)] bg-[var(--card)] text-[var(--ink-3)] hover:border-[var(--ink-5)]'
  }`;

/** Title, note-name switch, CSV export and the view pills of the repertoire statistics. */
export async function RepertoireStatsHeader({ params, counts }: Props) {
  const [t, format] = await Promise.all([getTranslations('RepertoireStats'), getFormatter()]);
  return (
    <header className="mb-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <StatsLabel className="mb-1.5">
            {t('eyebrow', { date: format.dateTime(new Date(), { dateStyle: 'short' }) })}
          </StatsLabel>
          <h1 className="font-serif text-[34px] font-normal leading-[1.1] tracking-[-0.02em]">
            {t('title')}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <StatsLabel>{t('noteNames')}</StatsLabel>
          <span className="inline-flex overflow-hidden rounded-lg border border-[var(--rule)] bg-[var(--card)]">
            {NOTE_NAMINGS.map((naming) => (
              <Link
                key={naming}
                href={statsHref(params, { names: naming })}
                aria-current={params.names === naming ? 'true' : undefined}
                className={`px-2.5 py-1.5 text-[12px] ${params.names === naming ? 'bg-[var(--rule-2)] font-medium text-[var(--ink)]' : 'text-[var(--ink-3)]'}`}
              >
                {t(`naming.${naming}`)}
              </Link>
            ))}
          </span>
          <a
            href={csvHref(params)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--rule)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--ink-2)] hover:border-[var(--ink-5)]"
          >
            <Download aria-hidden className="size-3.5" />
            {t('exportCsv')}
          </a>
        </div>
      </div>
      <nav
        aria-label={t('views')}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
      >
        {VIEWS.map((view) => (
          <Link
            key={view}
            href={statsHref(params, { view })}
            aria-current={params.view === view ? 'page' : undefined}
            className={pill(params.view === view)}
          >
            {t(`view.${view}`)}
            {counts[view] !== undefined && (
              <span className="font-mono text-[11px] opacity-70">{counts[view]}</span>
            )}
          </Link>
        ))}
      </nav>
    </header>
  );
}
