// Portal container for the student feature.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../crm/hooks';
import type { RootState } from '../../store';
import { fetchStudentDashboard } from '../../slices/studentDashboardSlice';
import { logout } from '../../slices/authSlice';
import { getErrorMessage } from '@/utils/errorMessage';
import { useLanguage } from '../../i18n/LanguageContext';
import { StudentTopHeader } from './components/StudentTopHeader';
import { StudentProfileDialog } from './components/StudentProfileDialog';
import { StudentPortalContent } from './components/StudentPortalContent';
import type {
  Assignment,
  Attendance,
  ClassInfo,
  Debt,
  Grade,
  Payment,
  ScheduleItem,
  StudentProfile,
  Subject,
  Teacher,
  Test,
} from './types';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const StudentPortal = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const { data, loading, error } = useAppSelector((state) => state.studentDashboard);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);

  const student = data?.student as StudentProfile | null;
  const teacher = data?.teacher as Teacher | null;
  const classInfo = data?.classInfo as ClassInfo | null;
  const subjects = (data?.subjects || []) as Subject[];
  const tests = (data?.tests || []) as Test[];
  const attendance = (data?.attendance || []) as Attendance[];
  const assignments = (data?.assignments || []) as Assignment[];
  const grades = (data?.grades || []) as Grade[];
  const payments = (data?.payments || []) as Payment[];
  const debts = (data?.debts || []) as Debt[];
  const schedule = (data?.schedule || []) as ScheduleItem[];

  useEffect(() => {
    if (user?.id) dispatch(fetchStudentDashboard());
  }, [dispatch, user?.id]);

  const attendanceStats = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((item) => {
      const status = String(item.status || '').toLowerCase();
      return status === 'present' || status === 'p' || status === 'late';
    }).length;
    return { total, present, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
  }, [attendance]);

  const averageGrade = useMemo(() => {
    if (grades.length === 0) return 0;
    const total = grades.reduce((sum, grade) => {
      if (typeof grade.percentage === 'number') return sum + grade.percentage;
      if (typeof grade.marks_obtained === 'number' && typeof grade.total_marks === 'number' && grade.total_marks > 0) {
        return sum + (grade.marks_obtained / grade.total_marks) * 100;
      }
      return sum;
    }, 0);
    return Math.round(total / grades.length);
  }, [grades]);

  const upcomingTests = useMemo(() => {
    const now = new Date();
    return tests
      .filter((test) => {
        const due = test.due_date ? new Date(test.due_date) : null;
        const status = String(test.submission_status || '').toLowerCase();
        return due && !Number.isNaN(due.getTime()) && due >= now && status !== 'submitted' && status !== 'graded';
      })
      .slice(0, 4);
  }, [tests]);

  const activeTests = useMemo(
    () => tests.filter((test) => ['in_progress', 'not_started'].includes(String(test.submission_status || '').toLowerCase())).length,
    [tests]
  );

  const assignmentsDue = useMemo(() => {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    return assignments
      .filter((assignment) => {
        const due = assignment.due_date ? new Date(assignment.due_date) : null;
        const status = String(assignment.status || '').toLowerCase();
        return due && !Number.isNaN(due.getTime()) && due >= now && due <= soon && status !== 'completed';
      })
      .slice(0, 4);
  }, [assignments]);

  const outstandingDebt = useMemo(
    () => debts.reduce((sum, debt) => sum + Math.max((Number(debt.debt_amount) || 0) - (Number(debt.amount_paid) || 0), 0), 0),
    [debts]
  );

  const scheduleByDay = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    daysOfWeek.forEach((day) => { map[day] = []; });
    schedule.forEach((item) => {
      if (map[item.day]) map[item.day].push(item);
    });
    return map;
  }, [schedule]);

  const last12Months = useMemo(() => {
    const current = new Date();
    return Array.from({ length: 12 }, (_, index) => new Date(current.getFullYear(), current.getMonth() - index, 1));
  }, []);

  const formatDate = (value?: string) => {
    if (!value) return t('Unknown date');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('Unknown date');
    return date.toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'en-US');
  };

  const formatStatusLabel = (status?: string) => {
    if (!status) return t('Pending');
    return t(status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()));
  };

  const studentName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || t('Student');
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'ST';
  const goHome = () => navigate('/student-portal');
  const goTests = () => navigate('/my-tests');
  const goCalendar = () => navigate('/calendar');

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login/superuser');
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(120deg,rgba(251,113,133,0.22)_0%,transparent_28%),linear-gradient(240deg,rgba(234,179,8,0.2)_0%,transparent_26%),linear-gradient(135deg,#fff7ed_0%,#fdf2f8_28%,#ecfeff_62%,#f7fee7_100%)] dark:bg-[linear-gradient(135deg,#101018_0%,#18112a_45%,#09251f_100%)]">
      <StudentTopHeader initials={initials} studentName={studentName} t={t} onHome={goHome} onTests={goTests} onCalendar={goCalendar} onProfile={() => setProfileOpen(true)} onLogout={handleLogout} />
      <StudentProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        initials={initials}
        studentName={studentName}
        username={user?.username}
        student={student}
        teacher={teacher}
        classInfo={classInfo}
        subjects={subjects}
        attendanceStats={attendanceStats}
        averageGrade={averageGrade}
        gradesCount={grades.length}
        outstandingDebt={outstandingDebt}
        debtsCount={debts.length}
        t={t}
      />
      <StudentPortalContent
        studentFirstName={user?.first_name}
        classInfo={classInfo}
        student={student}
        teacher={teacher}
        subjects={subjects}
        upcomingTests={upcomingTests}
        assignmentsDue={assignmentsDue}
        recentGrades={grades.slice(0, 4)}
        scheduleByDay={scheduleByDay}
        last12Months={last12Months}
        payments={payments}
        activeTests={activeTests}
        attendanceStats={attendanceStats}
        averageGrade={averageGrade}
        outstandingDebt={outstandingDebt}
        error={error}
        t={t}
        formatDate={formatDate}
        formatStatusLabel={formatStatusLabel}
        getErrorMessage={getErrorMessage}
        language={language}
        onTests={goTests}
        onProfile={() => setProfileOpen(true)}
      />
    </div>
  );
};

export default StudentPortal;
