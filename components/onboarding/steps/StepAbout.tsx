'use client';

import type { TeacherStudioData } from '@/types/onboarding';
import { OnbField, OnbHeader, OnbInput } from '../onboarding.shared';
import { Chip } from '../Onboarding.Controls';
import { GUITAR_OPTIONS } from '../onboarding.constants';

type Props = {
  teacher: TeacherStudioData;
  onChange: <K extends keyof TeacherStudioData>(key: K, value: TeacherStudioData[K]) => void;
  onToggleGuitar: (guitar: string) => void;
};

export const StepAbout = ({ teacher, onChange, onToggleGuitar }: Props) => (
  <div>
    <OnbHeader
      eyebrow="Step 2 of 5"
      title="About you."
      sub="Just the basics — this is the name your students and their parents will see."
    />

    <OnbField label="Your name" hint="required">
      <OnbInput
        aria-label="Your name"
        value={teacher.displayName}
        placeholder="e.g. Sarah Chen"
        onChange={(e) => onChange('displayName', e.target.value)}
      />
    </OnbField>

    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
      <OnbField label="Main instrument">
        <OnbInput
          aria-label="Main instrument"
          value={teacher.instrument}
          placeholder="Guitar"
          onChange={(e) => onChange('instrument', e.target.value)}
        />
      </OnbField>
      <OnbField label="Years teaching" hint="optional">
        <OnbInput
          aria-label="Years teaching"
          value={teacher.yearsExperience}
          inputMode="numeric"
          placeholder="e.g. 8"
          onChange={(e) => onChange('yearsExperience', e.target.value.replace(/[^0-9]/g, ''))}
        />
      </OnbField>
    </div>

    {/* What you own, as opposed to `teaches` (styles you take students for)
        on the studio step. Both are kept: a teacher can own an electric and
        still only take classical students. */}
    <OnbField label="What do you play?" hint="optional · pick any you have">
      <div data-testid="teacher-guitars" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {GUITAR_OPTIONS.map((guitar) => (
          <Chip
            key={guitar.key}
            label={guitar.label}
            active={teacher.guitars.includes(guitar.key)}
            onClick={() => onToggleGuitar(guitar.key)}
          />
        ))}
      </div>
    </OnbField>
  </div>
);
