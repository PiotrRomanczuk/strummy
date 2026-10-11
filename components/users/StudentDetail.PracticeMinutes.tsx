'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ToneBadge } from '@/components/shared/ToneBadge';
import type { PracticeDay } from '@/lib/services/student-health.helpers';
import { weekOverWeek } from './student-detail-stats.helpers';
import { SdCard } from './StudentDetail.Panel';

const Spark = ({ data, color }: { data: number[]; color: string }) => {
  const w = 340;
  const h = 64;
  const max = Math.max(1, ...data);
  const points = data
    .map(
      (v, i) =>
        `${Math.round((i / Math.max(1, data.length - 1)) * w)},${Math.round(h - (v / max) * (h - 4) - 2)}`
    )
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

/** "Practice minutes": this week's total, change vs the week before, 14-day sparkline. */
export const StudentPracticeMinutes = ({
  days,
  isAtRisk,
}: {
  days: PracticeDay[];
  isAtRisk: boolean;
}) => {
  const t = useTranslations('Users');
  const { thisWeek, deltaPct } = weekOverWeek(days);
  const isDown = deltaPct != null && deltaPct < 0;
  const color = isAtRisk ? 'var(--danger)' : 'var(--gold)';
  return (
    <SdCard>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <span style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500 }}>
          {t('detailPracticeMinutes')}
        </span>
        {deltaPct != null && (
          <ToneBadge
            tone={isDown ? 'danger' : 'success'}
            icon={isDown ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          >
            {t('detailVsPrior', { pct: `${deltaPct > 0 ? '+' : ''}${deltaPct}%` })}
          </ToneBadge>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 40,
              fontWeight: 500,
              lineHeight: 1,
              color: isAtRisk ? 'var(--danger)' : 'var(--ink)',
            }}
          >
            {thisWeek}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>
            {t('detailMinThisWeek')}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Spark
            data={[...days].sort((a, b) => a.date.localeCompare(b.date)).map((d) => d.minutes)}
            color={color}
          />
        </div>
      </div>
    </SdCard>
  );
};
