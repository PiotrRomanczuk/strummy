import { ArtboardStage } from '@/components/design-preview/shell/ArtboardStage';
import { StudentDashboard } from '@/components/design-preview/student/StudentDashboard';
import { StudentDashboardMobile } from '@/components/design-preview/student/StudentDashboardMobile';

export default function StudentDashboardPreview() {
  return (
    <ArtboardStage
      title="Student Dashboard"
      subtitle='"What do I practice today?" — countdown hero, today’s practice set list, recap, repertoire, streak, activity, achievements.'
      artboards={[
        {
          label: 'Desktop · 1440 × 1024 — practice hero',
          width: 1440,
          height: 1024,
          node: <StudentDashboard />,
        },
        {
          label: 'Mobile · 390 × 844',
          width: 390,
          height: 844,
          node: <StudentDashboardMobile />,
        },
      ]}
    />
  );
}
