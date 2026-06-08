import { SidebarNav } from '../shell/SidebarNav';
import { TopBar } from '../shell/TopBar';

import { AchievementsCard } from './cards/AchievementsCard';
import { ActivityCard } from './cards/ActivityCard';
import { LastLessonCard } from './cards/LastLessonCard';
import { SongsCard } from './cards/SongsCard';
import { StreakCard } from './cards/StreakCard';
import { StudentHero } from './StudentHero';

export const StudentDashboard = ({
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
      roleLabel="Student"
      userInitials="LC"
      userName="Liam Chen"
      userRole="Student · Year 2"
    />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <TopBar weekLabel="Week 17" primaryLabel="Log practice" />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px 64px',
          background: 'var(--ivory)',
        }}
      >
        <StudentHero />
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <LastLessonCard />
            <SongsCard />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <StreakCard />
            <ActivityCard />
            <AchievementsCard />
          </div>
        </div>
      </div>
    </div>
  </div>
);
