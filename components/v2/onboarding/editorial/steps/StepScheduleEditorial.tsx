'use client';

import Link from 'next/link';

import { OnbHeader } from '../OnboardingEditorial.shared';

const linkCardStyle: React.CSSProperties = {
  display: 'block',
  padding: '18px 20px',
  borderRadius: 12,
  border: '1px solid var(--rule)',
  background: 'var(--card)',
  textDecoration: 'none',
  color: 'var(--ink)',
};

/**
 * Teacher "schedule first lesson" step. Skippable — the primary action opens
 * the real lesson-creation flow in a new tab so onboarding isn't a dead end.
 */
export const StepScheduleEditorial = () => (
  <div>
    <OnbHeader
      eyebrow="Step 5 of 5"
      title="Schedule your first lesson."
      sub="You're almost done. Book a first lesson now, or finish setup and do it from your dashboard."
    />

    <div className="ed-onb-schedule-grid">
      <Link href="/dashboard/lessons/new" className="ed-onb-linkcard" style={linkCardStyle}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, marginBottom: 6 }}>
          Book a lesson →
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Pick a student, date, and time. Opens the lesson scheduler.
        </div>
      </Link>

      <Link href="/dashboard/users/new" className="ed-onb-linkcard" style={linkCardStyle}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, marginBottom: 6 }}>
          Add a student →
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Set up a student profile before booking their first lesson.
        </div>
      </Link>
    </div>

    <div
      style={{
        marginTop: 18,
        fontSize: 12,
        color: 'var(--ink-4)',
        fontFamily: 'var(--mono)',
      }}
    >
      No rush — click Finish to head to your dashboard.
    </div>
  </div>
);
