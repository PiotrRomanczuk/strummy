'use client';

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
  student: StudentJourneyData;
  onSetLevel: (level: SkillLevel) => void;
  onToggleGoal: (goal: string) => void;
  onToggleGuitar: (guitar: string) => void;
  onSetTarget: (minutes: number) => void;
};

export const StepJourney = ({
  student,
  onSetLevel,
  onToggleGoal,
  onToggleGuitar,
  onSetTarget,
}: Props) => (
  <div>
    <OnbHeader
      eyebrow="Step 2"
      title="Where are you with guitar?"
      sub="Be honest — this just helps us recommend the right pieces and pace. There's no wrong answer."
    />

    <OnbField label="Your current level">
      <div className="ui-onb-level-grid">
        {LEVEL_OPTIONS.map((option) => (
          <LevelCard
            key={option.key}
            title={option.title}
            sub={option.sub}
            active={student.skillLevel === option.key}
            onClick={() => onSetLevel(option.key)}
          />
        ))}
      </div>
    </OnbField>

    <OnbField label="What do you want to do with guitar?" hint="pick any that resonate">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {GOAL_OPTIONS.map((goal) => (
          <Chip
            key={goal.key}
            label={goal.label}
            active={student.goals.includes(goal.key)}
            onClick={() => onToggleGoal(goal.key)}
          />
        ))}
      </div>
    </OnbField>

    <OnbField label="What are you playing on?" hint="optional · pick any you have">
      <div data-testid="student-guitars" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {GUITAR_OPTIONS.map((guitar) => (
          <Chip
            key={guitar.key}
            label={guitar.label}
            active={student.guitars.includes(guitar.key)}
            onClick={() => onToggleGuitar(guitar.key)}
          />
        ))}
      </div>
    </OnbField>

    <OnbField label="Daily practice target">
      <div style={{ display: 'flex', gap: 6 }}>
        {PRACTICE_TARGETS.map((minutes) => (
          <SegmentTile
            key={minutes}
            value={minutes}
            unit="min/day"
            active={student.dailyGoalMinutes === minutes}
            onClick={() => onSetTarget(minutes)}
          />
        ))}
      </div>
    </OnbField>

    {student.goals.length === 0 ? (
      <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
        Pick at least one goal to continue.
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
          Based on your answers
        </span>{' '}
        — we&apos;ll open with fingerpicking fundamentals and your first repertoire song will be{' '}
        <em style={{ fontStyle: 'italic' }}>&ldquo;Blackbird&rdquo;</em> by The Beatles.
      </div>
    )}
  </div>
);
