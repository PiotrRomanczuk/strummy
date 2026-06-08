import { SidebarNav } from '../shell/SidebarNav';
import { TopBar } from '../shell/TopBar';

import { NeedsAttentionCard } from './cards/NeedsAttentionCard';
import { SongLibraryCard } from './cards/SongLibraryCard';
import { StudentRoster } from './cards/StudentRoster';
import { UtilizationCard } from './cards/UtilizationCard';
import { WeekDensityCard } from './cards/WeekDensityCard';
import { TeacherDaySpine } from './TeacherDaySpine';
import { TeacherGreeting } from './TeacherGreeting';

export const TeacherDashboard = ({
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
    <SidebarNav active="home" />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <TopBar />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px 64px',
          background: 'var(--ivory)',
        }}
      >
        <TeacherGreeting />
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 20 }}>
          <TeacherDaySpine />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <NeedsAttentionCard />
            <WeekDensityCard />
            <UtilizationCard />
          </div>
        </div>
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <StudentRoster />
          <SongLibraryCard />
        </div>
      </div>
    </div>
  </div>
);
