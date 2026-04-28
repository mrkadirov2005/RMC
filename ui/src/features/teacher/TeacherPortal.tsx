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
  TrendingUp,
  Loader2,
  Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    {
      title: 'My Students',
      value: stats.totalStudents,
      icon: <Users className="h-10 w-10" />,
      color: '#6366f1',
      trend: '+5%',
      tab: 'students',
    },
    {
      title: 'My Classes',
      value: stats.totalClasses,
      icon: <GraduationCap className="h-10 w-10" />,
      color: '#8b5cf6',
      trend: null,
      tab: 'classes',
    },
    {
      title: 'Active Tests',
      value: stats.pendingTests,
      icon: <FileQuestion className="h-10 w-10" />,
      color: '#f5576c',
      trend: null,
      tab: 'tests',
    },
    {
      title: 'Pending Grading',
      value: stats.pendingGrading,
      icon: <Star className="h-10 w-10" />,
      color: '#4facfe',
      trend: stats.pendingGrading > 0 ? 'Needs attention' : null,
      tab: 'grades',
    },
    {
      title: "Today's Attendance",
      value: stats.todayAttendance,
      icon: <CalendarDays className="h-10 w-10" />,
      color: '#43e97b',
      trend: null,
      tab: 'attendance',
    },
    {
      title: 'Pending Assignments',
      value: stats.pendingAssignments,
      icon: <ClipboardList className="h-10 w-10" />,
      color: '#fa709a',
      trend: stats.pendingAssignments > 0 ? `${stats.pendingAssignments} to review` : null,
      tab: 'assignments',
    },
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
    <div className="p-6 relative">
      {/* Header with teacher info */}
      <div className="mb-6 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-[200px] h-[200px] rounded-full bg-white/10" />
        <div className="absolute right-24 -bottom-20 w-[150px] h-[150px] rounded-full bg-white/5" />
        <div className="py-6 px-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold bg-white/20 border-[3px] border-white/30">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div>
                <h2 className="text-3xl font-bold">
                  Welcome back, {user?.first_name}!
                </h2>
                <p className="text-white/90 mt-1">
                  Teacher Portal - Manage your classes, students, and tests
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-white/20 text-white border-none hover:bg-white/30">
                    Teacher
                  </Badge>
                  {user?.roles && user.roles.length > 0 && user.roles.map((role: string) => (
                    <Badge key={role} className="bg-white/15 text-white border-none hover:bg-white/25">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors">
                      <Bell className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors">
                      <Clock className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Schedule</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statsCards.map((stat, index) => (
          <Card
            key={index}
            className="h-full transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-lg"
            onClick={() => dispatch(setTeacherPortalTabValue(stat.tab))}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  {stat.trend && (
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500 mr-1" />
                      <span className="text-xs text-emerald-500">{stat.trend}</span>
                    </div>
                  )}
                </div>
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
                >
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Section */}
      <Card>
        <Tabs value={tabValue} onValueChange={(value) => dispatch(setTeacherPortalTabValue(value))}>
          <div className="border-b px-4">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 gap-2 text-sm font-semibold"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <CardContent className="pt-4">
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
          </CardContent>
        </Tabs>
      </Card>

      {/* Quick Add FAB */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
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
