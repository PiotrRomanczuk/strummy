'use client';

import type { OnboardingRole } from '@/types/onboarding-editorial';
import { OnbHeader } from '../OnboardingEditorial.shared';

const ROLES: { key: OnboardingRole; title: string; sub: string }[] = [
  {
    key: 'student',
    title: 'I want to learn',
    sub: 'Track progress, practice, and repertoire as a student.',
  },
  { key: 'teacher', title: 'I teach guitar', sub: 'Set up a studio and manage your students.' },
];

type Props = {
  role: OnboardingRole | null;
  onSelect: (role: OnboardingRole) => void;
};

export const StepRoleEditorial = ({ role, onSelect }: Props) => (
  <div>
    <OnbHeader
      eyebrow="Step 1"
      title="What brings you to Strummy?"
      sub="Pick your role — we'll tailor the rest of setup to match."
    />
    <div className="ed-onb-role-grid">
      {ROLES.map((option) => {
        const active = role === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelect(option.key)}
            aria-pressed={active}
            className="ed-onb-tile"
            style={{
              textAlign: 'left',
              padding: '24px 22px',
              borderRadius: 12,
              cursor: 'pointer',
              border: `${active ? '1.5px' : '1px'} solid ${active ? 'var(--gold-2)' : 'var(--rule)'}`,
              background: active ? 'var(--gold-tint)' : 'var(--card)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: '-0.01em',
                marginBottom: 8,
              }}
            >
              {option.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              {option.sub}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
