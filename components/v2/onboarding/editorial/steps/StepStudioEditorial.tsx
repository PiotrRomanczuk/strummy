'use client';

import type { TeacherStudioData } from '@/types/onboarding-editorial';
import { OnbField, OnbHeader, OnbInput, OnbSelect } from '../OnboardingEditorial.shared';
import { Chip, SegmentTile } from '../OnboardingEditorial.Controls';
import {
  LESSON_LENGTHS,
  TEACHES_OPTIONS,
  TIMEZONE_OPTIONS,
} from '../onboarding-editorial.constants';
import { StudioPreview } from './StepStudioEditorial.Preview';

type Props = {
  teacher: TeacherStudioData;
  onChange: <K extends keyof TeacherStudioData>(key: K, value: TeacherStudioData[K]) => void;
  onToggleTeaches: (item: string) => void;
};

export const StepStudioEditorial = ({ teacher, onChange, onToggleTeaches }: Props) => (
  <div>
    <OnbHeader
      eyebrow="Step 3 of 5"
      title="Tell us about your studio."
      sub="This is how your students and their parents will see you. You can change any of it later."
    />

    <div className="ed-onb-studio-grid">
      <div>
        <OnbField label="Studio name" hint="public">
          <OnbInput
            aria-label="Studio name"
            value={teacher.studioName}
            placeholder="e.g. Sarah Chen Guitar Studio"
            onChange={(e) => onChange('studioName', e.target.value)}
          />
        </OnbField>

        <OnbField label="Tagline" hint="optional">
          <OnbInput
            aria-label="Tagline"
            value={teacher.tagline}
            placeholder="One line that captures what you do"
            onChange={(e) => onChange('tagline', e.target.value)}
          />
        </OnbField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <OnbField label="City">
            <OnbInput
              aria-label="City"
              value={teacher.city}
              placeholder="San Francisco, CA"
              onChange={(e) => onChange('city', e.target.value)}
            />
          </OnbField>
          <OnbField label="Timezone">
            <OnbSelect
              aria-label="Timezone"
              value={teacher.timezone}
              onChange={(e) => onChange('timezone', e.target.value)}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </OnbSelect>
          </OnbField>
        </div>

        <OnbField label="What do you teach?" hint="pick all that apply">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TEACHES_OPTIONS.map((item) => (
              <Chip
                key={item}
                label={item}
                active={teacher.teaches.includes(item)}
                onClick={() => onToggleTeaches(item)}
              />
            ))}
          </div>
        </OnbField>

        <OnbField label="Default lesson length">
          <div style={{ display: 'flex', gap: 6 }}>
            {LESSON_LENGTHS.map((minutes) => (
              <SegmentTile
                key={minutes}
                value={minutes}
                unit="min"
                active={teacher.defaultLessonMinutes === minutes}
                onClick={() => onChange('defaultLessonMinutes', minutes)}
              />
            ))}
          </div>
        </OnbField>
      </div>

      <StudioPreview teacher={teacher} />
    </div>
  </div>
);
