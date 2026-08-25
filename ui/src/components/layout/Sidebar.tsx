// Layout component for the application shell.

import { useState, useEffect, memo, useMemo } from 'react';
import type { ElementType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, CreditCard, BarChart3, DollarSign,
  ClipboardList, CheckCircle, Building2, AlertTriangle, FileQuestion,
  LogOut, Sun, Moon, Menu, X, User, CalendarDays, Settings as SettingsIcon,
  Archive, MessageCircle, GraduationCap, UserRoundCheck, Presentation,
  DoorOpen, NotebookTabs, UserCheck, ListTodo, BookMarked, Crown,
  School, BadgeAlert, Server, ClipboardCheck,
  TrendingDown, BadgePercent, ChevronDown, GripVertical, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppDispatch, useAppSelector, useRBAC } from '../../features/crm/hooks';
import { logout } from '../../slices/authSlice';
import { fetchCentersForce } from '../../slices/centersSlice';
import { selectCenterOptions } from '../../store/selectors';
import { useThemeMode } from '../../theme/ThemeContext';
import { getStoredActiveCenterId, setStoredActiveCenterId } from '../../shared/auth/authStorage';
import { useLanguage } from '../../i18n/LanguageContext';
import { settingsAPI } from '@/shared/api/api';

const iconMap: Record<string, ElementType> = {
  Dashboard: LayoutDashboard,
  PortalTeacher: Presentation,
  PortalStudent: User,
  Students: GraduationCap,
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
  Teachers: UserRoundCheck,
  Classes: BookOpen,
  Rooms: DoorOpen,
  Logs: NotebookTabs,
  Server,
  Attendance: UserCheck,
  Assignments: ListTodo,
  TeacherTasks: ClipboardCheck,
  Subjects: BookMarked,
  Debts: BadgeAlert,
  Salary: Wallet,
  Owner: Crown,
  Centers: School,
  Reports: BarChart3,
  Retention: TrendingDown,
  Discounts: BadgePercent,
};

const iconToneMap: Record<string, string> = {
  Dashboard: 'from-blue-600 to-indigo-600 shadow-blue-500/25',
  PortalTeacher: 'from-violet-600 to-fuchsia-600 shadow-violet-500/25',
  PortalStudent: 'from-cyan-500 to-sky-600 shadow-cyan-500/25',
  Students: 'from-emerald-500 via-cyan-500 to-blue-600 shadow-cyan-500/30',
  MdQuiz: 'from-amber-500 to-orange-600 shadow-amber-500/25',
  Telegram: 'from-sky-500 to-cyan-600 shadow-sky-500/25',
  Archive: 'from-slate-500 to-slate-700 shadow-slate-500/20',
  Teachers: 'from-purple-600 to-pink-600 shadow-purple-500/25',
  Classes: 'from-blue-500 to-violet-600 shadow-blue-500/25',
  Rooms: 'from-orange-500 to-red-500 shadow-orange-500/25',
  Logs: 'from-stone-500 to-zinc-700 shadow-stone-500/20',
  Server: 'from-emerald-600 to-cyan-700 shadow-emerald-500/25',
  Calendar: 'from-teal-500 to-emerald-600 shadow-teal-500/25',
  MdPayment: 'from-indigo-600 to-blue-700 shadow-indigo-500/25',
  MdBarChart: 'from-lime-500 to-green-600 shadow-lime-500/25',
  Attendance: 'from-green-500 to-emerald-700 shadow-green-500/25',
  Assignments: 'from-rose-500 to-pink-600 shadow-rose-500/25',
  TeacherTasks: 'from-violet-500 to-purple-700 shadow-violet-500/25',
  Subjects: 'from-yellow-500 to-amber-600 shadow-yellow-500/25',
  Debts: 'from-red-600 to-rose-700 shadow-red-500/25',
  Salary: 'from-teal-600 to-cyan-700 shadow-teal-500/25',
  Owner: 'from-fuchsia-600 to-indigo-700 shadow-fuchsia-500/25',
  Centers: 'from-cyan-600 to-teal-700 shadow-cyan-500/25',
  Reports: 'from-slate-800 to-slate-950 shadow-slate-500/25',
  Retention: 'from-rose-600 to-red-700 shadow-rose-500/25',
};

const filledIconNames = new Set(['Students', 'PortalStudent', 'Attendance', 'Owner']);

const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 72;
const SIDEBAR_OPEN_KEY = 'crm_sidebar_open';

const getStoredSidebarOpen = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIDEBAR_OPEN_KEY) === 'true';
};

type MenuItem = {
  label: string;
  path: string;
  iconName: string;
  roles: string[];
  permission?: string;
  ownerOnly?: boolean;
  hideFromOwner?: boolean;
  children?: Array<{ label: string; path: string; iconName: string }>;
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
  const [reportsExpanded, setReportsExpanded] = useState(() => location.pathname === '/owner/reports');
  const [retentionExpanded, setRetentionExpanded] = useState(() => location.pathname === '/retention');
  const [sidebarOrder, setSidebarOrder] = useState<string[]>([]);
  const [draggedPath, setDraggedPath] = useState<string | null>(null);
  const rawCenterOptions = useAppSelector(selectCenterOptions);
  const centerOptions = useMemo(
    () => rawCenterOptions.map((center) => ({
      id: Number(center.value),
      label: center.label,
    })),
    [rawCenterOptions]
  );

  useEffect(() => {
    if (!user?.id || !user?.userType) return;
    let active = true;
    settingsAPI.getSidebarOrder()
      .then((response) => {
        if (!active) return;
        const order = (response as any)?.data ?? response;
        setSidebarOrder(Array.isArray(order) ? order.map(String) : []);
      })
      .catch(() => {
        if (active) setSidebarOrder([]);
      });
    return () => { active = false; };
  }, [user?.id, user?.userType]);

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

  const handleCenterChange = (value: string) => {
    const nextCenterId = Number(value);
    if (!Number.isFinite(nextCenterId) || nextCenterId <= 0) return;
    setActiveCenterId(nextCenterId);
    setStoredActiveCenterId(nextCenterId);
  };

  const isExpanded = isMobile || isOpen;

  const menuItems: MenuItem[] = [
    { label: 'Dashboard', path: '/dashboard', iconName: 'Dashboard', roles: ['superuser'], permission: 'VIEW_DASHBOARD', hideFromOwner: true },
    { label: 'My Portal', path: '/teacher-portal', iconName: 'PortalTeacher', roles: ['teacher'] },
    { label: 'My Portal', path: '/student-portal', iconName: 'PortalStudent', roles: ['student'] },
    { label: 'My Tests', path: '/my-tests', iconName: 'MdQuiz', roles: ['student'] },
    { label: 'Students', path: '/students', iconName: 'Students', roles: ['superuser'], permission: 'CRUD_STUDENT' },
    { label: 'Telegram Leads', path: '/telegram-registrations', iconName: 'Telegram', roles: ['superuser'], permission: 'VIEW_TELEGRAM_LEADS' },
    { label: 'Archive', path: '/archive', iconName: 'Archive', roles: ['superuser'], permission: 'VIEW_ARCHIVE' },
    {
      label: 'Retention', path: '/retention', iconName: 'Retention', roles: ['superuser'], permission: 'VIEW_RETENTION',
      children: [
        { label: 'Retention', path: '/retention?view=retention', iconName: 'Retention' },
        { label: 'Intake', path: '/retention?view=intake', iconName: 'Students' },
      ],
    },
    { label: 'Teachers', path: '/teachers', iconName: 'Teachers', roles: ['superuser'], permission: 'CRUD_TEACHER' },
    { label: 'Classes', path: '/classes', iconName: 'Classes', roles: ['superuser'], permission: 'CRUD_CLASS' },
    { label: 'Rooms', path: '/rooms', iconName: 'Rooms', roles: ['superuser'], permission: 'CRUD_ROOM' },
    { label: 'Calendar', path: '/calendar', iconName: 'Calendar', roles: ['superuser', 'student'], permission: 'VIEW_CALENDAR' },


    // Settings removed from sidebar — accessible via gear icon in header
    { label: 'Tests', path: '/tests', iconName: 'MdQuiz', roles: ['superuser'], permission: 'MANAGE_TESTS' },
    { label: 'Payments', path: '/payments', iconName: 'MdPayment', roles: ['superuser', 'teacher'], permission: 'CRUD_PAYMENT' },
    { label: 'Salary', path: '/salary', iconName: 'Salary', roles: ['superuser'], permission: 'MANAGE_SALARY' },
    { label: 'Assignments', path: '/assignments', iconName: 'Assignments', roles: ['superuser'], permission: 'CRUD_ASSIGNMENT' },
    { label: 'Teacher Tasks', path: '/teacher-tasks', iconName: 'TeacherTasks', roles: ['superuser'], permission: 'CRUD_TEACHER_TASK' },
    { label: 'Subjects', path: '/subjects', iconName: 'Subjects', roles: ['superuser'], permission: 'CRUD_SUBJECT' },
    { label: 'Debts', path: '/debts', iconName: 'Debts', roles: ['superuser'], permission: 'CRUD_DEBT' },
    {
      label: 'Reports',
      path: '/owner/reports',
      iconName: 'Reports',
      roles: ['superuser'],
      ownerOnly: true,
      children: [
        { label: 'Moliya', path: '/owner/reports?section=finance', iconName: 'Finance' },
        { label: "O'quvchilar", path: '/owner/reports?section=students', iconName: 'Students' },
        { label: "O'qituvchilar", path: '/owner/reports?section=teachers', iconName: 'Teachers' },
        { label: 'Chegirmalar', path: '/owner/reports?section=discounts', iconName: 'Discounts' },
        { label: 'Retention', path: '/owner/reports?section=retention', iconName: 'Retention' },
        { label: 'Davomat', path: '/owner/reports?section=attendance', iconName: 'Attendance' },
      ],
    },
    { label: 'Owner Panel', path: '/owner/manage', iconName: 'Owner', roles: ['superuser'], ownerOnly: true },
    { label: 'Centers', path: '/centers', iconName: 'Centers', roles: ['superuser'], ownerOnly: true },
  ];


  const filteredMenuItems = menuItems.filter((item) => {
    if (!user?.userType) return false;
    if (!item.roles?.includes(user.userType)) return false;
    if (item.ownerOnly && (user.role || '').toLowerCase() !== 'owner') return false;
    if (item.hideFromOwner && (user.role || '').toLowerCase() === 'owner') return false;
    if (item.permission && !canAccess(item.permission)) return false;
    return true;
  });
  const orderIndex = new Map(sidebarOrder.map((path, index) => [path, index]));
  const orderedMenuItems = filteredMenuItems.slice().sort((a, b) => {
    const aIndex = orderIndex.get(a.path) ?? menuItems.findIndex((item) => item.path === a.path) + sidebarOrder.length;
    const bIndex = orderIndex.get(b.path) ?? menuItems.findIndex((item) => item.path === b.path) + sidebarOrder.length;
    return aIndex - bIndex;
  });

  const reorderSidebar = (targetPath: string) => {
    if (!draggedPath || draggedPath === targetPath) return;
    const completeOrder = [
      ...sidebarOrder.filter((path) => menuItems.some((item) => item.path === path)),
      ...menuItems.map((item) => item.path).filter((path) => !sidebarOrder.includes(path)),
    ];
    const fromIndex = completeOrder.indexOf(draggedPath);
    const targetIndex = completeOrder.indexOf(targetPath);
    if (fromIndex < 0 || targetIndex < 0) return;
    completeOrder.splice(fromIndex, 1);
    completeOrder.splice(targetIndex, 0, draggedPath);
    setSidebarOrder(completeOrder);
    void settingsAPI.saveSidebarOrder(completeOrder).catch(() => null);
    setDraggedPath(null);
  };

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
          <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-2">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Select value={activeCenterId ? String(activeCenterId) : undefined} onValueChange={handleCenterChange} disabled={centerOptions.length === 0}>
              <SelectTrigger id="active_center_sidebar" className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus:ring-0">
                <SelectValue placeholder={centerOptions.length ? t('Select a center') : t('No centers available')} />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={6} style={{ zIndex: 1400 }} className="min-w-[240px]">
                {centerOptions.map((center) => (
                  <SelectItem key={center.id} value={String(center.id)}>{center.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 pt-2 px-2">
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-0.5">
            {orderedMenuItems.map((item, itemIndex) => {
              const Icon = iconMap[item.iconName] || Users;
              const isActive = location.pathname === item.path;
              const isReportsItem = item.path === '/owner/reports';
              const isRetentionItem = item.path === '/retention';
              const iconTone = iconToneMap[item.iconName] || 'from-slate-500 to-slate-700 shadow-slate-500/20';
              return (
                <div
                  key={item.path}
                  draggable={isExpanded}
                  onDragStart={() => setDraggedPath(item.path)}
                  onDragEnd={() => setDraggedPath(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => reorderSidebar(item.path)}
                  className={cn(draggedPath === item.path && 'opacity-50')}
                >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (item.children?.length && isExpanded) {
                          if (isReportsItem) setReportsExpanded((current) => !current);
                          if (isRetentionItem) setRetentionExpanded((current) => !current);
                        } else {
                          handleNavigation(item.children?.[0]?.path || item.path);
                        }
                      }}
                      className={cn(
                        'flex w-full items-center rounded-lg border-l-[3px] text-sm transition-all duration-200',
                        isExpanded ? 'gap-3 px-3 py-2' : 'justify-center gap-0 px-0 py-2.5',
                        isActive
                          ? 'border-indigo-400 bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-sidebar-accent-foreground font-semibold'
                          : 'border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br text-white shadow-md ring-1 ring-white/20 transition-transform duration-200',
                          iconTone,
                          isActive && 'scale-105 ring-2 ring-white/70'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 stroke-[2.4]',
                            filledIconNames.has(item.iconName) && 'fill-white/25'
                          )}
                        />
                      </span>
                      {isExpanded && <span className="flex-1 text-left">{t(item.label)}</span>}
                      {isExpanded && <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{itemIndex + 1}</span>}
                      {isExpanded && <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground active:cursor-grabbing" />}
                      {isExpanded && item.children?.length ? (
                        <ChevronDown className={cn('h-4 w-4 transition-transform', reportsExpanded && 'rotate-180')} />
                      ) : null}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={cn(isExpanded && 'hidden')}>
                    {t(item.label)}
                  </TooltipContent>
                </Tooltip>
                {isExpanded && item.children?.length && ((isReportsItem && reportsExpanded) || (isRetentionItem && retentionExpanded)) ? (
                  <div className="ml-5 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                    {item.children?.map((child) => {
                      const ChildIcon = iconMap[child.iconName] || BarChart3;
                      const childActive = `${location.pathname}${location.search}` === child.path;
                      return (
                        <button
                          key={child.path}
                          type="button"
                          onClick={() => handleNavigation(child.path)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors',
                            childActive
                              ? 'bg-indigo-500/15 text-sidebar-accent-foreground'
                              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <ChildIcon className="h-3.5 w-3.5" />
                          <span>{t(child.label)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                </div>
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
