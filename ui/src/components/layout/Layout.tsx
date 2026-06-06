// Layout component for the application shell.

import type { ReactNode } from 'react';
import { memo, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAppSelector } from '../../features/crm/hooks';
import { TranslationEditMode } from './TranslationEditMode';

const SIDEBAR_OPEN_KEY = 'crm_sidebar_open';

const getInitialOpen = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIDEBAR_OPEN_KEY) === 'true';
};

interface LayoutProps {
  children: ReactNode;
}

// Renders the layout module.
const Layout = memo(({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(getInitialOpen);
  const [isMobile, setIsMobile] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const isOwner = user?.userType === 'superuser' && String(user.role || '').toLowerCase() === 'owner';

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

  const marginLeft = isMobile ? 0 : sidebarOpen ? 280 : 72;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <TranslationEditMode isOwner={isOwner} />
      <main
        className="flex-1 overflow-auto p-3 sm:p-5 md:p-6 bg-background transition-all duration-300"
        style={{ marginLeft }}
      >
        {children}
      </main>
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;
