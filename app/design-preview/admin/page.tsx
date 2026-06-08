import { AdminDashboard } from '@/components/design-preview/admin/AdminDashboard';
import { AdminDashboardMobile } from '@/components/design-preview/admin/AdminDashboardMobile';
import { ArtboardStage } from '@/components/design-preview/shell/ArtboardStage';

export default function AdminDashboardPreview() {
  return (
    <ArtboardStage
      title="Admin Dashboard"
      subtitle='"Is the platform healthy and who is stuck?" — platform pulse, at-risk students, cohort health, services, audit log, pending invites, Strummy AI strip.'
      artboards={[
        {
          label: 'Desktop · 1440 × 1024 — pulse + at-risk',
          width: 1440,
          height: 1024,
          node: <AdminDashboard />,
        },
        {
          label: 'Mobile · 390 × 844',
          width: 390,
          height: 844,
          node: <AdminDashboardMobile />,
        },
      ]}
    />
  );
}
