// "Students' payments" tab: for the selected month, which students of each teacher paid,
// group by group. The same data teachers see in their own account, in one place for the owner.

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, Loader2, Phone, RefreshCw, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAppSelector } from '../../hooks';
import { selectSalaryOverview, selectSalaryOverviewLoading } from '@/slices/salariesSlice';
import { useTeacherStudentPayments } from '../hooks/useTeacherStudentPayments';
import { formatSalaryPeriod, teacherFullName } from '../model/salaryModel';
import {
  groupStudentPayments,
  studentName,
  totalStudentPayments,
  type StudentPaymentRow,
  type StudentPaymentState,
} from '../model/teacherStudentPayments';
import type { SalaryOverviewRow } from '../types';

type Filter = 'all' | StudentPaymentState;

const STATE_STYLE: Record<StudentPaymentState, { label: string; className: string; dot: string }> = {
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', dot: 'bg-emerald-500' },
  partial: { label: 'Partly paid', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', dot: 'bg-amber-400' },
  unpaid: { label: 'Unpaid', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200', dot: 'bg-rose-500' },
};

const formatDay = (value: string | null) => (value ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}` : '—');
const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const ProgressBar = ({ value, className }: { value: number; className?: string }) => (
  <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

const Tile = ({ label, value, tone }: { label: string; value: string | number; tone?: string }) => (
  <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
    <p className="text-[0.6875rem] font-semibold text-muted-foreground">{label}</p>
    <p className={cn('text-base font-black', tone)}>{value}</p>
  </div>
);

export const SalaryStudentsTab = ({ year, month }: { year: number; month: number }) => {
  const { t } = useLanguage();
  const overview = useAppSelector(selectSalaryOverview) as SalaryOverviewRow[];
  const overviewLoading = useAppSelector(selectSalaryOverviewLoading);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherId, setTeacherId] = useState<number | null>(null);

  // Teachers with students first, by name.
  const teachers = useMemo(
    () =>
      overview
        .slice()
        .sort(
          (a, b) =>
            Number((b.student_stats?.total_students ?? 0) > 0) - Number((a.student_stats?.total_students ?? 0) > 0) ||
            teacherFullName(a).localeCompare(teacherFullName(b))
        ),
    [overview]
  );
  const visibleTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLowerCase();
    return query ? teachers.filter((row) => teacherFullName(row).toLowerCase().includes(query)) : teachers;
  }, [teacherSearch, teachers]);

  // The first teacher opens by default, and again when the chosen one disappears (another month).
  useEffect(() => {
    if (!teachers.length) return;
    if (!teacherId || !teachers.some((row) => row.teacher_id === teacherId)) setTeacherId(teachers[0].teacher_id);
  }, [teacherId, teachers]);

  const overall = useMemo(
    () =>
      overview.reduce(
        (sum, row) => ({
          students: sum.students + (row.student_stats?.total_students ?? 0),
          paid: sum.paid + (row.student_stats?.paid_students ?? 0),
          unpaid: sum.unpaid + (row.student_stats?.unpaid_students ?? 0),
          collected: sum.collected + Number(row.student_stats?.collected_amount ?? 0),
        }),
        { students: 0, paid: 0, unpaid: 0, collected: 0 }
      ),
    [overview]
  );

  const selectedTeacher = teachers.find((row) => row.teacher_id === teacherId) || null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Tile label={t('Students')} value={overall.students} tone="text-primary" />
        {/* The salary overview counts any payment in the month; the teacher panel splits full and partial. */}
        <Tile label={t('Made a payment')} value={overall.paid} tone="text-emerald-600" />
        <Tile label={t('No payment yet')} value={overall.unpaid} tone="text-rose-600" />
        <Tile label={t('Collected')} value={formatMoney(overall.collected)} tone="text-cyan-600" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={teacherSearch}
              onChange={(event) => setTeacherSearch(event.target.value)}
              placeholder={t('Search teachers...')}
              className="h-8 pl-8 text-xs"
            />
          </div>
          {overviewLoading && !teachers.length ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : visibleTeachers.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">{t('No teachers found')}</p>
          ) : (
            <div className="max-h-[560px] space-y-1 overflow-y-auto pr-1">
              {visibleTeachers.map((row) => {
                const stats = row.student_stats;
                const selected = row.teacher_id === teacherId;
                return (
                  <button
                    key={row.teacher_id}
                    type="button"
                    onClick={() => setTeacherId(row.teacher_id)}
                    className={cn(
                      'w-full rounded-md border px-2.5 py-2 text-left transition-colors',
                      selected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/60'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold">{teacherFullName(row)}</span>
                      <span
                        className="shrink-0 text-[0.6875rem] font-bold tabular-nums text-muted-foreground"
                        title={t('Students who made a payment this month')}
                      >
                        {stats?.paid_students ?? 0}/{stats?.total_students ?? 0}
                      </span>
                    </div>
                    <ProgressBar value={stats?.paid_percent ?? 0} className="mt-1.5" />
                    <div className="mt-1 text-[0.6875rem] text-muted-foreground">
                      {t('Collected')}: {formatMoney(stats?.collected_amount ?? 0)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm">
          {selectedTeacher ? (
            <TeacherStudents teacherId={selectedTeacher.teacher_id} teacherName={teacherFullName(selectedTeacher)} year={year} month={month} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t('Choose a teacher')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const TeacherStudents = ({ teacherId, teacherName, year, month }: { teacherId: number; teacherName: string; year: number; month: number }) => {
  const { t } = useLanguage();
  const { rows, loading, failed, reload } = useTeacherStudentPayments(teacherId, year, month);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  // Groups start closed; a header click opens one, the button above opens or closes all.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setFilter('all');
    setSearch('');
    setOpenGroups(new Set());
  }, [teacherId, year, month]);

  const totals = useMemo(() => totalStudentPayments(rows), [rows]);
  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const shown = rows.filter(
      (row) =>
        (filter === 'all' || row.state === filter) &&
        (!query || studentName(row).toLowerCase().includes(query) || String(row.phone || '').includes(query))
    );
    return groupStudentPayments(shown);
  }, [filter, rows, search]);

  const groupKey = (classId: number | null) => String(classId ?? 'none');
  // While searching, every group with a match is open so results are not hidden.
  const searching = search.trim().length > 0;
  const isOpen = (classId: number | null) => searching || openGroups.has(groupKey(classId));
  const allOpen = groups.length > 0 && groups.every((group) => isOpen(group.classId));
  const toggleGroup = (classId: number | null) =>
    setOpenGroups((current) => {
      const next = new Set(current);
      const key = groupKey(classId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleAll = () => setOpenGroups(allOpen ? new Set() : new Set(groups.map((group) => groupKey(group.classId))));

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: t('All'), count: totals.students },
    { id: 'paid', label: t('Paid'), count: totals.paid },
    { id: 'partial', label: t('Partly paid'), count: totals.partial },
    { id: 'unpaid', label: t('Unpaid'), count: totals.unpaid },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold">{teacherName}</h3>
          <p className="text-xs text-muted-foreground">
            {formatSalaryPeriod(year, month)} · {t('Collected')}: <span className="font-semibold text-foreground">{formatMoney(totals.collected)}</span>
            {totals.remaining > 0 ? (
              <>
                {' '}
                · {t('Remaining')}: <span className="font-semibold text-rose-600">{formatMoney(totals.remaining)}</span>
              </>
            ) : null}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={reload} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          {t('Refresh')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
              filter === item.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
            )}
          >
            {item.id !== 'all' && <span className={cn('h-2 w-2 rounded-full', STATE_STYLE[item.id].dot)} />}
            {item.label}
            <span className="tabular-nums opacity-80">{item.count}</span>
          </button>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={toggleAll}
          disabled={!groups.length || searching}
        >
          {allOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
          {allOpen ? t('Close all') : t('Open all')}
        </Button>
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search students...')} className="h-8 pl-8 text-xs" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : failed ? (
        <div className="py-10 text-center text-sm">
          <p className="text-rose-600">{t('Could not load the data.')}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={reload}>
            {t('Retry')}
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {rows.length ? t('No students match these filters.') : t('No students in this period.')}
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const groupTotal = group.paid + group.partial + group.unpaid;
            const open = isOpen(group.classId);
            return (
              <section key={String(group.classId)} className="overflow-hidden rounded-lg border">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.classId)}
                  aria-expanded={open}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 bg-muted/40 px-3 py-2 text-left hover:bg-muted/70"
                >
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')} />
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-bold">{group.className}</span>
                  {group.monthlyFee > 0 && <span className="text-xs text-muted-foreground">{formatMoney(group.monthlyFee)}</span>}
                  <span className="ml-auto text-xs font-semibold tabular-nums">
                    {t('{paid} of {total} paid', { paid: group.paid, total: groupTotal })}
                  </span>
                  {group.unpaid > 0 && (
                    <span className="rounded-full bg-rose-100 px-1.5 text-[0.6875rem] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                      {group.unpaid}
                    </span>
                  )}
                  <ProgressBar value={percent(group.paid, groupTotal)} className="sm:w-28" />
                </button>
                {open && (
                  <div className="divide-y">
                    {group.students.map((row) => (
                      <StudentLine key={row.student_id} row={row} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

const StudentLine = ({ row }: { row: StudentPaymentRow }) => {
  const { t } = useLanguage();
  const style = STATE_STYLE[row.state];
  const phone = row.phone || row.parent_phone;
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_120px_200px_80px]">
      <div className="min-w-0">
        <div className="truncate font-semibold">{studentName(row)}</div>
        {phone ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Phone className="h-3 w-3" />
            {phone}
          </div>
        ) : null}
      </div>
      <span className={cn('justify-self-end rounded-full px-2 py-0.5 text-[0.6875rem] font-bold sm:justify-self-start', style.className)}>
        {t(style.label)}
      </span>
      <span className="whitespace-nowrap tabular-nums text-muted-foreground sm:text-foreground">
        {formatMoney(row.paid_amount)} / {formatMoney(row.expected)}
      </span>
      <span className="justify-self-end tabular-nums text-muted-foreground" title={t('Last payment')}>
        {formatDay(row.last_payment_date)}
      </span>
    </div>
  );
};
