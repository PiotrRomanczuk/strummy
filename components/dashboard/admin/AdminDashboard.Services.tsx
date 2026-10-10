'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { ServiceCheck } from '@/types/health';

import { eyebrow } from '../teacher/teacher-dashboard.styles';
import { adminCard, rowRule } from './admin-dashboard.styles';

const DOT: Record<string, string> = {
  healthy: 'var(--success)',
  degraded: 'var(--warn)',
  error: 'var(--danger)',
};

/**
 * "Services": the live /api/health checks. Fetched after paint so a slow
 * provider never holds the dashboard; unconfigured services are left out.
 */
export function AdminServicesCard({ isCompact = false }: { isCompact?: boolean }) {
  const [services, setServices] = useState<ServiceCheck[] | null>(null);

  useEffect(() => {
    let isCancelled = false;
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { services?: Record<string, ServiceCheck> } | null) => {
        const all = Object.values(body?.services ?? {});
        if (!isCancelled) setServices(all.filter((s) => s.status !== 'unconfigured'));
      })
      .catch(() => !isCancelled && setServices([]));
    return () => {
      isCancelled = true;
    };
  }, []);

  const ok = services?.filter((s) => s.status === 'healthy').length ?? 0;
  return (
    <section style={adminCard}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span style={eyebrow}>Services</span>
        {services && (
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: ok === services.length ? 'var(--success)' : 'var(--warn)',
            }}
          >
            {ok}/{services.length} OK
          </span>
        )}
      </div>
      {!services && <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Checking…</div>}
      <div
        style={
          isCompact
            ? { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }
            : { display: 'flex', flexDirection: 'column' }
        }
      >
        {services?.map((s, i) =>
          isCompact ? (
            <div
              key={s.name}
              style={{
                border: '1px solid var(--rule)',
                borderRadius: 8,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: DOT[s.status] ?? 'var(--ink-4)',
                }}
              />
              <div style={{ fontSize: 11, fontWeight: 500 }}>{s.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>
                {s.latencyMs != null ? `${s.latencyMs}ms` : '—'}
              </div>
            </div>
          ) : (
            <Link
              key={s.name}
              href="/dashboard/health"
              style={{
                display: 'grid',
                gridTemplateColumns: '14px minmax(0,1fr) auto auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 0',
                color: 'inherit',
                textDecoration: 'none',
                ...rowRule(i),
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: DOT[s.status] ?? 'var(--ink-4)',
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                {s.status !== 'healthy' && s.message && (
                  <div
                    style={{
                      fontSize: 11,
                      color: DOT[s.status],
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.message}
                  </div>
                )}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                {s.latencyMs != null ? `${s.latencyMs}ms` : '—'}
              </div>
              <ChevronRight size={12} style={{ color: 'var(--ink-4)' }} />
            </Link>
          )
        )}
      </div>
    </section>
  );
}
