// Layout component for the application shell.

import { useState, useEffect, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, CreditCard, BarChart3, DollarSign,
  ClipboardList, CheckCircle, Building2, AlertTriangle, FileQuestion,
  LogOut, Sun, Moon, Menu, X, User, CalendarDays, Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppDispatch, useAppSelector, useRBAC } from '../../features/crm/hooks';
import { logout } from '../../slices/authSlice';
import { fetchCentersForce } from '../../slices/centersSlice';
import { selectCenterOptions } from '../../store/selectors';
import { useThemeMode } from '../../theme/ThemeContext';
import { getStoredActiveCenterId, setStoredActiveCenterId } from '../../shared/auth/authStorage';

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
  Rooms: Building2,
  Logs: ClipboardList,
};


const DRAWER_WIDTH = 280;

// Renders the sidebar module.
const Sidebar = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { toggleTheme, isDark } = useThemeMode();
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

  const activeCenterLabel =
    centerOptions.find((center) => center.id === activeCenterId)?.label ||
    (activeCenterId ? `Center ${activeCenterId}` : 'Select a branch');

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', iconName: 'Dashboard', roles: ['superuser'] },
    { label: 'My Portal', path: '/teacher-portal', iconName: 'MdPeople', roles: ['teacher'] },
    { label: 'My Portal', path: '/student-portal', iconName: 'MdPerson', roles: ['student'] },
    { label: 'My Tests', path: '/my-tests', iconName: 'MdQuiz', roles: ['student'] },
    { label: 'Students', path: '/students', iconName: 'MdPeople', roles: ['superuser'], permission: 'CRUD_STUDENT' },
    { label: 'Teachers', path: '/teachers', iconName: 'MdBook', roles: ['superuser'], permission: 'CRUD_TEACHER' },
    { label: 'Classes', path: '/classes', iconName: 'MdBook', roles: ['superuser'], permission: 'CRUD_CLASS' },
    { label: 'Rooms', path: '/rooms', iconName: 'Rooms', roles: ['superuser'], permission: 'CRUD_ROOM' },
    { label: 'Logs', path: '/logs', iconName: 'Logs', roles: ['superuser'] },
    { label: 'Calendar', path: '/calendar', iconName: 'Calendar', roles: ['superuser', 'teacher', 'student'] },


    { label: 'Settings', path: '/settings', iconName: 'Settings', roles: ['superuser'], permission: 'MANAGE_USERS' },
    { label: 'Tests', path: '/tests', iconName: 'MdQuiz', roles: ['superuser', 'teacher'], permission: 'MANAGE_TESTS' },
    { label: 'Payments', path: '/payments', iconName: 'MdPayment', roles: ['superuser'], permission: 'CRUD_PAYMENT' },
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
    if (isMobile) setIsOpen(false);
  };

// Handles sidebar content.
  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/40">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">EduCRM</h1>
        </div>
        {isMobile && (
          <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Info */}
      {user && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-400 text-white text-sm font-semibold">
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-800" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{user.first_name} {user.last_name}</p>
              <p className="text-[0.7rem] font-medium text-indigo-400 uppercase tracking-wider">{user.role || user.userType}</p>
            </div>
          </div>
        </div>
      )}

      {user && isGlobalSuperuser && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <label htmlFor="active_center_sidebar" className="block text-xs text-white/60 mb-1">
            Active Branch
          </label>
          <p className="mb-2 text-sm font-medium text-white">{activeCenterLabel}</p>
          <select
            id="active_center_sidebar"
            value={activeCenterId ?? ''}
            onChange={(e) => setActiveCenterId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-md bg-white/5 border border-white/10 text-white text-sm px-2 py-2"
          >
            {centerOptions.map((center) => (
              <option key={center.id} value={center.id}>
                {center.label}
              </option>
            ))}
          </select>
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
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 border-l-[3px]',
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500/30 to-violet-500/20 text-white border-indigo-400 font-semibold'
                          : 'text-white/60 border-transparent hover:bg-white/[0.06] hover:text-white'
                      )}
                    >
                      <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-indigo-400' : 'text-white/40')} />
                      <span>{item.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="sm:hidden">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      <Separator className="bg-white/[0.06]" />

      {/* Theme Toggle */}
      <div className="px-3 pt-3 pb-1.5">
        <Button
          variant="ghost"
          onClick={toggleTheme}
          className="w-full justify-start gap-2 text-white/70 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </Button>
      </div>

      {/* Logout */}
      <div className="px-3 pb-3 pt-1.5">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border border-rose-500/20"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
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
        <div className="fixed inset-0 z-[1200] bg-black/60" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'h-screen border-r border-white/[0.06] shrink-0 transition-transform duration-300 z-[1300]',
          isMobile ? 'fixed top-0 left-0' : 'fixed top-0 left-0',
          isMobile && !isOpen && '-translate-x-full'
        )}
        style={{ width: DRAWER_WIDTH }}
      >
        {sidebarContent}
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
