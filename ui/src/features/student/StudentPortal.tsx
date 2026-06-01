// Portal component for the student feature.

import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

import {
  Bell,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Loader2,
  MapPin,
  Phone,
  UserRound,
  Users,
  AlertTriangle,
  Coins,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/PageHeader';
import { MetricCard } from '@/components/common/MetricCard';
import { SectionPanel } from '@/components/common/SectionPanel';
import { useAppSelector } from '../crm/hooks';
import type { RootState } from '../../store';
import { useAppDispatch } from '../crm/hooks';
import { fetchStudentDashboard } from '../../slices/studentDashboardSlice';
import { getErrorMessage } from '@/utils/errorMessage';


interface StudentProfile {
  id?: number;
  student_id?: number;
  enrollment_number?: string;
  phone?: string;
  email?: string;
  parent_name?: string;
  parent_phone?: string;
  class_id?: number;
  teacher_id?: number;
  status?: string;
  coins?: number;
}

interface Teacher {
  teacher_id?: number;
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

interface ClassInfo {
  class_id?: number;
  id?: number;
  class_name?: string;
  class_code?: string;
  level?: number;
  section?: string;
  room_number?: string;
}

interface Subject {
  subject_id?: number;
  id?: number;
  subject_name?: string;
  teacher_name?: string;
}

interface Test {
  test_id: number;
  test_name: string;
  test_type: string;
  duration_minutes?: number;
  due_date?: string;
  submission_status?: string;
  total_marks?: number;
}

interface Attendance {
  attendance_date?: string;
  status?: string;
}

interface Assignment {
  assignment_id?: number;
  id?: number;
  assignment_title?: string;
  title?: string;
  due_date?: string;
  status?: string;
}

interface Grade {
  grade_id?: number;
  id?: number;
  subject?: string;
  marks_obtained?: number;
  total_marks?: number;
  percentage?: number;
  grade_letter?: string;
}

interface Payment {
  payment_id?: number;
  id?: number;
  amount?: number;
  payment_date?: string;
  status?: string;
  payment_status?: string;
  receipt_number?: string;
}

interface Debt {
  debt_id?: number;
  id?: number;
  debt_amount?: number;
  amount_paid?: number;
  due_date?: string;
}

interface ScheduleItem {
  room_id: number;
  room_number: string;
  day: string;
  time: string;
}


// Renders the student portal portal.
const StudentPortal = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { data: dashboardData, loading, error } = useAppSelector((state) => state.studentDashboard);
  
  const student = dashboardData?.student as StudentProfile | null;
  const teacher = dashboardData?.teacher as Teacher | null;
  const classInfo = dashboardData?.classInfo as ClassInfo | null;
// Handles subjects.
  const subjects = (dashboardData?.subjects || []) as Subject[];
// Handles tests.
  const tests = (dashboardData?.tests || []) as Test[];
// Handles attendance.
  const attendance = (dashboardData?.attendance || []) as Attendance[];
// Handles assignments.
  const assignments = (dashboardData?.assignments || []) as Assignment[];
// Handles grades.
  const grades = (dashboardData?.grades || []) as Grade[];
// Handles payments.
  const payments = (dashboardData?.payments || []) as Payment[];
// Handles debts.
  const debts = (dashboardData?.debts || []) as Debt[];
// Handles schedule.
  const schedule = (dashboardData?.schedule || []) as ScheduleItem[];


// Memoizes the initials derived value.
  const initials = useMemo(() => {
    const first = user?.first_name?.[0] ?? '';
    const last = user?.last_name?.[0] ?? '';
    return `${first}${last}` || 'S';
  }, [user]);



// Formats date.
  const formatDate = (value?: string) => {
    if (!value) return 'Unknown date';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Unknown date';
    return d.toLocaleDateString();
  };

// Runs side effects for this component.
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentDashboard());
    }
  }, [dispatch, user?.id]);


// Memoizes the attendance stats derived value.
  const attendanceStats = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((a) => {
      const status = String(a.status || '').toLowerCase();
      return status === 'present' || status === 'p' || status === 'late';
    }).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, rate };
  }, [attendance]);

// Memoizes the average grade derived value.
  const averageGrade = useMemo(() => {
    if (grades.length === 0) return 0;
    const values = grades.map((g) => {
      if (typeof g.percentage === 'number') return g.percentage;
      if (typeof g.marks_obtained === 'number' && typeof g.total_marks === 'number' && g.total_marks > 0) {
        return (g.marks_obtained / g.total_marks) * 100;
      }
      return 0;
    });
    const total = values.reduce((sum, v) => sum + v, 0);
    return Math.round(total / values.length);
  }, [grades]);

// Memoizes the upcoming tests derived value.
  const upcomingTests = useMemo(() => {
    const now = new Date();
    return tests
      .filter((t) => {
        const due = t.due_date ? new Date(t.due_date) : null;
        if (!due || Number.isNaN(due.getTime())) return false;
        const status = String(t.submission_status || '').toLowerCase();
        return due >= now && status !== 'submitted' && status !== 'graded';
      })
      .slice(0, 4);
  }, [tests]);

// Memoizes the active tests derived value.
  const activeTests = useMemo(() => {
    return tests.filter((t) => {
      const status = String(t.submission_status || '').toLowerCase();
      return status === 'in_progress' || status === 'not_started';
    }).length;
  }, [tests]);

// Memoizes the assignments due derived value.
  const assignmentsDue = useMemo(() => {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    return assignments
      .filter((a) => {
        const due = a.due_date ? new Date(a.due_date) : null;
        if (!due || Number.isNaN(due.getTime())) return false;
        const status = String(a.status || '').toLowerCase();
        return due >= now && due <= soon && status !== 'completed';
      })
      .slice(0, 4);
  }, [assignments]);

// Memoizes the last payment derived value.
  const lastPayment = useMemo(() => {
    const sorted = [...payments].sort((a, b) => {
      const aTime = a.payment_date ? new Date(a.payment_date).getTime() : 0;
      const bTime = b.payment_date ? new Date(b.payment_date).getTime() : 0;
      return bTime - aTime;
    });
    return sorted[0];
  }, [payments]);

// Memoizes the outstanding debt derived value.
  const outstandingDebt = useMemo(() => {
    return debts.reduce((sum, d) => {
      const debtAmount = Number(d.debt_amount) || 0;
      const amountPaid = Number(d.amount_paid) || 0;
      const remaining = debtAmount - amountPaid;
      return remaining > 0 ? sum + remaining : sum;
    }, 0);
  }, [debts]);

// Memoizes the recent grades derived value.
  const recentGrades = useMemo(() => grades.slice(0, 4), [grades]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Memoizes the schedule by day derived value.
  const scheduleByDay = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    daysOfWeek.forEach(d => { map[d] = []; });
    schedule.forEach(item => {
      if (map[item.day]) map[item.day].push(item);
    });
    return map;
  }, [schedule]);

// Memoizes the last12 months derived value.
  const last12Months = useMemo(() => {
    const months = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      months.push(new Date(d.getFullYear(), d.getMonth() - i, 1));
    }
    return months;
  }, []);

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaySchedule = scheduleByDay[todayName] || [];
  const nextTest = upcomingTests[0];
  const nextAssignment = assignmentsDue[0];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="animate-slide-up"
        variant="hero"
        heroGradient="from-sky-500 via-cyan-500 to-teal-400"
        title={`Welcome back, ${user?.first_name || 'Student'}!`}
        description="Student Portal - Your schedule, tests, assignments, grades, and payments"
        icon={GraduationCap}
        meta={
          <>
            <Badge className="bg-white/20 text-white border-none hover:bg-white/30">Student</Badge>
            {classInfo?.class_name && <Badge className="bg-white/10 text-white border-none hover:bg-white/20">{classInfo.class_name}</Badge>}
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/my-tests')} className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <FileQuestion className="mr-2 h-4 w-4" />
              My Tests
            </Button>
            <Button variant="outline" size="icon" aria-label="Notifications" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Bell className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <SectionPanel
        className="animate-slide-up animation-delay-100"
        title="Today"
        description="The most important student work for the next school day."
        contentClassName="grid gap-3 md:grid-cols-3"
      >
        <div className="rounded-lg border bg-background p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <CalendarDays className="h-5 w-5" />
            </div>
            <Badge variant="outline">{todaySchedule.length} classes</Badge>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-foreground">Today’s schedule</h3>
          {todaySchedule.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No classes scheduled today.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {todaySchedule.slice(0, 2).map((item, index) => (
                <div key={`${item.room_id}-${index}`} className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                  <span className="font-medium">{item.time}</span>
                  <span className="text-muted-foreground">Room {item.room_number}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-background p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <FileQuestion className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-foreground">Next test</h3>
          {nextTest ? (
            <>
              <p className="mt-1 truncate text-sm text-muted-foreground">{nextTest.test_name}</p>
              <p className="mt-2 text-xs font-medium text-foreground">{formatDate(nextTest.due_date)}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No upcoming tests.</p>
          )}
        </div>

        <div className="rounded-lg border bg-background p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ClipboardList className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-foreground">Next assignment</h3>
          {nextAssignment ? (
            <>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {nextAssignment.assignment_title || nextAssignment.title || 'Assignment'}
              </p>
              <p className="mt-2 text-xs font-medium text-foreground">{formatDate(nextAssignment.due_date)}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No assignments due this week.</p>
          )}
        </div>
      </SectionPanel>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">
            {getErrorMessage(error)}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="animate-slide-up animation-delay-200"><MetricCard label="Active Tests" value={activeTests} detail="Ready to take" icon={FileQuestion} tone="blue" onClick={() => navigate('/my-tests')} /></div>
        <div className="animate-slide-up animation-delay-300"><MetricCard label="Attendance Rate" value={`${attendanceStats.rate}%`} detail={`${attendanceStats.present}/${attendanceStats.total} present`} icon={CalendarDays} tone="green" /></div>
        <div className="animate-slide-up animation-delay-400"><MetricCard label="Average Grade" value={`${averageGrade}%`} detail="Across posted grades" icon={CheckCircle} tone="neutral" /></div>
        <div className="animate-slide-up animation-delay-500"><MetricCard label="Outstanding Debt" value={`$${outstandingDebt.toLocaleString()}`} detail="Remaining balance" icon={AlertTriangle} tone={outstandingDebt > 0 ? 'red' : 'green'} /></div>
        <div className="animate-slide-up animation-delay-600"><MetricCard label="Coins" value={Number(student?.coins || 0).toLocaleString()} detail="Current balance" icon={Coins} tone="amber" /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in animation-delay-400">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Upcoming Tests</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/my-tests')}>
                View all
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingTests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tests scheduled soon.</p>
              ) : (
                upcomingTests.map((test) => (
                  <div key={test.test_id} className="flex items-center justify-between border-b last:border-b-0 pb-3 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{test.test_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {test.test_type?.replace(/_/g, ' ')} - {test.total_marks || 0} marks
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(test.due_date)}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Assignments Due Soon</CardTitle>
              <Badge variant="outline">{assignmentsDue.length} due</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignmentsDue.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments due this week.</p>
              ) : (
                assignmentsDue.map((assignment) => (
                  <div key={assignment.assignment_id || assignment.id} className="flex items-center justify-between border-b last:border-b-0 pb-3 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{assignment.assignment_title || assignment.title || 'Assignment'}</p>
                      <p className="text-xs text-muted-foreground">Status: {assignment.status || 'Pending'}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(assignment.due_date)}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Grades</CardTitle>
              <Badge variant="outline">{grades.length} total</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentGrades.length === 0 ? (
                <p className="text-sm text-muted-foreground">No grades posted yet.</p>
              ) : (
                recentGrades.map((grade) => (
                  <div key={grade.grade_id || grade.id} className="flex items-center justify-between border-b last:border-b-0 pb-3 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{grade.subject || 'Subject'}</p>
                      <p className="text-xs text-muted-foreground">
                        {grade.marks_obtained ?? 0}/{grade.total_marks ?? 0} - {grade.grade_letter || 'N/A'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">{grade.percentage ? `${Math.round(grade.percentage)}%` : 'N/A'}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Weekly Class Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {daysOfWeek.map((day) => {
                  const daySchedule = scheduleByDay[day] || [];
                  const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;

                  return (
                    <div
                      key={day}
                      className={cn(
                        "rounded-xl border p-3 flex flex-col gap-2 transition-all",
                        isToday ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : "bg-muted/30 border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          isToday ? "text-primary" : "text-muted-foreground"
                        )}>
                          {day.substring(0, 3)}
                        </span>
                        {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                      </div>

                      <div className="space-y-1.5 min-h-[40px]">
                        {daySchedule.length === 0 ? (
                          <div className="text-[10px] text-muted-foreground/50 italic py-2">No class</div>
                        ) : (
                          daySchedule.map((item, idx) => (
                            <div
                              key={idx}
                              className="bg-background border rounded-lg p-2 shadow-sm"
                            >
                              <div className="text-[11px] font-bold text-primary leading-tight">
                                {item.time}
                              </div>
                              <div className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <MapPin className="h-2 w-2" />
                                Room {item.room_number}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="overflow-hidden">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-md bg-muted p-2 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
              {last12Months.map((monthDate) => {
                const year = monthDate.getFullYear();
                const month = monthDate.getMonth() + 1;
                const hasPaid = payments.some((p) => {
                  if (p.payment_status?.toLowerCase() !== 'completed' && p.status?.toLowerCase() !== 'completed') return false;
                  const pDate = new Date(p.payment_date || '');
                  return pDate.getFullYear() === year && (pDate.getMonth() + 1) === month;
                });

                const monthName = monthDate.toLocaleString('default', { month: 'short' });
                const yearName = monthDate.toLocaleString('default', { year: '2-digit' });

                return (
                  <div key={`${monthName}-${yearName}`} className={cn(
                    "flex flex-col items-center justify-center rounded-lg border p-4 transition-colors",
                    hasPaid
                      ? "border-emerald-200 bg-emerald-500/5"
                      : "border-rose-200 bg-rose-500/5"
                  )}>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{monthName} '{yearName}</span>
                    <div className="mt-3 mb-2">
                      {hasPaid ? (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    {hasPaid ? (
                      <span className="text-xs font-bold text-emerald-600">Settled</span>
                    ) : (
                      <span className="text-xs font-bold text-rose-600">Unpaid</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>


        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <span>{user?.first_name} {user?.last_name}</span>
              </div>
              {student?.enrollment_number && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Enrollment: {student.enrollment_number}</span>
                </div>
              )}
              {student?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>Phone: {student.phone}</span>
                </div>
              )}
              {student?.parent_name && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Guardian: {student.parent_name}</span>
                </div>
              )}
              {student?.parent_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>Guardian Phone: {student.parent_phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Class Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span>{classInfo?.class_name || 'Class not assigned'}</span>
              </div>
              {classInfo?.class_code && (
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <span>Code: {classInfo.class_code}</span>
                </div>
              )}
              {classInfo?.room_number && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Room: {classInfo.room_number}</span>
                </div>
              )}
              {teacher?.first_name && (
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <span>Teacher: {teacher.first_name} {teacher.last_name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subjects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>
              ) : (
                subjects.slice(0, 6).map((subject) => (
                  <div key={subject.subject_id || subject.id} className="flex items-center justify-between">
                    <span>{subject.subject_name}</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payments and Debts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last payment</span>
                <span>{lastPayment ? formatDate(lastPayment.payment_date) : 'No payments yet'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last receipt</span>
                <span>{lastPayment?.receipt_number || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-semibold">${outstandingDebt.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total sessions</span>
                <span>{attendanceStats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Present</span>
                <span>{attendanceStats.present}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Attendance rate</span>
                <span className="font-semibold">{attendanceStats.rate}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;
