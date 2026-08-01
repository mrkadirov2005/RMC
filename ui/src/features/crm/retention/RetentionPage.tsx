import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  GraduationCap,
  Loader2,
  School,
  TrendingDown,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { reportAPI } from './api';
import { useAppSelector } from '../hooks';
import { getResolvedCenterId } from '@/shared/auth/centerScope';
import { PieChart } from '@/shared/components/PieChart';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type RetentionMode = 'overview' | 'teachers';

interface RetentionReport {
  period: {
    selected_month: string;
    selected_label: string;
    previous_label: string;
    start_date: string;
    end_date: string;
  };
  summary: {
    current_month_left: number;
    previous_month_left: number;
    delta: number;
    delta_percent: number;
    trend: 'up' | 'down' | 'flat';
  };
  monthly: Array<{ month: string; label: string; left_count: number }>;
  by_teacher: Array<{
    teacher_id: number | null;
    teacher_name: string;
    employee_id?: string | null;
    left_count: number;
    class_count: number;
    latest_deleted_at?: string | null;
    students?: Array<Record<string, any>>;
  }>;
  by_class: Array<{
    class_id: number | null;
    class_name: string;
    class_code?: string | null;
    teacher_name: string;
    left_count: number;
    latest_deleted_at?: string | null;
  }>;
  recent_students: Array<Record<string, any>>;
}

const defaultMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const emptyReport: RetentionReport = {
  period: {
    selected_month: defaultMonth(),
    selected_label: '',
    previous_label: '',
    start_date: '',
    end_date: '',
  },
  summary: {
    current_month_left: 0,
    previous_month_left: 0,
    delta: 0,
    delta_percent: 0,
    trend: 'flat',
  },
  monthly: [],
  by_teacher: [],
  by_class: [],
  recent_students: [],
};

const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getName = (student: Record<string, any>) =>
  [student.first_name, student.last_name].filter(Boolean).join(' ') || student.enrollment_number || 'Student';

const RetentionPage = ({ embedded = false }: { embedded?: boolean }) => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') === 'intake' ? 'intake' : 'retention';
  const isIntake = view === 'intake';
  const { user } = useAppSelector((state) => state.auth);
  const [month, setMonth] = useState(defaultMonth);
  const [months, setMonths] = useState(6);
  const [mode, setMode] = useState<RetentionMode>('overview');
  const [report, setReport] = useState<RetentionReport>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [centerId, setCenterId] = useState<number | null>(() => getResolvedCenterId(user));
  const [selectedTeacher, setSelectedTeacher] = useState<RetentionReport['by_teacher'][number] | null>(null);

  useEffect(() => {
    const syncCenter = () => setCenterId(getResolvedCenterId(user));
    syncCenter();
    window.addEventListener('active-center-changed', syncCenter);
    return () => window.removeEventListener('active-center-changed', syncCenter);
  }, [user]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!centerId) {
        setReport(emptyReport);
        setError(t('Select an active center to view retention data.'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await reportAPI.retention({ center_id: centerId, month, months, limit: 40, view });
        if (!alive) return;
        setReport(response.data || emptyReport);
      } catch (requestError: any) {
        if (!alive) return;
        setError(requestError?.response?.data?.error || t('Failed to load retention data.'));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [centerId, month, months, t, view]);

  const maxMonthly = useMemo(
    () => Math.max(1, ...report.monthly.map((row) => Number(row.left_count || 0))),
    [report.monthly]
  );

  const teacherPie = useMemo(
    () =>
      report.by_teacher.filter((row) => Number(row.left_count || 0) > 0).slice(0, 6).map((row, index) => ({
        label: row.teacher_name,
        value: Number(row.left_count || 0),
        color: colors[index % colors.length],
      })),
    [report.by_teacher]
  );

  const topTeacher = report.by_teacher.find((row) => Number(row.left_count || 0) > 0);
  const trendUp = report.summary.trend === 'up';
  const trendDown = report.summary.trend === 'down';

  return (
    <div className={cn(!embedded && 'min-h-screen bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-white')}>
      <div className={cn('mx-auto max-w-7xl space-y-4', embedded ? '' : 'px-0 sm:px-2')}>
        {!embedded && (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-600 text-white shadow-md shadow-rose-500/20">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black">{t(isIntake ? 'Intake' : 'Retention')}</h1>
              <p className="text-sm text-slate-500 dark:text-white/55">{t(isIntake ? 'Incoming students by month, teacher, and group.' : 'Student loss and recovery signals by month, teacher, and group.')}</p>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-300">{t(isIntake ? 'Intake' : 'Retention')}</p>
              <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                {report.period.selected_label || month}
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-[180px_140px_auto]">
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-500">{t('Month')}</span>
                <Input type="month" value={month} onChange={(event) => setMonth(event.target.value || defaultMonth())} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-500">{t('Range')}</span>
                <select
                  value={months}
                  onChange={(event) => setMonths(Number(event.target.value))}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={3}>{t('3 months')}</option>
                  <option value={6}>{t('6 months')}</option>
                  <option value={12}>{t('12 months')}</option>
                  <option value={24}>{t('24 months')}</option>
                </select>
              </label>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant={mode === 'overview' ? 'default' : 'outline'}
                  size="sm"
                  className="h-10 gap-2"
                  onClick={() => setMode('overview')}
                >
                  <BarChart3 className="h-4 w-4" />
                  {t('Overview')}
                </Button>
                <Button
                  type="button"
                  variant={mode === 'teachers' ? 'default' : 'outline'}
                  size="sm"
                  className="h-10 gap-2"
                  onClick={() => setMode('teachers')}
                >
                  <UserRoundCheck className="h-4 w-4" />
                  {t('Teachers')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            {error}
          </div>
        ) : loading ? (
          <div className="flex justify-center rounded-lg border border-slate-200 bg-white py-12 dark:border-white/10 dark:bg-white/[0.04]">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Metric label={t(isIntake ? 'Joined this month' : 'Left this month')} value={report.summary.current_month_left} Icon={GraduationCap} tone={isIntake ? 'bg-emerald-600' : 'bg-rose-600'} />
              <Metric label={t('Previous month')} value={report.summary.previous_month_left} Icon={CalendarDays} tone="bg-slate-700" />
              <Metric
                label={t('Month change')}
                value={`${report.summary.delta > 0 ? '+' : ''}${report.summary.delta}`}
                detail={`${report.summary.delta_percent > 0 ? '+' : ''}${report.summary.delta_percent}%`}
                Icon={trendUp ? ArrowUpRight : trendDown ? ArrowDownRight : BarChart3}
                tone={trendUp ? 'bg-red-600' : trendDown ? 'bg-emerald-600' : 'bg-blue-600'}
              />
              <Metric label={t('Top teacher')} value={topTeacher?.left_count || 0} detail={topTeacher?.teacher_name || t('No teacher')} Icon={Users} tone="bg-cyan-700" />
            </div>

            {mode === 'overview' ? (
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <TrendPanel rows={report.monthly} max={maxMonthly} intake={isIntake} />
                <ClassPanel rows={report.by_class} intake={isIntake} />
              </div>
            ) : (
              <TeacherPanel rows={report.by_teacher} pie={teacherPie} onTeacherClick={setSelectedTeacher} intake={isIntake} />
            )}

            <RecentStudents rows={report.recent_students} intake={isIntake} />
            <TeacherStudentsDialog teacher={selectedTeacher} intake={isIntake} onOpenChange={(open) => !open && setSelectedTeacher(null)} />
          </>
        )}
      </div>
    </div>
  );
};

const Metric = ({ label, value, detail, Icon, tone }: { label: string; value: number | string; detail?: string; Icon: any; tone: string }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {detail && <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/55">{detail}</p>}
      </div>
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm', tone)}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const TrendPanel = ({ rows, max, intake }: { rows: RetentionReport['monthly']; max: number; intake: boolean }) => {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-cyan-600" />
        <h3 className="text-base font-black text-slate-900 dark:text-white">{t(intake ? 'Monthly intake' : 'Monthly leavers')}</h3>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.month} className="grid grid-cols-[86px_1fr_44px] items-center gap-3">
            <span className="text-xs font-bold text-slate-500">{row.label}</span>
            <div className="h-3 overflow-hidden rounded bg-slate-100 dark:bg-white/10">
              <div className={cn('animate-chart-bar-fill h-full rounded', intake ? 'bg-emerald-500' : 'bg-rose-500')} style={{ width: `${Math.max(4, (row.left_count / max) * 100)}%` }} />
            </div>
            <span className="text-right text-sm font-black text-slate-900 dark:text-white">{row.left_count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TeacherPanel = ({
  rows,
  pie,
  onTeacherClick,
  intake,
}: {
  rows: RetentionReport['by_teacher'];
  pie: Array<{ label: string; value: number; color: string }>;
  onTeacherClick: (teacher: RetentionReport['by_teacher'][number]) => void;
  intake: boolean;
}) => {
  const { t } = useLanguage();
  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <h3 className="text-base font-black text-slate-900 dark:text-white">{t(intake ? 'Teacher intake share' : 'Teacher share')}</h3>
        <div className="mt-4 flex justify-center">
          <PieChart data={pie} size={240} />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <h3 className="mb-3 text-base font-black text-slate-900 dark:text-white">{t(intake ? 'Students joined by teacher' : 'Students left by teacher')}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Teacher')}</TableHead>
              <TableHead>{t('Groups')}</TableHead>
              <TableHead>{t(intake ? 'Last joined' : 'Last left')}</TableHead>
              <TableHead className="text-right">{t(intake ? 'Joined' : 'Left')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={`${row.teacher_id || 'none'}-${row.teacher_name}`}
                className="cursor-pointer"
                onClick={() => onTeacherClick(row)}
              >
                <TableCell>
                  <button
                    type="button"
                    className="text-left font-bold text-slate-900 hover:text-cyan-700 dark:text-white dark:hover:text-cyan-300"
                    onClick={(event) => {
                      event.stopPropagation();
                      onTeacherClick(row);
                    }}
                  >
                    {row.teacher_name}
                  </button>
                </TableCell>
                <TableCell>{row.class_count}</TableCell>
                <TableCell>{formatDate(row.latest_deleted_at)}</TableCell>
                <TableCell className={cn('text-right font-black', row.left_count > 0 ? 'text-rose-600' : 'text-slate-400')}>{row.left_count}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-slate-500">{t('No students left in this month.')}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const TeacherStudentsDialog = ({
  teacher,
  intake,
  onOpenChange,
}: {
  teacher: RetentionReport['by_teacher'][number] | null;
  intake: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t } = useLanguage();
  const students = teacher?.students || [];

  return (
    <Dialog open={Boolean(teacher)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{teacher?.teacher_name || t('Teacher')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <ModalStat label={t(intake ? 'Incoming students' : 'Gone students')} value={String(teacher?.left_count || 0)} />
          <ModalStat label={t(intake ? 'Groups receiving' : 'Groups affected')} value={String(teacher?.class_count || 0)} />
          <ModalStat label={t(intake ? 'Last joined' : 'Last left')} value={formatDate(teacher?.latest_deleted_at)} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Student')}</TableHead>
              <TableHead>{t('Group')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead>{t('Phone')}</TableHead>
              <TableHead className="text-right">{t(intake ? 'Joined at' : 'Deleted at')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.student_id}>
                <TableCell className="font-bold">{getName(student)}</TableCell>
                <TableCell>{student.class_name || '-'}</TableCell>
                <TableCell>{student.status || '-'}</TableCell>
                <TableCell>{student.phone || '-'}</TableCell>
                <TableCell className="text-right">{formatDate(student.deleted_at)}</TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                  {t('No gone students for this teacher in the selected month.')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
};

const ModalStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{value}</p>
  </div>
);

const ClassPanel = ({ rows, intake }: { rows: RetentionReport['by_class']; intake: boolean }) => {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-4 flex items-center gap-2">
        <School className="h-5 w-5 text-emerald-600" />
        <h3 className="text-base font-black text-slate-900 dark:text-white">{t(intake ? 'Groups receiving students' : 'Groups with losses')}</h3>
      </div>
      <div className="space-y-2">
        {rows.slice(0, 8).map((row) => (
          <div key={`${row.class_id || 'none'}-${row.class_name}`} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3 dark:border-white/10">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900 dark:text-white">{row.class_name}</p>
              <p className="truncate text-xs text-slate-500">{row.teacher_name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-rose-600">{row.left_count}</p>
              <p className="text-[11px] text-slate-500">{formatDate(row.latest_deleted_at)}</p>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{t('No group losses in this month.')}</p>}
      </div>
    </div>
  );
};

const RecentStudents = ({ rows, intake }: { rows: RetentionReport['recent_students']; intake: boolean }) => {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <h3 className="mb-3 text-base font-black text-slate-900 dark:text-white">{t(intake ? 'Incoming students' : 'Recent leavers')}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Student')}</TableHead>
            <TableHead>{t('Group')}</TableHead>
            <TableHead>{t('Teacher')}</TableHead>
            <TableHead>{t('Status')}</TableHead>
            <TableHead className="text-right">{t(intake ? 'Joined at' : 'Deleted at')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((student) => (
            <TableRow key={student.student_id}>
              <TableCell className="font-bold">{getName(student)}</TableCell>
              <TableCell>{student.class_name || '-'}</TableCell>
              <TableCell>{[student.teacher_first_name, student.teacher_last_name].filter(Boolean).join(' ') || '-'}</TableCell>
              <TableCell>{student.status || '-'}</TableCell>
              <TableCell className="text-right">{formatDate(student.deleted_at)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-slate-500">{t('No deleted students for this month.')}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default RetentionPage;
