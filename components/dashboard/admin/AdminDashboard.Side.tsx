import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import type { AdminPendingInvite } from '@/lib/services/admin-dashboard-queries';

import { StringWaves } from '../DashboardPrimitives';
import { eyebrow } from '../teacher/teacher-dashboard.styles';
import { adminCard, rowRule } from './admin-dashboard.styles';

const ago = (iso: string, now: Date) => {
  const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);
  return days < 1
    ? 'today'
    : days < 14
      ? `${days}d ago`
      : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** "Pending invites": invited addresses that have not signed in yet. */
export const AdminPendingCard = ({
  invites,
  now,
}: {
  invites: AdminPendingInvite[];
  now: Date;
}) => (
  <section style={adminCard}>
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}
    >
      <span style={eyebrow}>Pending invites</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
        {invites.length} open
      </span>
    </div>
    {invites.length === 0 && (
      <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>No pending invitations.</div>
    )}
    {invites.map((p, i) => (
      <div
        key={p.id}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) auto',
          gap: 10,
          alignItems: 'center',
          padding: '10px 0',
          ...rowRule(i),
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 12,
              color: 'var(--ink-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p.email}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>invited {ago(p.createdAt, now)}</div>
        </div>
        <Link
          href={`/dashboard/users/${p.id}`}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--rule)',
            fontSize: 10,
            color: 'var(--ink-3)',
            textDecoration: 'none',
          }}
        >
          Open
        </Link>
      </div>
    ))}
  </section>
);

/** Dark "Strummy AI" strip pointing the admin at the assistant with a ready question. */
export const AdminAssistantStrip = ({ topName }: { topName: string | null }) => (
  <section
    style={{
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, var(--ink) 0%, var(--ink-2) 100%)',
      color: 'var(--paper)',
      borderRadius: 14,
      padding: '20px 22px',
      boxShadow: '0 10px 30px -16px rgba(0,0,0,.4)',
    }}
  >
    <StringWaves />
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          flex: '0 0 36px',
          background: 'linear-gradient(135deg, var(--gold-2), var(--gold))',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Sparkles size={18} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...eyebrow, color: 'var(--gold-dim)' }}>Strummy AI</div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 15,
            fontStyle: 'italic',
            marginTop: 2,
            lineHeight: 1.35,
          }}
        >
          {topName
            ? `“${topName} has been quiet longest. Want a re-engagement plan?”`
            : '“Ask about practice trends, cohorts or any student.”'}
        </div>
      </div>
      <Link
        href="/dashboard/ai"
        style={{
          padding: '8px 14px',
          borderRadius: 8,
          background: 'var(--gold-2)',
          color: 'var(--on-accent)',
          fontWeight: 500,
          fontSize: 12,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {topName ? 'Draft plan' : 'Ask'}
      </Link>
    </div>
  </section>
);
