'use client';

import Link from 'next/link';

import type { OnboardingRole } from '@/types/onboarding-editorial';
import { OnbHeader } from '../OnboardingEditorial.shared';

type Props = {
  role: OnboardingRole | null;
  firstName?: string;
};

export const StepDoneEditorial = ({ role, firstName }: Props) => {
  const name = firstName?.trim() || 'there';
  const copy =
    role === 'teacher'
      ? 'Your studio is set up. Invite students and book lessons whenever you are ready.'
      : 'Your profile is ready. Your first lesson plan is waiting on your dashboard.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <OnbHeader eyebrow="All done" title={`You're all set, ${name}.`} sub={copy} />

      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--gold-tint)',
          border: '1.5px solid var(--gold-2)',
          color: 'var(--gold-2)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 24,
          marginBottom: 24,
        }}
      >
        ✓
      </div>

      <Link
        href="/dashboard"
        className="ed-onb-primary"
        style={{
          alignSelf: 'flex-start',
          padding: '12px 24px',
          borderRadius: 8,
          background: 'var(--ink)',
          color: 'var(--paper)',
          fontSize: 14,
          fontWeight: 500,
          textDecoration: 'none',
          fontFamily: 'var(--sans)',
        }}
      >
        Go to dashboard →
      </Link>
    </div>
  );
};
