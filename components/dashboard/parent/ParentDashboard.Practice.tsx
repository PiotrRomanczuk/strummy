import { Check, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { PracticeDay, PracticeWeek } from '@/lib/services/parent-health.helpers';
import { formatPracticeMinutes } from '@/lib/services/parent-health.helpers';

import { Card } from '../DashboardPrimitives';
import { Badge, formatPracticeWeekday, SectionLabel } from './parent-dashboard.shared';

const relativeLabel = (
  weekday: string,
  indexFromNewest: number,
  t: (key: 'practiceToday' | 'practiceYesterday') => string
): string => {
  if (indexFromNewest === 0) return t('practiceToday');
  if (indexFromNewest === 1) return t('practiceYesterday');
  return weekday;
};

const PracticeBars = ({ days, goalPerDay }: { days: PracticeDay[]; goalPerDay: number }) => {
  const locale = useLocale();
  const max = Math.max(goalPerDay, ...days.map((d) => d.minutes), 1);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${days.length}, 1fr)`,
        gap: 8,
        alignItems: 'end',
        height: 120,
      }}
    >
      {days.map((d) => (
        <div
          key={d.date}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            height: '100%',
          }}
        >
          <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column-reverse' }}>
            <div
              style={{
                height: `${(d.minutes / max) * 100}%`,
                minHeight: d.hasPractice ? 6 : 2,
                background: d.hasPractice ? 'var(--gold-2)' : 'var(--rule)',
                borderRadius: '3px 3px 0 0',
              }}
            />
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
            {formatPracticeWeekday(d.date, locale)}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ParentPracticeCard = ({ days, week }: { days: PracticeDay[]; week: PracticeWeek }) => {
  const t = useTranslations('ParentHome');
  const locale = useLocale();
  const newestFirst = days.slice().reverse();
  return (
    <Card>
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500 }}>
          {t('practiceTitle')}
        </span>
        <Badge tone={week.onTrack ? 'success' : 'warn'}>
          {week.onTrack ? t('practiceOnTrack') : t('practiceNeedsAttention')}
        </Badge>
      </div>

      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--rule-2)' }}>
        <PracticeBars days={days} goalPerDay={week.goalPerDay} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 10,
            fontSize: 12,
            color: 'var(--ink-4)',
          }}
        >
          <span>{t('practiceLogged', { minutes: formatPracticeMinutes(week.totalMinutes) })}</span>
          <span style={{ fontFamily: 'var(--mono)' }}>
            {t('practiceGoal', { minutes: week.goalPerDay })}
          </span>
        </div>
      </div>

      <div>
        {newestFirst.map((d, i) => (
          <div
            key={d.date}
            className="ui-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 22px',
              borderBottom: i < newestFirst.length - 1 ? '1px solid var(--rule-2)' : 'none',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                display: 'grid',
                placeItems: 'center',
                flex: '0 0 26px',
                background: d.hasPractice
                  ? 'color-mix(in oklab, var(--success) 12%, transparent)'
                  : 'var(--rule-2)',
                color: d.hasPractice ? 'var(--success)' : 'var(--ink-4)',
              }}
            >
              {d.hasPractice ? <Check size={14} /> : <X size={13} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: d.hasPractice ? 'var(--ink)' : 'var(--ink-4)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {!d.hasPractice
                  ? t('practiceNone')
                  : d.songs && d.songs.length > 0
                    ? d.songs.map((s) => `“${s}”`).join(' + ')
                    : t('practiceSome')}
              </div>
              <SectionLabel style={{ marginTop: 2, letterSpacing: '.08em' }}>
                {relativeLabel(formatPracticeWeekday(d.date, locale), i, t)}
              </SectionLabel>
            </div>
            <span
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 18,
                fontWeight: 500,
                color: d.hasPractice ? 'var(--ink)' : 'var(--ink-5)',
              }}
            >
              {d.minutes}
              <span className="text-xs text-[var(--ink-4)]"> {t('minutesUnit')}</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
