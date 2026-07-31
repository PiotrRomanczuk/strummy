'use client';

import Link from 'next/link';

import type { AssignmentListCounts } from '@/lib/services/assignment-list-params';

export type ListTab = { key: string; label: string; countKey: keyof AssignmentListCounts };

type Props = {
  tabs: ListTab[];
  counts: AssignmentListCounts;
  activeStatus?: string;
  buildHref: (patch: Record<string, string | null>) => string;
};

/** Status filter chips row for the assignments list — split out of
 * AssignmentsListControls to keep that file under the size limit. */
export const AssignmentsListControlsTabs = ({ tabs, counts, activeStatus, buildHref }: Props) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {tabs.map((tab) => {
      const active = (activeStatus ?? '') === tab.key;
      return (
        <Link
          key={tab.key || 'all'}
          href={buildHref({ status: tab.key || null })}
          className={active ? undefined : 'ui-chip'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 999,
            border: `1px solid ${active ? 'var(--ink-2)' : 'var(--rule)'}`,
            background: active ? 'var(--ink)' : 'transparent',
            color: active ? 'var(--ivory)' : 'var(--ink-3)',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            textDecoration: 'none',
          }}
        >
          {tab.label}
          <span style={{ opacity: 0.7 }}>{counts[tab.countKey]}</span>
        </Link>
      );
    })}
  </div>
);
