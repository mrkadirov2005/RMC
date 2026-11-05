// One teacher's salary month on its own page (opened from the salary list): the salary by the pay rate
// and how it is counted, what the teacher has received and what is left, the advances, the late
// payments added this month, the students' payments group by group, and the last months.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Banknote, Calendar, HandCoins, Loader2, Percent, Users, Wallet } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { salaryAPI } from '@/shared/api/api';
import { GroupCard } from '@/features/teacher/payments/TeacherPaymentsOverview';
import { LatePaymentsSection } from '@/features/teacher/payments/LatePaymentsSection';
import type { TeacherGroupPayments } from '@/features/teacher/payments/types';
import { useSalaryTeacherDetail } from './hooks/useSalaryTeacherDetail';
import { SalaryAdvanceDialog } from './components/SalaryAdvanceDialog';
import { PayoutLine, STATUS_STYLE } from './components/SalaryPaymentLine';
import {
  formatAmount,
  formatSalaryPeriod,
  monthInputValue,
  parseMonthInputValue,
  payoutParts,
  payoutProgress,
  payoutStatus,
  resolvePreviousMonth,
  resolveSalaryStatus,
  teacherFullName,
} from './model/salaryModel';
import type { SalaryAdvance, SalaryRecord } from './types';

const formatDay = (value?: string | null) => (value ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}` : '—');

const Stat = ({ icon: Icon, label, value, detail, tone }: { icon: typeof Wallet; label: string; value: string; detail?: string; tone?: string }) => (
  <div className="rounded-xl border bg-card p-3 shadow-sm">
    <div className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className={cn('mt-1 text-lg font-black tabular-nums', tone)}>{value}</div>
    {detail && <div className="text-[0.6875rem] text-muted-foreground">{detail}</div>}
  </div>
);

/** The month's payments for this teacher (groups, students, the salary by rate, late payments, advances). */
const useTeacherMonth = (teacherId: number, monthKey: string, reloadKey: number) => {
  const [state, setState] = useState<{ key: string; data: TeacherGroupPayments | null; failed: boolean } | null>(null);
  const key = `${teacherId}:${monthKey}:${reloadKey}`;
  useEffect(() => {
    if (!teacherId) return;
    let cancelled = false;
    salaryAPI
      .getTeacherPayments(teacherId, { month: monthKey })
      .then((response) => {
        if (!cancelled) setState({ key, data: response?.data ?? null, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ key, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId, monthKey, key]);
  // A reload keeps the old figures on screen until the new ones arrive.
  const fresh = state?.key === key;
  return { data: state?.data ?? null, loading: !fresh && !state?.data, failed: fresh && !!state?.failed };
};

const SalaryTeacherDetailPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { teacherId: teacherIdParam } = useParams<{ teacherId: string }>();
  const teacherId = Number(teacherIdParam);
  const [searchParams, setSearchParams] = useSearchParams();
  const fallback = useMemo(() => resolvePreviousMonth(), []);
  const period = parseMonthInputValue(searchParams.get('month') || '') || fallback;
  const monthKey = monthInputValue(period.year, period.month);

  const [reloadKey, setReloadKey] = useState(0);
  const { detail, loading: historyLoading, refresh } = useSalaryTeacherDetail(teacherId, 12);
  const { data, loading, failed } = useTeacherMonth(teacherId, monthKey, reloadKey);
  // Which kind of money is being given: an advance, or the salary itself.
  const [giving, setGiving] = useState<'advance' | 'salary' | null>(null);

  const reload = () => {
    setReloadKey((value) => value + 1);
    refresh();
  };

  const history = detail?.teacher?.teacher_id === teacherId ? detail.history : [];
  const name = detail?.teacher?.teacher_id === teacherId ? teacherFullName(detail.teacher) : '';
  const salary = (data?.salary_record as SalaryRecord | null) ?? null;
  const entries = (data?.advances ?? []) as SalaryAdvance[];
  const advanceCount = entries.filter((entry) => entry.kind !== 'salary').length;
  const advanceTotal = Number(data?.advance_total) || 0;
  const salaryPaidTotal = Number(data?.salary_paid_total) || 0;
  const earnings = data?.earnings;
  const due = Number(earnings?.due) || 0;
  const { paidOut } = payoutParts(salary, advanceTotal, salaryPaidTotal);
  const received = advanceTotal + paidOut;
  const { left } = payoutProgress(received, due);
  const status = payoutStatus(received, due);
  const totals = data?.totals;
  const monthEntry = history.find((entry) => monthInputValue(entry.salary_year, entry.salary_month) === monthKey);

  const setMonth = (value: string) => {
    if (!parseMonthInputValue(value)) return;
    const next = new URLSearchParams(searchParams);
    next.set('month', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/salary?view=list')}>
        <ArrowLeft className="h-4 w-4" />
        {t('Back to Salaries')}
      </Button>

      {/* Who, which month, and what can be done */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-black">
            {name || t('Teacher Salary')}
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums', STATUS_STYLE[status].className)}>
              {formatAmount(received)} / {formatAmount(due)}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatSalaryPeriod(period.year, period.month)}
            {earnings ? ` · ${earnings.rate > 0 ? t('{rate}% rate', { rate: earnings.rate }) : t('No pay rate set')}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Input type="month" value={monthKey} onChange={(event) => setMonth(event.target.value)} className="w-[170px] pl-9" aria-label={t('Month')} />
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button size="sm" variant="outline" onClick={() => setGiving('advance')} disabled={!data}>
            {t('Give Advance')}
          </Button>
          <Button size="sm" onClick={() => setGiving('salary')} disabled={!data}>
            {t('Give salary')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : failed || !data || !earnings || !totals ? (
        <div className="py-12 text-center text-sm text-muted-foreground">{t('Could not load payment statistics.')}</div>
      ) : (
        <>
          {/* The month in numbers */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            <Stat
              icon={Wallet}
              label={t('Salary by pay rate')}
              value={formatMoney(due)}
              detail={t('{rate}% of {amount}', { rate: earnings.rate, amount: formatMoney(earnings.base_amount) })}
              tone="text-primary"
            />
            <Stat
              icon={Users}
              label={t('Students who paid')}
              value={`${earnings.paying_students}/${totals.total_students}`}
              detail={t('{paid} paid · {partial} partly · {unpaid} not yet', {
                paid: totals.paid_students,
                partial: totals.partial_students,
                unpaid: totals.unpaid_students,
              })}
            />
            <Stat icon={HandCoins} label={t('Advance')} value={advanceTotal > 0 ? formatMoney(advanceTotal) : '—'} detail={t('{count} times', { count: advanceCount })} tone="text-sky-600" />
            <Stat
              icon={Banknote}
              label={t('Received by teacher')}
              value={formatMoney(received)}
              detail={salary?.is_paid ? `${t('Salary paid')} ${formatDay(salary.paid_at)}` : t('Not paid yet')}
              tone="text-emerald-600"
            />
            <Stat icon={Wallet} label={t('Left to pay')} value={left > 0 ? formatMoney(left) : '—'} tone="text-rose-600" />
          </div>

          {/* What was received of the salary, and how the salary is counted */}
          <section className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm lg:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-bold">{t('Received of salary')}</h3>
              <PayoutLine advances={advanceTotal} paidOut={paidOut} due={due} className="[&>div:last-child]:h-3" />
            </div>
            <div className="space-y-1.5 text-sm">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Percent className="h-4 w-4" />
                {t('How the salary is counted')}
              </h3>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t('Paid for this month')}</span>
                <span className="tabular-nums">{formatMoney(earnings.on_time_amount)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t('Late payments for earlier months')}</span>
                <span className="tabular-nums text-amber-600">+{formatMoney(earnings.late_amount)}</span>
              </div>
              <div className="flex justify-between gap-2 border-t pt-1.5 font-bold">
                <span>{t('{rate}% of {amount}', { rate: earnings.rate, amount: formatMoney(earnings.base_amount) })}</span>
                <span className="tabular-nums">{formatMoney(due)}</span>
              </div>
            </div>
          </section>

          <LatePaymentsSection earnings={earnings} />

          {/* Money given this month: advances and the salary, each on the day it was given */}
          <section className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <HandCoins className="h-4 w-4 text-sky-600" />
              {t('Money given this month')}
            </h3>
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('Nothing given this month yet.')}</p>
            ) : (
              <div className="divide-y text-sm">
                {entries.map((entry) => (
                  <div key={entry.advance_id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums text-muted-foreground">{formatDay(entry.given_at)}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[0.6875rem] font-bold',
                          entry.kind === 'salary' ? STATUS_STYLE.paid.className : STATUS_STYLE.pending.className
                        )}
                      >
                        {entry.kind === 'salary' ? t('Salary') : t('Advance')}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{[entry.payment_method, entry.given_by_name, entry.notes].filter(Boolean).join(' · ')}</span>
                    <span className={cn('font-bold tabular-nums', entry.kind === 'salary' ? 'text-emerald-600' : 'text-sky-600')}>{formatMoney(entry.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Students' payments group by group */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Users className="h-4 w-4" />
              {t('Student payments')}
            </h3>
            {data.groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No classes assigned yet')}</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {data.groups.map((group) => (
                  <GroupCard key={group.class_id} group={group} sharePercent={earnings.rate} ownView={false} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* The last months */}
      <section className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-bold">{t('Last months')}</h3>
        {historyLoading && !history.length ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('No history yet.')}</p>
        ) : (
          <div className="divide-y text-sm">
            {history.map((entry) => {
              const entryStatus = resolveSalaryStatus(entry.salary, entry.advance_total);
              const key = monthInputValue(entry.salary_year, entry.salary_month);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMonth(key)}
                  className={cn('grid w-full grid-cols-2 items-center gap-2 py-2 text-left hover:bg-muted/40 sm:grid-cols-[130px_1fr_auto_auto]', key === monthKey && 'font-bold')}
                >
                  <span>{formatSalaryPeriod(entry.salary_year, entry.salary_month)}</span>
                  <span className="text-xs text-muted-foreground">
                    {(() => {
                      const given = payoutParts(entry.salary, entry.advance_total, entry.salary_paid_total);
                      const total = given.advances + given.paidOut;
                      return total > 0 ? `${t('Received by teacher')}: ${formatMoney(total)}` : '';
                    })()}
                  </span>
                  <span className="tabular-nums">{entry.salary ? formatMoney(entry.salary.amount) : '—'}</span>
                  <span className={cn('w-fit rounded-full px-2 py-0.5 text-xs font-bold', STATUS_STYLE[entryStatus].className)}>{t(STATUS_STYLE[entryStatus].label)}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {giving && (
        <SalaryAdvanceDialog
          open
          onOpenChange={(open) => {
            if (open) return;
            setGiving(null);
            reload();
          }}
          kind={giving}
          limit={giving === 'salary' ? left : undefined}
          teacherId={teacherId}
          teacherName={name || `#${teacherId}`}
          salaryYear={period.year}
          salaryMonth={period.month}
          // The shared teacher detail is refreshed as advances are added or removed in the dialog.
          advances={monthEntry?.advances ?? entries}
        />
      )}
    </div>
  );
};

export default SalaryTeacherDetailPage;
