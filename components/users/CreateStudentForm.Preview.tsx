'use client';

import { useTranslations } from 'next-intl';

import {
  BILLING_CYCLE_SUFFIX,
  LESSON_DAY_LABELS,
  type BillingCycle,
  type LessonDayNumber,
} from '@/schemas/StudentIntakeSchema';

import { formatLessonTime } from './student-fields.helpers';

const initialsFor = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  return parts
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const labelStyle: React.CSSProperties = {
  color: 'var(--ink-4)',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

type Props = {
  name: string;
  skillLevel: string;
  avatarColor: string;
  lessonDay: LessonDayNumber;
  /** 24h HH:MM; '' when unset. */
  lessonTime: string;
  lessonRate: string;
  billingCycle: BillingCycle;
};

/** Live-preview sidebar for the "Add student" form: avatar, name, level, slot, rate. */
export const CreateStudentFormPreview = ({
  name,
  skillLevel,
  avatarColor,
  lessonDay,
  lessonTime,
  lessonRate,
  billingCycle,
}: Props) => {
  const t = useTranslations('Users');
  const lessonSlot =
    [LESSON_DAY_LABELS[lessonDay], lessonTime ? formatLessonTime(lessonTime) : '']
      .filter(Boolean)
      .join(' ') || '—';
  const rate = lessonRate.trim()
    ? `$${lessonRate.trim()}${BILLING_CYCLE_SUFFIX[billingCycle]}`
    : '—';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: avatarColor || 'var(--gold-dim)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 18,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initialsFor(name)}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500 }}>
            {name || t('previewNameFallback')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'capitalize' }}>
            {skillLevel}
          </div>
        </div>
      </div>
      <div
        style={{
          paddingTop: 14,
          borderTop: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          fontSize: 12,
        }}
      >
        <div>
          <div style={labelStyle}>{t('previewLessonLabel')}</div>
          <div style={{ fontWeight: 500 }}>{lessonSlot}</div>
        </div>
        <div>
          <div style={labelStyle}>{t('previewRateLabel')}</div>
          <div style={{ fontWeight: 500 }}>{rate}</div>
        </div>
      </div>
    </div>
  );
};
