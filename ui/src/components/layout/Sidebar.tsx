// Layout component for the application shell.

import { useState, useEffect, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, CreditCard, BarChart3, DollarSign,
  ClipboardList, CheckCircle, Building2, AlertTriangle, FileQuestion,
  LogOut, Sun, Moon, Menu, X, User, CalendarDays, Settings as SettingsIcon,
  Archive, MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppDispatch, useAppSelector, useRBAC } from '../../features/crm/hooks';
import { logout } from '../../slices/authSlice';
import { fetchCentersForce } from '../../slices/centersSlice';
import { selectCenterOptions } from '../../store/selectors';
import { useThemeMode } from '../../theme/ThemeContext';
import { getStoredActiveCenterId, setStoredActiveCenterId } from '../../shared/auth/authStorage';
import { useLanguage } from '../../i18n/LanguageContext';

const iconMap: Record<string, React.ElementType> = {
  Dashboard: LayoutDashboard,
  MdPeople: Users,
  MdPerson: User,
  MdBook: BookOpen,
  MdPayment: CreditCard,
  MdBarChart: BarChart3,
  Finance: DollarSign,
  MdAssignment: ClipboardList,
  MdChecklist: CheckCircle,
  MdBusiness: Building2,
  MdWarning: AlertTriangle,
  MdQuiz: FileQuestion,
  Calendar: CalendarDays,
  Settings: SettingsIcon,
  Archive,
  Telegram: MessageCircle,
  Rooms: Building2,
  Logs: ClipboardList,
};


const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 72;
const SIDEBAR_OPEN_KEY = 'crm_sidebar_open';

const getStoredSidebarOpen = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIDEBAR_OPEN_KEY) === 'true';
};

// Renders the sidebar module.
const Sidebar = memo(() => {
  const [isOpen, setIsOpen] = useState(getStoredSidebarOpen);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { toggleTheme, isDark } = useThemeMode();
  const { t } = useLanguage();
  const { canAccess } = useRBAC();
  const normalizedRole = String(user?.role || '').toLowerCase();
  const isGlobalSuperuser = user?.userType === 'superuser' && normalizedRole === 'owner';
  const [activeCenterId, setActiveCenterId] = useState<number | null>(getStoredActiveCenterId());
  const centerOptions = useAppSelector(selectCenterOptions).map((center) => ({
    id: Number(center.value),
    label: center.label,
  }));

// Runs side effects for this component.
  useEffect(() => {
// Handles check.
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

// Runs side effects for this component.
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem(SIDEBAR_OPEN_KEY, String(isOpen));
      window.dispatchEvent(new CustomEvent('sidebar-toggled', { detail: { isOpen } }));
    }
  }, [isMobile, isOpen]);

// Runs side effects for this component.
  useEffect(() => {
    if (!isGlobalSuperuser) return;
    dispatch(fetchCentersForce());
  }, [dispatch, isGlobalSuperuser]);

// Runs side effects for this component.
  useEffect(() => {
    if (!isGlobalSuperuser) return;
    if (!activeCenterId && centerOptions.length > 0) {
      setActiveCenterId(centerOptions[0].id);
    }
  }, [activeCenterId, centerOptions, isGlobalSuperuser]);

// Runs side effects for this component.
  useEffect(() => {
    if (!isGlobalSuperuser) return;
// Handles sync active center.
    const syncActiveCenter = () => setActiveCenterId(getStoredActiveCenterId());
    syncActiveCenter();
    window.addEventListener('active-center-changed', syncActiveCenter);
    return () => window.removeEventListener('active-center-changed', syncActiveCenter);
  }, [isGlobalSuperuser]);

// Runs side effects for this component.
  useEffect(() => {
    if (!isGlobalSuperuser) return;
    setStoredActiveCenterId(activeCenterId);
  }, [activeCenterId, isGlobalSuperuser]);

  const isExpanded = isMobile || isOpen;

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', iconName: 'Dashboard', roles: ['superuser'] },
    { label: 'My Portal', path: '/teacher-portal', iconName: 'MdPeople', roles: ['teacher'] },
    { label: 'My Portal', path: '/student-portal', iconName: 'MdPerson', roles: ['student'] },
    { label: 'My Tests', path: '/my-tests', iconName: 'MdQuiz', roles: ['student'] },
    { label: 'Students', path: '/students', iconName: 'MdPeople', roles: ['superuser'], permission: 'CRUD_STUDENT' },
    { label: 'Telegram Leads', path: '/telegram-registrations', iconName: 'Telegram', roles: ['superuser'], permission: 'CRUD_STUDENT' },
    { label: 'Archive', path: '/archive', iconName: 'Archive', roles: ['superuser'] },
    { label: 'Teachers', path: '/teachers', iconName: 'MdBook', roles: ['superuser'], permission: 'CRUD_TEACHER' },
    { label: 'Classes', path: '/classes', iconName: 'MdBook', roles: ['superuser'], permission: 'CRUD_CLASS' },
    { label: 'Rooms', path: '/rooms', iconName: 'Rooms', roles: ['superuser'], permission: 'CRUD_ROOM' },
    { label: 'Logs', path: '/logs', iconName: 'Logs', roles: ['superuser'] },
    { label: 'Calendar', path: '/calendar', iconName: 'Calendar', roles: ['superuser', 'teacher', 'student'] },


    // Settings removed from sidebar — accessible via gear icon in header
    { label: 'Tests', path: '/tests', iconName: 'MdQuiz', roles: ['superuser', 'teacher'], permission: 'MANAGE_TESTS' },
    { label: 'Payments', path: '/payments', iconName: 'MdPayment', roles: ['superuser', 'teacher'], permission: 'CRUD_PAYMENT' },
    { label: 'Finance', path: '/finance', iconName: 'Finance', roles: ['superuser'], permission: 'VIEW_FINANCE' },
    { label: 'Grades', path: '/grades', iconName: 'MdBarChart', roles: ['superuser'], permission: 'CRUD_GRADE' },
    { label: 'Attendance', path: '/attendance', iconName: 'MdAssignment', roles: ['superuser'], permission: 'CRUD_ATTENDANCE' },
    { label: 'Assignments', path: '/assignments', iconName: 'MdChecklist', roles: ['superuser'], permission: 'CRUD_ASSIGNMENT' },
    { label: 'Subjects', path: '/subjects', iconName: 'MdBook', roles: ['superuser'], permission: 'CRUD_SUBJECT' },
    { label: 'Debts', path: '/debts', iconName: 'MdWarning', roles: ['superuser'], permission: 'CRUD_DEBT' },
    { label: 'Owner Panel', path: '/owner/manage', iconName: 'Settings', roles: ['superuser'], ownerOnly: true },
    { label: 'Centers', path: '/centers', iconName: 'MdBusiness', roles: ['superuser'], ownerOnly: true },
  ];


  const filteredMenuItems = menuItems.filter((item) => {
    if (!user?.userType) return false;
    if (!item.roles?.includes(user.userType)) return false;
    if (item.ownerOnly && (user.role || '').toLowerCase() !== 'owner') return false;
    if (item.permission && !canAccess(item.permission)) return false;
    return true;
  });

// Handles logout.
  const handleLogout = () => {
    dispatch(logout());
    navigate((user?.role || '').toLowerCase() === 'owner' ? '/login/owner' : '/login/superuser');
  };

// Handles navigation.
  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setIsOpen(false);
    }
  };

// Handles sidebar content.
  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className={cn('border-b border-sidebar-border', isExpanded ? 'px-3 py-3' : 'px-2 py-3')}>
        <div className={cn('flex items-center', isExpanded ? 'justify-between gap-2' : 'justify-center')}>
          <div className={cn('flex items-center min-w-0', isExpanded ? 'gap-3' : 'gap-0')}>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/40"
              aria-label="Open sidebar"
            >
              {isExpanded ? <LayoutDashboard className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {isExpanded && <h1 className="truncate text-lg font-bold tracking-tight">EduCRM</h1>}
          </div>
          {isExpanded && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleNavigation('/settings')}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {!isExpanded && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavigation('/settings')}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-sidebar-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-sidebar-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>


      {user && isGlobalSuperuser && isExpanded && (
        <div className="mx-3 mt-2">
          <label htmlFor="active_center_sidebar" className="sr-only">
            {t('Active Branch')}
          </label>
          <div className="flex h-9 items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-2">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              id="active_center_sidebar"
              value={activeCenterId ?? ''}
              onChange={(e) => setActiveCenterId(e.target.value ? Number(e.target.value) : null)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            >
              {centerOptions.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 pt-2 px-2">
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-0.5">
            {filteredMenuItems.map((item) => {
              const Icon = iconMap[item.iconName] || Users;
              const isActive = location.pathname === item.path;
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={cn(
                        'flex w-full items-center rounded-lg border-l-[3px] text-sm transition-all duration-200',
                        isExpanded ? 'gap-3 px-3 py-2' : 'justify-center gap-0 px-0 py-2.5',
                        isActive
                          ? 'border-indigo-400 bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-sidebar-accent-foreground font-semibold'
                          : 'border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-muted-foreground')} />
                      {isExpanded && <span>{t(item.label)}</span>}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={cn(isExpanded && 'hidden')}>
                    {t(item.label)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      {/* Bottom: User profile + Logout */}
      <div className={cn('border-t border-sidebar-border', isExpanded ? 'p-3' : 'p-2')}>
        {user && isExpanded ? (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-400 text-white text-sm font-semibold">
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{user.first_name} {user.last_name}</p>
              <p className="truncate text-[0.7rem] font-medium text-indigo-400 uppercase tracking-wider">{user.role || user.userType}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-rose-500/20 text-rose-500 transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-9 w-9 mx-auto items-center justify-center rounded-md border border-rose-500/20 text-rose-500 transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-[999] p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/50" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'z-[1300] h-screen shrink-0 overflow-hidden border-r border-sidebar-border transition-all duration-300',
          isMobile ? 'fixed top-0 left-0' : 'fixed top-0 left-0',
          isMobile && !isOpen && '-translate-x-full'
        )}
        style={{ width: isMobile || isOpen ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH }}
      >
        {sidebarContent}
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
