// Layout component for the application shell.

import type { ReactNode } from 'react';
import { memo, Suspense, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAppSelector } from '../../features/crm/hooks';
import { TranslationEditMode } from './TranslationEditMode';

const SIDEBAR_OPEN_KEY = 'crm_sidebar_open';

const getInitialOpen = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIDEBAR_OPEN_KEY) === 'true';
};

export const MainContentLoading = () => (
  <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center rounded-lg border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.04]">
    <div className="flex flex-col items-center gap-3 text-center">
      <Loader2 className="h-9 w-9 animate-spin text-primary" />
      <p className="text-sm font-semibold text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

interface LayoutProps {
  children: ReactNode;
}

// Renders the layout module.
const Layout = memo(({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(getInitialOpen);
  const [isMobile, setIsMobile] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const isOwner = user?.userType === 'superuser' && String(user.role || '').toLowerCase() === 'owner';
  const isStudent = user?.userType === 'student';
  // Hide sidebar for students and for all teachers (teacher UI is simplified)
  const isTeacher = user?.userType === 'teacher';
  const hideSidebar = isStudent || isTeacher;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.isOpen === 'boolean') {
        setSidebarOpen(detail.isOpen);
      }
    };
    window.addEventListener('sidebar-toggled', handler);
    return () => window.removeEventListener('sidebar-toggled', handler);
  }, []);

  const marginLeft = hideSidebar || isMobile ? 0 : sidebarOpen ? 280 : 72;

  return (
    <div className="flex min-h-screen bg-background">
      {!hideSidebar && <Sidebar />}
      <TranslationEditMode isOwner={isOwner} />
      <main
        className={`flex-1 overflow-auto bg-background transition-all duration-300 ${isStudent ? 'p-0' : 'p-3 sm:p-5 md:p-6'}`}
        style={{ marginLeft }}
      >
        <Suspense fallback={<MainContentLoading />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;
