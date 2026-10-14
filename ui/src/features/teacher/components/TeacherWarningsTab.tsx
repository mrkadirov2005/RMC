import { useMemo, useState } from 'react';
import { AlertTriangle, CircleDollarSign, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/i18n/LanguageContext';
import { getCenterMonthKey } from '@/shared/billingPeriod';
import { formatMoney } from '@/utils/helpers';
import { AbsenceAlertsPanel } from '../../crm/absenceAlerts/AbsenceAlertsPanel';
import { useMyGroupPayments } from '../payments/useMyGroupPayments';
import type { GroupPaymentStudent } from '../payments/types';

type UnpaidStudent = GroupPaymentStudent & {
  class_id: number;
  class_name: string;
  month: string;
};

type TeacherClassOption = { id: number; label: string; teacher_id?: number | null };

const previousMonthKey = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const centerDayOfMonth = (now = new Date()) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tashkent', day: '2-digit' }).format(now));

function UnpaidStudentsPanel({ classOptions }: { classOptions: TeacherClassOption[] }) {
  const { t } = useLanguage();
  const [classFilter, setClassFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'previous' | 'current'>('all');
  const currentMonth = getCenterMonthKey();
  const previousMonth = previousMonthKey(currentMonth);
  const showCurrentMonth = centerDayOfMonth() >= 15;
  const previousPayments = useMyGroupPayments(previousMonth);
  const currentPayments = useMyGroupPayments(currentMonth);
  const students = useMemo<UnpaidStudent[]>(
    () => [
      ...(previousPayments.data?.groups || []).flatMap((group) =>
        group.students
          .filter((student) => student.state !== 'paid')
          .map((student) => ({ ...student, class_id: group.class_id, class_name: group.class_name, month: previousMonth }))
      ),
      ...(showCurrentMonth ? (currentPayments.data?.groups || []) : []).flatMap((group) =>
        group.students
          .filter((student) => student.state !== 'paid')
          .map((student) => ({ ...student, class_id: group.class_id, class_name: group.class_name, month: currentMonth }))
      ),
    ],
    [currentMonth, currentPayments.data?.groups, previousMonth, previousPayments.data?.groups, showCurrentMonth]
  );
  const filteredStudents = useMemo(
    () => students.filter((student) =>
      (!classFilter || String(student.class_id) === classFilter) &&
      (periodFilter === 'all' ||
        (periodFilter === 'current' && student.month === currentMonth) ||
        (periodFilter === 'previous' && student.month === previousMonth))
    ),
    [classFilter, currentMonth, periodFilter, previousMonth, students]
  );

  const loading = previousPayments.loading || (showCurrentMonth && currentPayments.loading);
  const failed = previousPayments.failed || (showCurrentMonth && currentPayments.failed);

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
            <CircleDollarSign className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-black text-amber-900 dark:text-amber-200">
              {t('Payment warnings ({count})', { count: filteredStudents.length })}
            </h2>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">{t('Students who have not paid their monthly fee in full.')}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200">
            {t('Class')}
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="mt-1 block h-9 w-full rounded-md border border-amber-200 bg-white px-2 text-sm font-medium text-slate-900 dark:border-amber-900 dark:bg-slate-950 dark:text-white"
            >
              <option value="">{t('All classes')}</option>
              {classOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200">
            {t('Payment period')}
            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value as 'all' | 'previous' | 'current')}
              className="mt-1 block h-9 w-full rounded-md border border-amber-200 bg-white px-2 text-sm font-medium text-slate-900 dark:border-amber-900 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">{t('All periods')}</option>
              <option value="previous">{t('Previous month')}</option>
              <option value="current">{t('Current month')}</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
        </div>
      ) : failed ? (
        <p className="rounded-lg border border-amber-200 bg-white p-4 text-sm text-muted-foreground dark:border-amber-900 dark:bg-slate-950/40">
          {t('Could not load payment warnings.')}
        </p>
      ) : filteredStudents.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-white p-4 text-sm text-muted-foreground dark:border-amber-900 dark:bg-slate-950/40">
          {t('No payment warnings for this month.')}
        </p>
      ) : (
        <ul className="divide-y divide-amber-200/70 overflow-hidden rounded-lg border border-amber-200 bg-white dark:divide-amber-900/60 dark:border-amber-900 dark:bg-slate-950/40">
          {filteredStudents.map((student) => (
            <li key={`${student.class_id}:${student.student_id}:${student.month}`} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
              <div className="min-w-0">
                <div className="font-bold">{student.name}</div>
                <div className="text-xs text-muted-foreground">
                  {student.class_name}
                </div>
              </div>
              <div className="justify-self-start sm:justify-self-center">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${
                  student.month === currentMonth
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {student.month === currentMonth ? t('Current month') : t('Previous month')}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs sm:justify-self-end">
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {student.state === 'partial' ? t('Partly paid') : t('Not yet paid')}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatMoney(student.remaining)} {t('remaining')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function TeacherWarningsTab({ classOptions = [] }: { classOptions?: TeacherClassOption[] }) {
  const { t } = useLanguage();

  return (
    <Tabs defaultValue="attendance" className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2">
        <TabsTrigger value="attendance" className="gap-2 py-2.5">
          <AlertTriangle className="h-4 w-4" />
          {t('Attendance warnings')}
        </TabsTrigger>
        <TabsTrigger value="payments" className="gap-2 py-2.5">
          <CircleDollarSign className="h-4 w-4" />
          {t('Payment warnings')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="attendance">
        <AbsenceAlertsPanel classOptions={classOptions} />
      </TabsContent>
      <TabsContent value="payments">
        <UnpaidStudentsPanel classOptions={classOptions} />
      </TabsContent>
    </Tabs>
  );
}
