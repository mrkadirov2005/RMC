import { CalendarDays, ClipboardList, FileQuestion, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionPanel } from '@/components/common/SectionPanel';
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
  activeTests,
  attendanceStats,
  averageGrade,
  outstandingDebt,
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
      <section className="relative overflow-hidden rounded-lg bg-[linear-gradient(135deg,#7c2d12_0%,#be123c_34%,#7e22ce_68%,#0f766e_100%)] p-6 text-white shadow-[0_26px_80px_-38px_rgba(124,45,18,0.9)] sm:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(251,191,36,0.28)_42%,transparent_62%),linear-gradient(290deg,transparent_0%,rgba(45,212,191,0.22)_30%,transparent_52%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge className="border-amber-200/30 bg-amber-300/20 text-amber-50 hover:bg-amber-300/25">{t('Student')}</Badge>
              {classInfo?.class_name && <Badge className="border-cyan-200/30 bg-cyan-300/20 text-cyan-50 hover:bg-cyan-300/25">{classInfo.class_name}</Badge>}
            </div>
            <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">
              {t('Welcome back')}, {studentFirstName || t('Student')}!
            </h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-orange-50/85 sm:text-base">
              {t('Student Portal - Your schedule, tests, assignments, grades, and payments')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onTests} className="border-amber-200/40 bg-amber-300/20 text-white hover:bg-amber-300 hover:text-[#421238]">
              <FileQuestion className="mr-2 h-4 w-4" />
              {t('My Tests')}
            </Button>
            <Button variant="outline" onClick={onProfile} className="border-cyan-200/40 bg-cyan-300/20 text-white hover:bg-cyan-300 hover:text-[#12333c]">
              <UserRound className="mr-2 h-4 w-4" />
              {t('My Profile')}
            </Button>
          </div>
        </div>
      </section>

      <SectionPanel className="animate-slide-up animation-delay-100 overflow-hidden border-0 bg-[#2b174c] text-white shadow-[0_22px_70px_-45px_rgba(43,23,76,0.85)] [&_h2]:text-white [&_p]:text-white/70" title={t('Today')} description={t('The most important student work for the next school day.')} contentClassName="grid gap-3 md:grid-cols-3">
        <TodayCard icon={CalendarDays} tone="violet" title={t('Today’s schedule')} badge={`${todaySchedule.length} ${t('classes')}`}>
          {todaySchedule.length === 0 ? (
            <p className="mt-1 text-sm text-white/70">{t('No classes scheduled today.')}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {todaySchedule.slice(0, 2).map((item, index) => (
                <div key={`${item.room_id}-${index}`} className="flex items-center justify-between rounded-md bg-white/14 px-3 py-2 text-sm">
                  <span className="font-medium">{item.time}</span>
                  <span className="text-white/70">{t('Room')} {item.room_number}</span>
                </div>
              ))}
            </div>
          )}
        </TodayCard>
        <TodayCard icon={FileQuestion} tone="amber" title={t('Next test')}>
          {nextTest ? (
            <>
              <p className="mt-1 truncate text-sm text-white/75">{nextTest.test_name}</p>
              <p className="mt-2 text-xs font-medium text-white">{formatDate(nextTest.due_date)}</p>
            </>
          ) : <p className="mt-1 text-sm text-white/70">{t('No upcoming tests.')}</p>}
        </TodayCard>
        <TodayCard icon={ClipboardList} tone="emerald" title={t('Next assignment')}>
          {nextAssignment ? (
            <>
              <p className="mt-1 truncate text-sm text-white/75">{nextAssignment.assignment_title || nextAssignment.title || t('Assignment')}</p>
              <p className="mt-2 text-xs font-medium text-white">{formatDate(nextAssignment.due_date)}</p>
            </>
          ) : <p className="mt-1 text-sm text-white/70">{t('No assignments due this week.')}</p>}
        </TodayCard>
      </SectionPanel>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="py-4 text-sm text-red-700">{getErrorMessage(error)}</CardContent></Card>}
      
      <StudentSnapshotCards student={student} teacher={teacher} classInfo={classInfo} subjects={subjects} t={t} />
      <UpcomingLists upcomingTests={upcomingTests} assignmentsDue={assignmentsDue} t={t} formatDate={formatDate} formatStatusLabel={formatStatusLabel} onTests={onTests} />
      <RecentGrades grades={recentGrades} total={recentGrades.length} t={t} />
      <StudentWeeklySchedule daysOfWeek={daysOfWeek} scheduleByDay={scheduleByDay} t={t} />
      <StudentPaymentHistory months={last12Months} payments={payments} language={language} t={t} />
    </main>
  );
};

const TodayCard = ({ icon: Icon, tone, title, badge, children }: any) => {
  const surface = tone === 'violet' ? 'from-violet-500/35 to-fuchsia-500/20' : tone === 'amber' ? 'from-amber-400/35 to-orange-500/20' : 'from-emerald-400/35 to-teal-500/20';
  const iconClass = tone === 'violet' ? 'bg-fuchsia-300 text-[#2b174c]' : tone === 'amber' ? 'bg-amber-300 text-[#4a2100]' : 'bg-emerald-300 text-[#063a31]';
  return (
    <div className={`rounded-lg border border-white/15 bg-gradient-to-br ${surface} p-4 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        {badge && <Badge className="border-white/20 bg-white/15 text-white">{badge}</Badge>}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
};

const UpcomingLists = ({ upcomingTests, assignmentsDue, t, formatDate, formatStatusLabel, onTests }: any) => (
  <div className="grid grid-cols-1 gap-4 animate-fade-in animation-delay-400 md:grid-cols-2">
    <ListCard title={t('Upcoming Tests')} empty={t('No tests scheduled soon.')} action={<Button variant="outline" size="sm" onClick={onTests}>{t('View all')}</Button>}>
      {upcomingTests.map((test: Test) => <ListRow key={test.test_id} title={test.test_name} meta={`${test.test_type?.replace(/_/g, ' ')} - ${test.total_marks || 0} ${t('marks')}`} side={formatDate(test.due_date)} />)}
    </ListCard>
    <ListCard title={t('Assignments Due Soon')} empty={t('No assignments due this week.')} action={<Badge variant="outline">{assignmentsDue.length} {t('due')}</Badge>}>
      {assignmentsDue.map((assignment: Assignment) => <ListRow key={assignment.assignment_id || assignment.id} title={assignment.assignment_title || assignment.title || t('Assignment')} meta={`${t('Status')}: ${formatStatusLabel(assignment.status)}`} side={formatDate(assignment.due_date)} />)}
    </ListCard>
  </div>
);

const ListCard = ({ title, empty, action, children }: any) => (
  <Card className="overflow-hidden border-0 bg-gradient-to-br from-white/90 via-rose-50/80 to-amber-50/80 shadow-lg shadow-rose-200/30"><CardHeader className="flex flex-row items-center justify-between border-b border-rose-100/80"><CardTitle className="text-base text-[#44173f]">{title}</CardTitle>{action}</CardHeader><CardContent className="space-y-3 pt-4">
    {children?.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
  </CardContent></Card>
);

const ListRow = ({ title, meta, side }: any) => (
  <div className="flex items-center justify-between border-b border-rose-100/80 pb-3 last:border-b-0 last:pb-0"><div><p className="text-sm font-semibold text-[#32164f]">{title}</p><p className="text-xs text-[#7c456f]">{meta}</p></div><div className="text-xs font-medium text-[#0f766e]">{side}</div></div>
);

const RecentGrades = ({ grades, total, t }: any) => (
  <ListCard title={t('Recent Grades')} empty={t('No grades posted yet.')} action={<Badge variant="outline">{total} {t('total')}</Badge>}>
    {grades.map((grade: Grade) => <ListRow key={grade.grade_id || grade.id} title={grade.subject || t('Subject')} meta={`${grade.marks_obtained ?? 0}/${grade.total_marks ?? 0} - ${grade.grade_letter || t('N/A')}`} side={grade.percentage ? `${Math.round(grade.percentage)}%` : t('N/A')} />)}
  </ListCard>
);
