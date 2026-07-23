'use client';

import type { TeacherStudioData } from '@/types/onboarding-editorial';
import { OnbField, OnbHeader, OnbTextArea } from '../OnboardingEditorial.shared';
import { parseInviteEmails } from '../onboarding-editorial.helpers';

type Props = {
  teacher: TeacherStudioData;
  onChange: <K extends keyof TeacherStudioData>(key: K, value: TeacherStudioData[K]) => void;
};

export const StepInviteEditorial = ({ teacher, onChange }: Props) => {
  const emails = parseInviteEmails(teacher.inviteEmails);

  return (
    <div>
      <OnbHeader
        eyebrow="Step 4 of 5"
        title="Invite your students."
        sub="Add a few email addresses now, or skip and invite everyone later from your dashboard."
      />

      <OnbField label="Student emails" hint="one per line or comma-separated">
        <OnbTextArea
          aria-label="Student emails"
          value={teacher.inviteEmails}
          placeholder={'emma@example.com\nnoah@example.com'}
          onChange={(e) => onChange('inviteEmails', e.target.value)}
        />
      </OnbField>

      <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
        {emails.length === 0
          ? 'No students added yet — you can skip this step.'
          : `${emails.length} student${emails.length === 1 ? '' : 's'} ready to invite.`}
      </div>
    </div>
  );
};
