import { CalendarDays, ClipboardList, FileQuestion, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionPanel } from '@/components/common/SectionPanel';
import { formatTestType } from '@/features/crm/tests/testVisuals';
import type { Assignment, AttendanceStats, ClassInfo, Grade, Payment, ScheduleItem, StudentProfile, Subject, Teacher, Test } from '../types';
import { StudentPaymentHistory } from './StudentPaymentHistory';
import { StudentSnapshotCards } from './StudentSnapshotCards';
import { StudentWeeklySchedule } from './StudentWeeklySchedule';

interface StudentPortalContentProps {
  studentFirstName?: string;
  classInfo: ClassInfo | null;
  student: StudentProfile | null;
  teacher: Teacher | null;
  subjects: Subject[];
  upcomingTests: Test[];
  assignmentsDue: Assignment[];
  recentGrades: Grade[];
  scheduleByDay: Record<string, ScheduleItem[]>;
  last12Months: Date[];
  payments: Payment[];
  activeTests: number;
  attendanceStats: AttendanceStats;
  averageGrade: number;
  outstandingDebt: number;
  error?: string | null;
  t: (value: string) => string;
  formatDate: (value?: string) => string;
  formatStatusLabel: (value?: string) => string;
  getErrorMessage: (value: unknown) => string;
  language: string;
  onTests: () => void;
  onProfile: () => void;
}

export const StudentPortalContent = ({
  studentFirstName,
  classInfo,
  student,
  teacher,
  subjects,
  upcomingTests,
  assignmentsDue,
  recentGrades,
  scheduleByDay,
  last12Months,
  payments,
  error,
  t,
  formatDate,
  formatStatusLabel,
  getErrorMessage,
  language,
  onTests,
  onProfile,
}: StudentPortalContentProps) => {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaySchedule = scheduleByDay[todayName] || [];
  const nextTest = upcomingTests[0];
  const nextAssignment = assignmentsDue[0];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:py-7">
      <PageHeader
        className="animate-slide-up"
        variant="hero"
        heroGradient="from-teal-800 via-teal-700 to-emerald-700"
        icon={UserRound}
        title={`${t('Welcome back')}, ${studentFirstName || t('Student')}!`}
        description={t('Student Portal - Your schedule, tests, assignments, grades, and payments')}
        meta={
          <>
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">{t('Student')}</Badge>
            {classInfo?.class_name && <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">{classInfo.class_name}</Badge>}
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={onTests} className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <FileQuestion className="mr-2 h-4 w-4" />
              {t('My Tests')}
            </Button>
            <Button variant="outline" onClick={onProfile} className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <UserRound className="mr-2 h-4 w-4" />
              {t('My Profile')}
            </Button>
          </>
        }
      />

      <SectionPanel className="animate-slide-up animation-delay-100" title={t('Today')} description={t('The most important student work for the next school day.')} contentClassName="grid gap-3 md:grid-cols-3">
        <TodayCard icon={CalendarDays} title={t('Today’s schedule')} badge={`${todaySchedule.length} ${t('classes')}`}>
          {todaySchedule.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t('No classes scheduled today.')}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {todaySchedule.slice(0, 2).map((item, index) => (
                <div key={`${item.room_id}-${index}`} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                  <span className="font-medium text-foreground">{item.time}</span>
                  <span className="text-muted-foreground">{t('Room')} {item.room_number}</span>
                </div>
              ))}
            </div>
          )}
        </TodayCard>
        <TodayCard icon={FileQuestion} title={t('Next test')}>
          {nextTest ? (
            <>
              <p className="mt-1 truncate text-sm text-foreground">{nextTest.test_name}</p>
              <p className="mt-2 text-xs font-medium text-muted-foreground">{formatDate(nextTest.due_date)}</p>
            </>
          ) : <p className="mt-1 text-sm text-muted-foreground">{t('No upcoming tests.')}</p>}
        </TodayCard>
        <TodayCard icon={ClipboardList} title={t('Next assignment')}>
          {nextAssignment ? (
            <>
              <p className="mt-1 truncate text-sm text-foreground">{nextAssignment.assignment_title || nextAssignment.title || t('Assignment')}</p>
              <p className="mt-2 text-xs font-medium text-muted-foreground">{formatDate(nextAssignment.due_date)}</p>
            </>
          ) : <p className="mt-1 text-sm text-muted-foreground">{t('No assignments due this week.')}</p>}
        </TodayCard>
      </SectionPanel>

      {error && <Card className="border-destructive/30 bg-destructive/10"><CardContent className="py-4 text-sm text-destructive">{getErrorMessage(error)}</CardContent></Card>}
      
      <StudentSnapshotCards student={student} teacher={teacher} classInfo={classInfo} subjects={subjects} t={t} />
      <UpcomingLists upcomingTests={upcomingTests} assignmentsDue={assignmentsDue} t={t} formatDate={formatDate} formatStatusLabel={formatStatusLabel} onTests={onTests} />
      <RecentGrades grades={recentGrades} total={recentGrades.length} t={t} />
      <StudentWeeklySchedule daysOfWeek={daysOfWeek} scheduleByDay={scheduleByDay} t={t} />
      <StudentPaymentHistory months={last12Months} payments={payments} language={language} t={t} />
    </main>
  );
};

const TodayCard = ({ icon: Icon, title, badge, children }: any) => (
  <div className="rounded-lg border bg-muted/40 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-600/10 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
        <Icon className="h-5 w-5" />
      </div>
      {badge && <Badge variant="outline">{badge}</Badge>}
    </div>
    <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
    {children}
  </div>
);

const UpcomingLists = ({ upcomingTests, assignmentsDue, t, formatDate, formatStatusLabel, onTests }: any) => (
  <div className="grid grid-cols-1 gap-4 animate-fade-in animation-delay-400 md:grid-cols-2">
    <ListCard title={t('Upcoming Tests')} empty={t('No tests scheduled soon.')} action={<Button variant="outline" size="sm" onClick={onTests}>{t('View all')}</Button>}>
      {upcomingTests.map((test: Test) => <ListRow key={test.test_id} title={test.test_name} meta={`${formatTestType(test.test_type)} - ${test.total_marks || 0} ${t('marks')}`} side={formatDate(test.due_date)} />)}
    </ListCard>
    <ListCard title={t('Assignments Due Soon')} empty={t('No assignments due this week.')} action={<Badge variant="outline">{assignmentsDue.length} {t('due')}</Badge>}>
      {assignmentsDue.map((assignment: Assignment) => <ListRow key={assignment.assignment_id || assignment.id} title={assignment.assignment_title || assignment.title || t('Assignment')} meta={`${t('Status')}: ${formatStatusLabel(assignment.status)}`} side={formatDate(assignment.due_date)} />)}
    </ListCard>
  </div>
);

const ListCard = ({ title, empty, action, children }: any) => (
  <Card><CardHeader className="flex flex-row items-center justify-between border-b"><CardTitle className="text-base text-foreground">{title}</CardTitle>{action}</CardHeader><CardContent className="space-y-3 pt-4">
    {children?.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
  </CardContent></Card>
);

const ListRow = ({ title, meta, side }: any) => (
  <div className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0"><div><p className="text-sm font-semibold text-foreground">{title}</p><p className="text-xs text-muted-foreground">{meta}</p></div><div className="text-xs font-medium text-teal-700 dark:text-teal-300">{side}</div></div>
);

const RecentGrades = ({ grades, total, t }: any) => (
  <ListCard title={t('Recent Grades')} empty={t('No grades posted yet.')} action={<Badge variant="outline">{total} {t('total')}</Badge>}>
    {grades.map((grade: Grade) => <ListRow key={grade.grade_id || grade.id} title={grade.subject || t('Subject')} meta={`${grade.marks_obtained ?? 0}/${grade.total_marks ?? 0} - ${grade.grade_letter || t('N/A')}`} side={grade.percentage ? `${Math.round(grade.percentage)}%` : t('N/A')} />)}
  </ListCard>
);
