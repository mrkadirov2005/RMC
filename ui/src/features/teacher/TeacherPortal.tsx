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
  Wallet,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { MetricCard } from '@/components/common/MetricCard';
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
import TeacherStudentsTab from './components/TeacherStudentsTab';
import TeacherTestsTab from './components/TeacherTestsTab';
import TeacherClassesTab from './components/TeacherClassesTab';
import TeacherAttendanceTab from './components/TeacherAttendanceTab';
import TeacherGradesTab from './components/TeacherGradesTab';
import TeacherAssignmentsTab from './components/TeacherAssignmentsTab';
import TeacherPaymentsTab from './components/TeacherPaymentsTab';
import { useAppDispatch } from '../crm/hooks';
import type { RootState } from '../../store';
import { setTeacherPortalTabValue } from '../../slices/pagesUiSlice';
import { fetchTests } from '../../slices/testsSlice';
import { fetchStudents } from '../../slices/studentsSlice';
import { fetchClasses } from '../../slices/classesSlice';
import { fetchAttendance } from '../../slices/attendanceSlice';
import { fetchAssignments } from '../../slices/assignmentsSlice';
import { selectTeacherPortalUi } from '../../store/selectors';

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
  const teacherPortalUi = useAppSelector(selectTeacherPortalUi);
  const { tabValue } = teacherPortalUi;

  const testsData = useAppSelector(state => state.tests.items);
  const studentsData = useAppSelector(state => state.students.items);
  const classesData = useAppSelector(state => state.classes.items);
  const attendanceData = useAppSelector(state => state.attendance.items);
  const assignmentsData = useAppSelector(state => state.assignments.items);
  
  const loading = useAppSelector(state => 
    state.tests.loading || 
    state.students.loading || 
    state.classes.loading || 
    state.attendance.loading || 
    state.assignments.loading
  );
// Memoizes the load stats callback.
  const loadStats = useCallback(() => {
    dispatch(fetchTests());
    dispatch(fetchStudents());
    dispatch(fetchClasses());
    dispatch(fetchAttendance());
    dispatch(fetchAssignments());
  }, [dispatch]);

// Runs side effects for this component.
  useEffect(() => {
    loadStats();
  }, [loadStats]);

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
      case 'grade':
        dispatch(setTeacherPortalTabValue('grades'));
        break;
      default:
        break;
    }
  };

  const statsCards = [
    { title: 'My Students', value: stats.totalStudents, icon: Users, tone: 'blue' as const, detail: 'Assigned to you', tab: 'students' },
    { title: 'My Classes', value: stats.totalClasses, icon: GraduationCap, tone: 'green' as const, detail: `${stats.upcomingClasses} active`, tab: 'classes' },
    { title: 'Active Tests', value: stats.pendingTests, icon: FileQuestion, tone: 'amber' as const, detail: 'Open test work', tab: 'tests' },
    { title: 'Pending Grading', value: stats.pendingGrading, icon: Star, tone: 'red' as const, detail: stats.pendingGrading > 0 ? 'Needs attention' : 'Nothing pending', tab: 'grades' },
    { title: "Today's Attendance", value: stats.todayAttendance, icon: CalendarDays, tone: 'neutral' as const, detail: 'Records today', tab: 'attendance' },
    { title: 'Assignments', value: stats.pendingAssignments, icon: ClipboardList, tone: 'amber' as const, detail: stats.pendingAssignments > 0 ? 'To review' : 'Clear', tab: 'assignments' },
  ];

  const tabs = [
    { value: 'students', label: 'My Students', icon: <Users className="h-4 w-4" /> },
    { value: 'tests', label: 'My Tests', icon: <FileQuestion className="h-4 w-4" /> },
    { value: 'classes', label: 'My Classes', icon: <GraduationCap className="h-4 w-4" /> },
    { value: 'attendance', label: 'Attendance', icon: <CalendarDays className="h-4 w-4" /> },
    { value: 'grades', label: 'Grades', icon: <Star className="h-4 w-4" /> },
    { value: 'assignments', label: 'Assignments', icon: <ClipboardList className="h-4 w-4" /> },
    { value: 'payments', label: 'Payments', icon: <Wallet className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <PageHeader
        className="animate-slide-up"
        variant="hero"
        heroGradient="from-indigo-800 via-blue-700 to-sky-600"
        title={`Welcome back, ${user?.first_name || 'Teacher'}!`}
        description="Teacher Portal - Manage your classes, students, and tests"
        icon={GraduationCap}
        meta={
          <>
            <Badge className="bg-white/20 text-white border-none hover:bg-white/30">Teacher</Badge>
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
                  <Button type="button" variant="outline" size="icon" aria-label="Notifications" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                    <Bell className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" size="icon" aria-label="Schedule" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                    <Clock className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Schedule</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statsCards.map((stat, index) => (
          <MetricCard
            key={index}
            className={`animate-slide-up animation-delay-${(index + 1) * 100}`}
            label={stat.title}
            value={stat.value}
            detail={stat.detail}
            icon={stat.icon}
            tone={stat.tone}
            onClick={() => dispatch(setTeacherPortalTabValue(stat.tab))}
          />
        ))}
      </div>

      <SectionPanel
        className="animate-slide-up animation-delay-500"
        title="Teaching Workspace"
        description="Switch between the daily tools you use most."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => handleQuickAction('test')}>
              <FileQuestion className="mr-2 h-4 w-4" />
              Create Test
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => handleQuickAction('attendance')}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Attendance
            </Button>
            <Button type="button" size="sm" onClick={() => handleQuickAction('assignment')}>
              <Plus className="mr-2 h-4 w-4" />
              Assignment
            </Button>
          </div>
        }
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
            <TabsContent value="students">
              <TeacherStudentsTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="tests">
              <TeacherTestsTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="classes">
              <TeacherClassesTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="attendance">
              <TeacherAttendanceTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="grades">
              <TeacherGradesTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="assignments">
              <TeacherAssignmentsTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="payments">
              <TeacherPaymentsTab teacherId={user?.id} />
            </TabsContent>
          </div>
        </Tabs>
      </SectionPanel>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
            aria-label="Quick add"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleQuickAction('test')}>
            <FileQuestion className="h-4 w-4 mr-2" />
            Create Test
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickAction('attendance')}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Take Attendance
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickAction('assignment')}>
            <ClipboardList className="h-4 w-4 mr-2" />
            Create Assignment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickAction('grade')}>
            <Star className="h-4 w-4 mr-2" />
            Enter Grades
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TeacherPortal;
