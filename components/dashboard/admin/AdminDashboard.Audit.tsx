'use client';

import { useState } from 'react';

import type { AuditEntry, AuditRole } from '@/lib/services/admin-audit-queries';

import { eyebrow } from '../teacher/teacher-dashboard.styles';
import { adminCard, rowRule } from './admin-dashboard.styles';

const ROLE_COLOR: Record<AuditRole, string> = {
  admin: 'var(--gold-2)',
  teacher: 'var(--info)',
  system: 'var(--ink-4)',
};
const FILTERS = ['all', 'admin', 'teacher', 'system'] as const;

/** "Audit log · Recent activity", filterable by who acted. Times arrive preformatted. */
export function AdminAuditCard({
  entries,
  agoById,
}: {
  entries: AuditEntry[];
  agoById: Record<string, string>;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const shown = filter === 'all' ? entries : entries.filter((e) => e.role === filter);
  return (
    <section style={adminCard}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={eyebrow}>Audit log</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2 }}>
            Recent activity
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTERS.map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 10,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  border: isActive ? '1px solid var(--ink)' : '1px solid var(--rule)',
                  background: isActive ? 'var(--ink)' : 'transparent',
                  color: isActive ? 'var(--paper)' : 'var(--ink-3)',
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>
      {shown.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Nothing recorded.</div>
      )}
      {shown.map((a, i) => (
        <div
          key={a.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '8px minmax(0,1fr) auto',
            gap: 14,
            alignItems: 'flex-start',
            padding: '10px 0',
            ...rowRule(i),
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: ROLE_COLOR[a.role],
              marginTop: 6,
            }}
          />
          <div style={{ fontSize: 12, lineHeight: 1.45, minWidth: 0, overflowWrap: 'anywhere' }}>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{a.who}</span>{' '}
            <span style={{ color: 'var(--ink-2)' }}>{a.verb}</span>{' '}
            <span style={{ fontWeight: 500 }}>{a.object}</span>
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--ink-4)',
              whiteSpace: 'nowrap',
            }}
          >
            {agoById[a.id]}
          </div>
        </div>
      ))}
    </section>
  );
}
