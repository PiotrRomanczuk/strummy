import { getTranslations } from 'next-intl/server';

import { DesignCard, DesignCardBody, DesignCardHeader } from '@/components/shared/DesignCard';
import type { PracticeDay } from '@/lib/services/assignment-detail-queries';

/** "How you're doing / Practice log": seven daily bars + this week vs target. */
export const StudentPracticeLog = async ({
  days,
  dailyTarget,
}: {
  days: PracticeDay[];
  dailyTarget: number | null;
}) => {
  const t = await getTranslations('Assignments');
  const total = days.reduce((sum, d) => sum + d.minutes, 0);
  const peak = Math.max(20, ...days.map((d) => d.minutes));
  return (
    <DesignCard>
      <DesignCardHeader eyebrow={t('studentPracticeEyebrow')} title={t('studentPracticeTitle')} />
      <DesignCardBody>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 6,
            marginBottom: 14,
          }}
        >
          {days.map((d, i) => (
            <div key={i}>
              <div style={{ height: 60, display: 'flex', flexDirection: 'column-reverse' }}>
                <div
                  style={{
                    height: `${(d.minutes / peak) * 100}%`,
                    minHeight: d.minutes === 0 ? 2 : undefined,
                    background: d.minutes === 0 ? 'var(--rule)' : 'var(--gold-2)',
                    borderRadius: '3px 3px 0 0',
                  }}
                />
              </div>
              <div
                style={{
                  textAlign: 'center',
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  marginTop: 4,
                }}
              >
                {d.label}
              </div>
              <div
                style={{
                  textAlign: 'center',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--ink-2)',
                  fontWeight: 500,
                }}
              >
                {d.minutes}m
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{total}m</strong>{' '}
          {dailyTarget
            ? t('studentPracticeOfTarget', { target: dailyTarget * 7 })
            : t('studentPracticeThisWeek')}
        </div>
      </DesignCardBody>
    </DesignCard>
  );
};
