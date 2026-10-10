import Link from 'next/link';
import { Plus } from 'lucide-react';

/** "Everything sounds roughly in tune." — the admin's one-line platform verdict. */
export const AdminGreeting = ({ now, atRisk }: { now: Date; atRisk: number }) => {
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <div className="ui-admin-greeting">
      <div>
        <div
          style={{
            color: 'var(--ink-4)',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '.16em',
            marginBottom: 6,
          }}
        >
          Platform · {date.replace(/, (?=\w+ \d)/, ' · ')}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 36,
            letterSpacing: '-0.02em',
          }}
        >
          Everything sounds{' '}
          <em style={{ color: 'var(--gold-2)' }}>{atRisk > 0 ? 'roughly in tune' : 'in tune'}</em>.
        </h1>
        <div style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 8, maxWidth: 580 }}>
          {atRisk > 0 ? (
            <>
              <span style={{ color: 'var(--danger)' }}>
                {atRisk} {atRisk === 1 ? 'student' : 'students'}
              </span>{' '}
              have gone quiet on practice.
            </>
          ) : (
            'Every active student practised this month.'
          )}
        </div>
      </div>
      <Link
        href="/dashboard/users/new"
        style={{
          padding: '9px 14px',
          borderRadius: 8,
          background: 'var(--ink)',
          color: 'var(--paper)',
          fontSize: 13,
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          textDecoration: 'none',
        }}
      >
        <Plus size={12} /> Invite user
      </Link>
    </div>
  );
};
