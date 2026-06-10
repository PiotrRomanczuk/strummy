import { SidebarNav } from '../shell/SidebarNav';
import { TopBar } from '../shell/TopBar';

import { AdminGreeting } from './AdminGreeting';
import { AssistantStrip } from './AssistantStrip';
import { AtRiskCard } from './AtRiskCard';
import { AuditLogCard } from './AuditLogCard';
import { CohortInsightsCard } from './CohortInsightsCard';
import { PendingInvitesCard } from './PendingInvitesCard';
import { PlatformPulseCard } from './PlatformPulseCard';
import { ServicesCard } from './ServicesCard';

export const AdminDashboard = ({
  width = 1440,
  height = 1024,
}: {
  width?: number;
  height?: number;
}) => (
  <div
    className="app-viewport"
    style={{
      width,
      height,
      display: 'flex',
      background: 'var(--ivory)',
      color: 'var(--ink)',
      fontSize: 13,
      lineHeight: 1.4,
      overflow: 'hidden',
      borderRadius: 'var(--radius-lg)',
    }}
  >
    <SidebarNav
      active="home"
      roleLabel="Admin"
      userInitials="AD"
      userName="Admin · Studios"
      userRole="Platform owner"
    />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <TopBar weekLabel="Platform" primaryLabel="Invite user" />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px 64px',
          background: 'var(--ivory)',
        }}
      >
        <AdminGreeting />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <PlatformPulseCard />
          <AtRiskCard />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: 20,
            marginTop: 20,
          }}
        >
          <CohortInsightsCard />
          <ServicesCard />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: 20,
            marginTop: 20,
          }}
        >
          <AuditLogCard />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <PendingInvitesCard />
            <AssistantStrip />
          </div>
        </div>
      </div>
    </div>
  </div>
);
