import type { LockedAccount } from '@/app/actions/admin/lockout';
import type { AuditEntry } from '@/lib/services/admin-audit-queries';
import type { AdminPendingInvite, PlatformPulse } from '@/lib/services/admin-dashboard-queries';
import type { AdminPlatform } from '@/lib/services/admin-platform-queries';

import { AdminAtRiskCard } from './AdminDashboard.AtRisk';
import { AdminAuditCard } from './AdminDashboard.Audit';
import { AdminCohortsCard } from './AdminDashboard.Cohorts';
import { AdminGreeting } from './AdminDashboard.Greeting';
import { AdminMobileTop } from './AdminDashboard.Mobile';
import { AdminPulseCard } from './AdminDashboard.Pulse';
import { AdminServicesCard } from './AdminDashboard.Services';
import { AdminAssistantStrip, AdminPendingCard } from './AdminDashboard.Side';
import { LockedAccountsCard } from './LockedAccountsCard';

type Props = {
  pulse: PlatformPulse;
  platform: AdminPlatform;
  audit: AuditEntry[];
  invites: AdminPendingInvite[];
  lockedAccounts: LockedAccount[];
  now: Date;
};

const agoLabel = (iso: string, now: Date) => {
  const mins = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60_000));
  return mins < 60
    ? `${mins}m ago`
    : mins < 1440
      ? `${Math.floor(mins / 60)}h ago`
      : `${Math.floor(mins / 1440)}d ago`;
};

/**
 * Claude Design admin dashboard — "is the platform healthy, and who's stuck?":
 * pulse + trending churn, cohort health + services, audit log + invites.
 */
export const AdminDashboard = ({ pulse, platform, audit, invites, lockedAccounts, now }: Props) => {
  const agoById = Object.fromEntries(audit.map((a) => [a.id, agoLabel(a.at, now)]));
  const top = platform.atRisk[0];
  return (
    <div
      className="ui-dash-page"
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
      }}
    >
      <div className="md:hidden">
        <AdminMobileTop platform={platform} totals={pulse} now={now} />
      </div>
      <div className="hidden md:block">
        <AdminGreeting now={now} atRisk={platform.atRiskCount} />
        <div className="ui-grid-2">
          <AdminPulseCard pulse={platform.pulse} totals={pulse} watchCount={platform.atRiskCount} />
          <AdminAtRiskCard students={platform.atRisk} total={platform.atRiskCount} />
        </div>
      </div>

      <div
        className="ui-admin-row"
        style={{ gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)' }}
      >
        <AdminCohortsCard cohorts={platform.cohorts} total={platform.studentCount} />
        <div className="hidden md:block">
          <AdminServicesCard />
        </div>
      </div>
      <div
        className="ui-admin-row"
        style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)' }}
      >
        <AdminAuditCard entries={audit} agoById={agoById} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <AdminPendingCard invites={invites} now={now} />
          <LockedAccountsCard accounts={lockedAccounts} />
          <AdminAssistantStrip topName={top ? (top.name ?? top.email) : null} />
        </div>
      </div>
    </div>
  );
};
