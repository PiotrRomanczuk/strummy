import '@/app/design-tokens.css';

import { dashboardFontVariables } from '@/lib/config/dashboard-fonts';

/** Auth pages share the Claude Design tokens and faces with the dashboard. */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <div className={`theme-strummy ${dashboardFontVariables}`}>{children}</div>;
}
