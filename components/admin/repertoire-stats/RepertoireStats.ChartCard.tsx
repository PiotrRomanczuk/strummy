'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { StatsLabel } from './RepertoireStatsPrimitives';

type Props = {
  title: string;
  count: string;
  /** Few songs: the count is shown in the accent colour as a warning. */
  isFew?: boolean;
  value: ReactNode;
  sentence: string | null;
  chart: ReactNode;
  table: { label: string; value: string | number; isSelected: boolean }[];
};

/** A distribution card: the selected song's value and standing, then the chart or the same data as a table. */
export function RepertoireStatsChartCard({
  title,
  count,
  isFew,
  value,
  sentence,
  chart,
  table,
}: Props) {
  const t = useTranslations('RepertoireStats.context');
  const [isTable, setIsTable] = useState(false);
  return (
    <section className="min-w-0 rounded-[10px] border border-[var(--rule)] bg-[var(--card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-[20px] font-medium leading-tight">{title}</h2>
          <StatsLabel className={`mt-1.5 ${isFew ? 'text-[var(--gold-2)]' : ''}`}>
            {count}
          </StatsLabel>
        </div>
        <span className="inline-flex shrink-0 overflow-hidden rounded-lg border border-[var(--rule)] bg-[var(--card)]">
          {[false, true].map((option) => (
            <button
              key={String(option)}
              type="button"
              aria-pressed={isTable === option}
              onClick={() => setIsTable(option)}
              className={`px-2.5 py-1.5 text-[12px] ${isTable === option ? 'bg-[var(--rule-2)] font-medium text-[var(--ink)]' : 'text-[var(--ink-3)]'}`}
            >
              {t(option ? 'table' : 'chart')}
            </button>
          ))}
        </span>
      </div>
      <div className="mb-2.5 mt-3.5 flex flex-wrap items-baseline gap-2.5">
        <span className="font-mono text-[22px] font-medium">{value}</span>
        {sentence && <span>{sentence}</span>}
      </div>
      {isTable ? (
        <div className="grid grid-cols-2 gap-x-5 md:grid-cols-4">
          {table.map((row) => (
            <div
              key={row.label}
              className={`flex justify-between border-t border-[var(--rule-2)] py-1 font-mono text-[12px] ${row.isSelected ? 'font-semibold' : ''}`}
            >
              <span className="truncate">{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>
      ) : (
        chart
      )}
    </section>
  );
}
