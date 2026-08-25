// Portal component for the teacher feature.

import { useEffect, useCallback, useMemo } from 'react';
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
    { value: 'classes', label: t('My Classes'), icon: <GraduationCap className="h-4 w-4" /> },
    { value: 'tests', label: t('My Tests'), icon: <FileQuestion className="h-4 w-4" /> },
    { value: 'calendar', label: t('Calendar'), icon: <CalendarDays className="h-4 w-4" /> },
    { value: 'attendance', label: t('Attendance'), icon: <CalendarDays className="h-4 w-4" /> },
    { value: 'assignments', label: t('Assignments'), icon: <ClipboardList className="h-4 w-4" /> },
    { value: 'tasks', label: t('Tasks'), icon: <ClipboardCheck className="h-4 w-4" /> },
    { value: 'profile', label: t('Profile'), icon: <UserRound className="h-4 w-4" /> },
     ];

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
          <div className="overflow-x-auto border-b px-4">
            <TabsList className="h-auto gap-0 bg-transparent p-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
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
