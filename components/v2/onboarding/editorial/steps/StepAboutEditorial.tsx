'use client';

import type { TeacherStudioData } from '@/types/onboarding-editorial';
import { OnbField, OnbHeader, OnbInput } from '../OnboardingEditorial.shared';

type Props = {
  teacher: TeacherStudioData;
  onChange: <K extends keyof TeacherStudioData>(key: K, value: TeacherStudioData[K]) => void;
};

export const StepAboutEditorial = ({ teacher, onChange }: Props) => (
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
  </div>
);
