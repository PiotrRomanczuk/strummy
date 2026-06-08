import { ArtboardStage } from '@/components/design-preview/shell/ArtboardStage';
import { TeacherDashboard } from '@/components/design-preview/teacher/TeacherDashboard';
import { TeacherDashboardMobile } from '@/components/design-preview/teacher/TeacherDashboardMobile';

export default function TeacherDashboardPreview() {
  return (
    <ArtboardStage
      title="Teacher Dashboard"
      subtitle='"Who needs my attention, what does my day look like?" — vertical day-spine with CAPO "now" marker, needs-attention rail, week density, studio + library.'
      artboards={[
        {
          label: 'Desktop · 1440 × 1024 — day-spine schedule',
          width: 1440,
          height: 1024,
          node: <TeacherDashboard />,
        },
        {
          label: 'Mobile · 390 × 844',
          width: 390,
          height: 844,
          node: <TeacherDashboardMobile />,
        },
      ]}
    />
  );
}
