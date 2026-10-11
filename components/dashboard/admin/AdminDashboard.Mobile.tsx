import { StudentInitials } from '@/components/lessons/LessonPrimitives';
import type { PlatformPulse } from '@/lib/services/admin-dashboard-queries';
import type { AdminPlatform } from '@/lib/services/admin-platform-queries';

import { PulseDot, StringWaves } from '../DashboardPrimitives';
import { eyebrow } from '../teacher/teacher-dashboard.styles';
import { adminCard, rowRule } from './admin-dashboard.styles';
import { AdminServicesCard } from './AdminDashboard.Services';

/** Phone top from the admin mobile mockup: verdict, compact pulse, at-risk, services grid. */
export const AdminMobileTop = ({
  platform,
  totals,
  now,
}: {
  platform: AdminPlatform;
  totals: PlatformPulse;
  now: Date;
}) => {
  const { pulse, atRisk } = platform;
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const metrics = [
    { v: pulse.active30.toLocaleString(), l: 'Active 30d' },
    { v: pulse.lessonsWeek.toLocaleString(), l: 'Lessons / wk' },
    { v: totals.totalSongs.toLocaleString(), l: 'Songs' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
      <div style={{ padding: '4px 4px 0' }}>
        <div style={eyebrow}>Platform · {date}</div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 22,
            marginTop: 2,
            letterSpacing: '-0.02em',
          }}
        >
          <em style={{ color: 'var(--success)' }}>Healthy</em>
          {platform.atRiskCount > 0 && ` · ${platform.atRiskCount} watch`}
        </div>
      </div>

      <section
        style={{
          ...adminCard,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 16,
          padding: '16px 18px',
        }}
      >
        <StringWaves />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PulseDot color="var(--success)" size={6} />
            <span style={{ ...eyebrow, color: 'var(--success)' }}>Platform pulse</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginTop: 12,
            }}
          >
            {metrics.map((m, i) => (
              <div
                key={m.l}
                style={{
                  borderLeft: i === 0 ? 'none' : '1px solid var(--rule)',
                  paddingLeft: i === 0 ? 0 : 10,
                }}
              >
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500 }}>
                  {m.v}
                </div>
                <div style={{ ...eyebrow, marginTop: 2 }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {atRisk.length > 0 && (
        <section style={{ ...adminCard, padding: '14px 16px' }}>
          <div style={{ ...eyebrow, color: 'var(--danger)', marginBottom: 8 }}>
            At risk · {platform.atRiskCount} students
          </div>
          {atRisk.slice(0, 4).map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px minmax(0,1fr) auto',
                gap: 10,
                alignItems: 'center',
                padding: '8px 0',
                ...rowRule(i),
              }}
            >
              <StudentInitials name={s.name} email={s.email} color={s.color} size={22} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.name ?? s.email}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  No practice · {s.daysQuiet} days
                </div>
              </div>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: (s.daysQuiet ?? 0) > 21 ? 'var(--danger)' : 'var(--warn)',
                }}
              >
                {s.daysQuiet}d
              </span>
            </div>
          ))}
        </section>
      )}

      <AdminServicesCard isCompact />

      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          marginTop: 6,
          letterSpacing: '.1em',
        }}
      >
        COHORTS · AUDIT · INVITES
      </div>
    </div>
  );
};
