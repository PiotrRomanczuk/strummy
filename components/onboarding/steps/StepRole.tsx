'use client';

import { GraduationCap, Music2 } from 'lucide-react';

import type { OnboardingRole } from '@/types/onboarding';
import { OnbHeader } from '../onboarding.shared';

const ROLES: { key: OnboardingRole; title: string; sub: string; icon: typeof Music2 }[] = [
  {
    key: 'teacher',
    title: 'I teach guitar',
    sub: 'Run lessons, track students, manage assignments and song library.',
    icon: GraduationCap,
  },
  {
    key: 'student',
    title: 'I take lessons',
    sub: 'Practice, track progress, receive assignments, see your repertoire.',
    icon: Music2,
  },
];

type Props = {
  role: OnboardingRole | null;
  onSelect: (role: OnboardingRole) => void;
};

/** Claude Design role select: one row per role with an icon tile and a radio. */
export const StepRole = ({ role, onSelect }: Props) => (
  <div style={{ maxWidth: 560 }}>
    <OnbHeader
      eyebrow="One last thing"
      title={
        <>
          How will you use <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>Strummy</em>?
        </>
      }
      sub="Pick the role that best matches you. Parents are invited by their child's teacher."
    />
    <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ROLES.map(({ key, title, sub, icon: Icon }) => {
        const isActive = role === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onSelect(key)}
            className="ui-onb-tile"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: '14px 16px',
              textAlign: 'left',
              borderRadius: 10,
              cursor: 'pointer',
              border: isActive ? '1.5px solid var(--gold-2)' : '1px solid var(--rule)',
              background: isActive ? 'var(--gold-tint)' : 'var(--paper)',
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                flex: '0 0 36px',
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                background: isActive ? 'var(--gold-2)' : 'var(--card)',
                border: isActive ? 'none' : '1px solid var(--rule)',
                color: isActive ? '#fff' : 'var(--ink-3)',
              }}
            >
              <Icon size={18} />
            </span>
            <span style={{ flex: 1 }}>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--serif)',
                  fontSize: 16,
                  fontWeight: 500,
                  marginBottom: 2,
                }}
              >
                {title}
              </span>
              <span
                style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}
              >
                {sub}
              </span>
            </span>
            <span
              aria-hidden="true"
              style={{
                width: 18,
                height: 18,
                marginTop: 8,
                borderRadius: '50%',
                border: isActive ? '5px solid var(--gold-2)' : '1.5px solid var(--rule)',
                background: isActive ? 'var(--card)' : 'transparent',
                boxSizing: 'border-box',
              }}
            />
          </button>
        );
      })}
    </div>
  </div>
);
