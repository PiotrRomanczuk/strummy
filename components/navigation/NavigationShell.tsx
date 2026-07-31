'use client';

import { useState, useCallback, lazy, Suspense } from 'react';
import { useLayoutMode } from '@/hooks/useIsWidescreen';
import { useKeyboardViewport } from '@/hooks/useKeyboardViewport';
import { Toaster } from 'sonner';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMoreMenu } from './MobileMoreMenu';
import { DemoBanner } from '@/components/demo/DemoBanner';

const NavigationShellDesktop = lazy(() => import('./NavigationShell.Desktop'));

interface NavigationShellProps {
  children: React.ReactNode;
  user: { id?: string; email?: string } | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isDevelopment?: boolean;
}

function MobileShell({ children, user, isAdmin, isTeacher, isStudent, isDevelopment }: NavigationShellProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const openMore = useCallback(() => setMoreMenuOpen(true), []);
  useKeyboardViewport();

  return (
    <>
      <Header
        user={user}
        isAdmin={isAdmin}
        isTeacher={isTeacher}
        isStudent={isStudent}
      />
      <main className="pt-14 pb-16 md:pb-0 min-h-screen bg-background px-4">
        {isDevelopment && <DemoBanner />}
        {children}
      </main>
      <MobileBottomNav
        isAdmin={isAdmin}
        isTeacher={isTeacher}
        isStudent={isStudent}
        onOpenMore={openMore}
      />
      <MobileMoreMenu
        open={moreMenuOpen}
        onOpenChange={setMoreMenuOpen}
        isAdmin={isAdmin}
        isTeacher={isTeacher}
        isStudent={isStudent}
        isDemoAccount={isDevelopment}
      />
      <Toaster />
    </>
  );
}

export function NavigationShell(props: NavigationShellProps) {
  const mode = useLayoutMode();

  if (mode === 'mobile') return <MobileShell {...props} />;

  return (
    <Suspense fallback={<MobileShell {...props} />}>
      <NavigationShellDesktop {...props} />
    </Suspense>
  );
}
