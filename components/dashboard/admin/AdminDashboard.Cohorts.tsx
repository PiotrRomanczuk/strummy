import type { AdminCohort } from '@/lib/services/admin-platform-queries';

import { eyebrow } from '../teacher/teacher-dashboard.styles';
import { adminCard } from './admin-dashboard.styles';

const LABEL: Record<AdminCohort['key'], string> = {
  new: 'New (0–3 mo)',
  active: 'Active (3–12 mo)',
  long: 'Long-term (1y+)',
};

const SEGMENTS = [
  { key: 'healthy', label: 'Healthy', color: 'var(--success)' },
  { key: 'atRisk', label: 'At risk', color: 'var(--warn)' },
  { key: 'dormant', label: 'Dormant', color: 'var(--ink-4)' },
] as const;

/** "Cohort health": students by tenure, split healthy / at risk / dormant by practice recency. */
export const AdminCohortsCard = ({ cohorts, total }: { cohorts: AdminCohort[]; total: number }) => (
  <section style={adminCard}>
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}
    >
      <div>
        <div style={eyebrow}>Cohort health</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2 }}>
          {total} students across the platform
        </div>
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
        by practice recency
      </span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {cohorts.map((c) => (
        <div key={c.key}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500 }}>{LABEL[c.key]}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
              {c.count}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              height: 8,
              borderRadius: 4,
              overflow: 'hidden',
              background: 'var(--rule-2)',
            }}
          >
            {SEGMENTS.map((s) => (
              <div
                key={s.key}
                style={{
                  width: `${c.count ? (c[s.key] / c.count) * 100 : 0}%`,
                  background: s.color,
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 14,
              marginTop: 6,
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--ink-3)',
              flexWrap: 'wrap',
            }}
          >
            {SEGMENTS.map((s) => (
              <span key={s.key}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: s.color,
                    marginRight: 4,
                  }}
                />
                {s.label} {c[s.key]}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);
