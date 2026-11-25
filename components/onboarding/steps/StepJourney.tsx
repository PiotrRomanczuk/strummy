'use client';

import { useTranslations } from 'next-intl';

import type { SkillLevel, StudentJourneyData } from '@/types/onboarding';
import { OnbField, OnbHeader } from '../onboarding.shared';
import { Chip, LevelCard, SegmentTile } from '../Onboarding.Controls';
import {
  GOAL_OPTIONS,
  GUITAR_OPTIONS,
  LEVEL_OPTIONS,
  PRACTICE_TARGETS,
} from '../onboarding.constants';

type Props = {
  eyebrow: string;
  student: StudentJourneyData;
  onSetLevel: (level: SkillLevel) => void;
  onToggleGoal: (goal: string) => void;
  onToggleGuitar: (guitar: string) => void;
  onSetTarget: (minutes: number) => void;
};

export const StepJourney = ({
  eyebrow,
  student,
  onSetLevel,
  onToggleGoal,
  onToggleGuitar,
  onSetTarget,
}: Props) => {
  const t = useTranslations('Onboarding');
  return (
    <div>
      <OnbHeader eyebrow={eyebrow} title={t('journey.title')} sub={t('journey.sub')} />

      <OnbField label={t('journey.levelLabel')}>
        <div className="ui-onb-level-grid">
          {LEVEL_OPTIONS.map((option) => (
            <LevelCard
              key={option.key}
              title={t(`levels.${option.key}.title`)}
              sub={t(`levels.${option.key}.sub`)}
              active={student.skillLevel === option.key}
              onClick={() => onSetLevel(option.key)}
            />
          ))}
        </div>
      </OnbField>

      <OnbField label={t('journey.goalsLabel')} hint={t('journey.goalsHint')}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {GOAL_OPTIONS.map((goal) => (
            <Chip
              key={goal.key}
              label={t(`goals.${goal.key}`)}
              active={student.goals.includes(goal.key)}
              onClick={() => onToggleGoal(goal.key)}
            />
          ))}
        </div>
      </OnbField>

      <OnbField label={t('journey.guitarsLabel')} hint={t('journey.guitarsHint')}>
        <div data-testid="student-guitars" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {GUITAR_OPTIONS.map((guitar) => (
            <Chip
              key={guitar.key}
              label={t(`guitars.${guitar.key}`)}
              active={student.guitars.includes(guitar.key)}
              onClick={() => onToggleGuitar(guitar.key)}
            />
          ))}
        </div>
      </OnbField>

      <OnbField label={t('journey.targetLabel')}>
        <div style={{ display: 'flex', gap: 6 }}>
          {PRACTICE_TARGETS.map((minutes) => (
            <SegmentTile
              key={minutes}
              value={minutes}
              unit={t('journey.targetUnit')}
              active={student.dailyGoalMinutes === minutes}
              onClick={() => onSetTarget(minutes)}
            />
          ))}
        </div>
      </OnbField>

      {student.goals.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
          {t('journey.pickGoal')}
        </div>
      ) : (
        <div
          data-testid="journey-summary"
          style={{
            marginTop: 6,
            padding: '12px 14px',
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--ink-3)',
            lineHeight: 1.55,
          }}
        >
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--gold-2)' }}>
            {t('journey.summaryLead')}
          </span>{' '}
          — {t('journey.summaryBody')}
        </div>
      )}
    </div>
  );
};
