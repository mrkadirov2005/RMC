// Portal component for the teacher feature.

import { useEffect, useCallback, useMemo, useState } from 'react';
import {
  Users,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  CalendarDays,
  Star,
  Plus,
  Bell,
  Clock,
  Loader2,
  ClipboardCopy,
  ClipboardCheck,
  UserRound,
  RotateCcw,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionPanel } from '@/components/common/SectionPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppSelector } from '../crm/hooks';
import { useNavigate } from 'react-router-dom';
import TeacherClassesTab from './components/TeacherClassesTab';
import TeacherAttendanceTab from './components/TeacherAttendanceTab';
import TeacherAssignmentsTab from './components/TeacherAssignmentsTab';
import TeacherTasksTab from './components/TeacherTasksTab';
import { useAppDispatch } from '../crm/hooks';
import type { RootState } from '../../store';
import { setTeacherPortalTabValue } from '../../slices/pagesUiSlice';
import { fetchTests } from '../../slices/testsSlice';
import { fetchStudents } from '../../slices/studentsSlice';
import { fetchClasses } from '../../slices/classesSlice';
import { fetchAttendance } from '../../slices/attendanceSlice';
import { fetchAssignments } from '../../slices/assignmentsSlice';
import { fetchGrades } from '../../slices/gradesSlice';
import { fetchPayments } from '../../slices/paymentsSlice';
import { selectTeacherPortalUi } from '../../store/selectors';
import { useLanguage } from '../../i18n/LanguageContext';
import TestsPage from '../crm/tests/TestsPage';
import CalendarPage from '../crm/calendar/CalendarPage';
import OverallStatisticsTab from './components/OverallStatisticsTab';
import TeacherProfileTab from './components/TeacherProfileTab';
import TeacherStatisticsTab from './statistics/TeacherStatisticsTab';

// Tab order is a per-browser preference only - it's never sent to the server, just like the
// sidebar's drag-to-reorder, except this one stays local instead of syncing through settingsAPI.
const TAB_ORDER_STORAGE_KEY = 'teacher_portal_tab_order';

const getStoredTabOrder = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TAB_ORDER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const storeTabOrder = (order: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TAB_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // ignore storage failures (e.g. private browsing quota)
  }
};

interface TeacherStats {
  totalStudents: number;
  totalClasses: number;
  pendingTests: number;
  completedTests: number;
  pendingGrading: number;
  todayAttendance: number;
  pendingAssignments: number;
  upcomingClasses: number;
}

// Renders the teacher portal portal.
const TeacherPortal = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const teacherPortalUi = useAppSelector(selectTeacherPortalUi);
  const { tabValue } = teacherPortalUi;
  const [tabOrder, setTabOrder] = useState<string[]>(getStoredTabOrder);
  const [draggedTabValue, setDraggedTabValue] = useState<string | null>(null);

  const testsData = useAppSelector(state => state.tests.items);
  const studentsData = useAppSelector(state => state.students.items);
  const classesData = useAppSelector(state => state.classes.items);
  const attendanceData = useAppSelector(state => state.attendance.items);
  const assignmentsData = useAppSelector(state => state.assignments.items);
  const gradesData = useAppSelector(state => state.grades.items);
  const paymentsData = useAppSelector(state => state.payments.items);
  
  const loading = useAppSelector(state => 
    state.tests.loading || 
    state.students.loading || 
    state.classes.loading || 
    state.attendance.loading || 
    state.assignments.loading ||
    state.grades.loading ||
    state.payments.loading
  );
// Memoizes the load stats callback.
  const loadStats = useCallback(() => {
    const scopedParams = user?.id ? { teacher_id: Number(user.id), page: 1, limit: 100 } : undefined;
    dispatch(fetchTests());
    dispatch(fetchStudents(scopedParams));
    dispatch(fetchClasses(scopedParams));
    dispatch(fetchAttendance());
    dispatch(fetchAssignments());
    dispatch(fetchGrades());
    dispatch(fetchPayments());
  }, [dispatch, user?.id]);

// Runs side effects for this component.
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tabValue === 'students') {
      dispatch(setTeacherPortalTabValue('classes'));
    }
  }, [dispatch, tabValue]);

  const stats = useMemo<TeacherStats>(() => {
    const tests = testsData || [];
    const students = studentsData || [];
    const classes = classesData || [];
    const attendance = attendanceData || [];
    const assignments = assignmentsData || [];

    const teacherId = user?.id;
    const scopedClasses = teacherId
      ? classes.filter((c: any) => Number(c.teacher_id) === Number(teacherId))
      : classes;
    const scopedStudents = teacherId
      ? students.filter((s: any) => Number(s.teacher_id) === Number(teacherId))
      : students;
    const scopedAttendance = teacherId
      ? attendance.filter((a: any) => Number(a.teacher_id) === Number(teacherId))
      : attendance;
    const teacherClassIds = new Set(scopedClasses.map((c: any) => Number(c.class_id || c.id)));
    const scopedAssignments = teacherClassIds.size > 0
      ? assignments.filter((a: any) => teacherClassIds.has(Number(a.class_id)))
      : assignments;

    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = scopedAttendance.filter(
      (a: any) => a.attendance_date?.split('T')[0] === today
    ).length;

    const pendingTests = tests.filter((t: any) => t.is_active).length;
    const completedTests = tests.length - pendingTests;
    const pendingGrading = tests.filter((t: any) => (t.submission_count || 0) > 0).length;
    const pendingAssignments = scopedAssignments.filter((a: any) => a.status === 'Pending').length;

    return {
      totalStudents: scopedStudents.length,
      totalClasses: scopedClasses.length,
      pendingTests,
      completedTests,
      pendingGrading,
      todayAttendance,
      pendingAssignments,
      upcomingClasses: scopedClasses.filter((c: any) => c.status === 'Active').length,
    };
  }, [testsData, studentsData, classesData, attendanceData, assignmentsData, user?.id]);

// Handles quick action.
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'test':
        navigate('/tests/create');
        break;
      case 'attendance':
        dispatch(setTeacherPortalTabValue('attendance'));
        break;
      case 'assignment':
        navigate('/assignments');
        break;
      default:
        break;
    }
  };

  const statsCards = [
    { title: t('My Students'), value: stats.totalStudents, icon: Users, tone: 'blue' as const, detail: t('Assigned to you'), tab: 'classes' },
    { title: t('My Classes'), value: stats.totalClasses, icon: GraduationCap, tone: 'green' as const, detail: `${stats.upcomingClasses} ${t('active')}`, tab: 'classes' },
    { title: t('Active Tests'), value: stats.pendingTests, icon: FileQuestion, tone: 'amber' as const, detail: t('Open test work'), tab: 'tests' },
    { title: t('Pending Grading'), value: stats.pendingGrading, icon: Star, tone: 'red' as const, detail: stats.pendingGrading > 0 ? t('Needs attention') : t('Nothing pending'), tab: 'tests' },
    { title: t("Today's Attendance"), value: stats.todayAttendance, icon: CalendarDays, tone: 'neutral' as const, detail: t('Records today'), tab: 'attendance' },
    { title: t('Assignments'), value: stats.pendingAssignments, icon: ClipboardList, tone: 'amber' as const, detail: stats.pendingAssignments > 0 ? t('To review') : t('Clear'), tab: 'assignments' },
  ];

  const tabs = [
     // here I am adding a tab called Overall, which should have overal statistics like 
    // 1. student count,
    //  2.attendance rate 
    // 3.how much did this teacher students get points
    // 4. in a locked modal, (password which is updated by teacher itself) to show how much of teacher students did pay like with pie chart

    { value: 'overall', label: t('Overall'), icon: <ClipboardCopy className = " h-4 w-4" /> },
    { value: 'statistics', label: t('Statistics'), icon: <Star className="h-4 w-4" /> },
    { value: 'classes', label: t('My Classes'), icon: <GraduationCap className="h-4 w-4" /> },
    { value: 'tests', label: t('My Tests'), icon: <FileQuestion className="h-4 w-4" /> },
    { value: 'calendar', label: t('Calendar'), icon: <CalendarDays className="h-4 w-4" /> },
    { value: 'attendance', label: t('Attendance'), icon: <CalendarDays className="h-4 w-4" /> },
    { value: 'assignments', label: t('Assignments'), icon: <ClipboardList className="h-4 w-4" /> },
    { value: 'tasks', label: t('Tasks'), icon: <ClipboardCheck className="h-4 w-4" /> },
    { value: 'profile', label: t('Profile'), icon: <UserRound className="h-4 w-4" /> },
     ];

  const orderIndex = new Map(tabOrder.map((value, index) => [value, index]));
  const orderedTabs = tabs.slice().sort((a, b) => {
    const aIndex = orderIndex.get(a.value) ?? tabs.findIndex((tab) => tab.value === a.value) + tabOrder.length;
    const bIndex = orderIndex.get(b.value) ?? tabs.findIndex((tab) => tab.value === b.value) + tabOrder.length;
    return aIndex - bIndex;
  });
  const hasCustomTabOrder = tabOrder.length > 0;

  const reorderTabs = (targetValue: string) => {
    if (!draggedTabValue || draggedTabValue === targetValue) return;
    const completeOrder = [
      ...tabOrder.filter((value) => tabs.some((tab) => tab.value === value)),
      ...tabs.map((tab) => tab.value).filter((value) => !tabOrder.includes(value)),
    ];
    const fromIndex = completeOrder.indexOf(draggedTabValue);
    const targetIndex = completeOrder.indexOf(targetValue);
    if (fromIndex < 0 || targetIndex < 0) return;
    completeOrder.splice(fromIndex, 1);
    completeOrder.splice(targetIndex, 0, draggedTabValue);
    setTabOrder(completeOrder);
    storeTabOrder(completeOrder);
    setDraggedTabValue(null);
  };

  const resetTabOrder = () => {
    setTabOrder([]);
    storeTabOrder([]);
  };

  return (
    <div className="relative space-y-6">
      <PageHeader
        user = {user}
        className="animate-slide-up"
        variant="hero"
        heroGradient="from-indigo-800 via-blue-700 to-sky-600"
        title={`${t('Welcome back')}, ${user?.first_name || t('Teacher')}!`}
        description={t('Teacher Portal - Manage your classes, students, and tests')}
        icon={GraduationCap}
        meta={
          <>
            <Badge className="bg-white/20 text-white border-none hover:bg-white/30">{t('Teacher')}</Badge>
            {user?.roles && user.roles.length > 0 && user.roles.map((role: string) => (
              <Badge key={role} className="bg-white/10 text-white border-none hover:bg-white/20">{role}</Badge>
            ))}
          </>
        }
        actions={
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" size="icon" aria-label={t('Notifications')} className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                    <Bell className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('Notifications')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" size="icon" aria-label={t('Schedule')} className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                    <Clock className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('Schedule')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statsCards.map((stat, index) => (
          <div key={stat.title} className="relative">
            
            {loading && index === 0 && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <SectionPanel
        className="animate-slide-up animation-delay-500"
        contentClassName="p-0"
      >
        <Tabs value={tabValue} onValueChange={(value) => dispatch(setTeacherPortalTabValue(value))}>
          <div className="flex items-center justify-between gap-2 border-b px-4">
            <div className="overflow-x-auto">
              <TabsList className="h-auto gap-0 bg-transparent p-0">
                {orderedTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    draggable
                    onDragStart={() => setDraggedTabValue(tab.value)}
                    onDragEnd={() => setDraggedTabValue(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => reorderTabs(tab.value)}
                    title={t('Drag to reorder tabs (saved on this device only)')}
                    className={`cursor-grab gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold active:cursor-grabbing data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none ${draggedTabValue === tab.value ? 'opacity-50' : ''}`}
                  >
                    {tab.icon}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {hasCustomTabOrder && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
                onClick={resetTabOrder}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('Reset order')}
              </Button>
            )}
          </div>

          <div className="p-4">
            <TabsContent value="classes">
              <TeacherClassesTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="overall">
              <OverallStatisticsTab
                teacherId={user?.id}
                classes={classesData}
                students={studentsData}
                attendance={attendanceData}
                grades={gradesData}
                payments={paymentsData}
              />
            </TabsContent>
            <TabsContent value="statistics">
              <TeacherStatisticsTab
                teacherId={user?.id ? Number(user.id) : undefined}
                classes={classesData}
                students={studentsData}
              />
            </TabsContent>
            <TabsContent value="tests">
              <div className="-m-4">
                <TestsPage />
              </div>
            </TabsContent>
            <TabsContent value="calendar">
              <div className="-m-4">
                <CalendarPage />
              </div>
            </TabsContent>
            <TabsContent value="attendance">
              <TeacherAttendanceTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="assignments">
              <TeacherAssignmentsTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="tasks">
              <TeacherTasksTab teacherId={user?.id} />
            </TabsContent>
            <TabsContent value="profile">
              <TeacherProfileTab teacherId={user?.id} />
            </TabsContent>
          </div>
        </Tabs>
      </SectionPanel>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
            aria-label={t('Quick add')}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleQuickAction('test')}>
            <FileQuestion className="h-4 w-4 mr-2" />
            {t('Create Test')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickAction('attendance')}>
            <CalendarDays className="h-4 w-4 mr-2" />
            {t('Take Attendance')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickAction('assignment')}>
            <ClipboardList className="h-4 w-4 mr-2" />
            {t('Create Assignment')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TeacherPortal;
