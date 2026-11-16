import Link from 'next/link';

import type { ParentChild, ParentChildOverview } from '@/lib/services/parent-dashboard-queries';
import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';

import { ParentDashboardDetails } from './ParentDashboard.Details';
import { ParentDashboardEmpty } from './ParentDashboard.Empty';
import { ParentDashboardHero } from './ParentDashboard.Hero';
import { ParentNoteCard } from './ParentDashboard.Note';
import { ParentPracticeCard } from './ParentDashboard.Practice';
import { ParentBillingCard, ParentUpcomingLessonsCard } from './ParentDashboard.Sidebar';

type Props = {
  childrenList: ParentChild[];
  activeChildId: string | null;
  child: ParentChildOverview | null;
};

const PAGE_STYLE = {
  background: 'var(--ivory)',
  color: 'var(--ink)',
  fontSize: 13,
  lineHeight: 1.4,
  minHeight: '100%',
  padding: '28px 32px 64px',
} as const;

const ChildSwitcher = ({
  childrenList,
  activeChildId,
}: {
  childrenList: ParentChild[];
  activeChildId: string | null;
}) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
    {childrenList.map((child) => (
      <Link
        key={child.id}
        href={`/dashboard?view=parent&child=${child.id}`}
        className="ui-parent-tab"
        aria-current={child.id === activeChildId ? 'true' : undefined}
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--ink-4)',
          textDecoration: 'none',
          border: '1px solid var(--rule)',
          borderRadius: 999,
          padding: '6px 14px',
        }}
      >
        {child.name}
      </Link>
    ))}
  </div>
);

export const ParentDashboard = ({ childrenList, activeChildId, child }: Props) => {
  if (!child) return <ParentDashboardEmpty />;

  return (
    <div style={PAGE_STYLE}>
      <ParentDashboardHero child={child} />

      {childrenList.length > 1 && (
        <ChildSwitcher childrenList={childrenList} activeChildId={activeChildId} />
      )}

      {SHOW_PRACTICE_FEATURES ? (
        <div className="ui-grid-hero" style={{ marginTop: 20 }}>
          <ParentPracticeCard days={child.practiceDays} week={child.practiceWeek} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ParentUpcomingLessonsCard lessons={child.upcomingLessons} />
            <ParentBillingCard />
          </div>
        </div>
      ) : (
        // The hero grid's wide 1.45fr column exists to hold the practice card.
        // With it hidden, the two remaining cards go side by side rather than
        // letting the sidebar stack stretch across it.
        <div className="ui-grid-2" style={{ marginTop: 20 }}>
          <ParentUpcomingLessonsCard lessons={child.upcomingLessons} />
          <ParentBillingCard />
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <ParentNoteCard note={child.latestNote} childName={child.name} />
      </div>

      <ParentDashboardDetails
        assignments={child.assignments}
        pastLessons={child.pastLessons}
        songs={child.songs}
      />
    </div>
  );
};
