// A teacher's salary month in one window: the salary and what they have received, the advances, how
// their students paid (overall and group by group) and the last months. Opened from the salary list.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, ExternalLink, HandCoins, Loader2, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSalaryTeacherDetail } from '../hooks/useSalaryTeacherDetail';
import { useTeacherStudentPayments } from '../hooks/useTeacherStudentPayments';
import {
  collectedPercent,
  formatSalaryPeriod,
  progressTone,
  receivedSoFar,
  remainingAfterAdvances,
  resolveSalaryStatus,
  teacherFullName,
} from '../model/salaryModel';
import { groupStudentPayments } from '../model/teacherStudentPayments';
import type { SalaryOverviewRow, SalaryStudentStats } from '../types';
import { MarkSalaryPaidDialog } from './MarkSalaryPaidDialog';
import { SalaryAdvanceDialog } from './SalaryAdvanceDialog';
import { PaymentLine, STATUS_STYLE } from './SalaryPaymentLine';

const EMPTY_STATS: SalaryStudentStats = { total_students: 0, paid_students: 0, unpaid_students: 0, paid_percent: 0, unpaid_percent: 0, collected_amount: 0 };

const formatDay = (value?: string | null) => (value ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}` : '—');

const Stat = ({ icon: Icon, label, value, detail, tone }: { icon: typeof Wallet; label: string; value: string; detail?: string; tone?: string }) => (
  <div className="rounded-lg border bg-card p-3">
    <div className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className={cn('mt-1 text-lg font-black tabular-nums', tone)}>{value}</div>
    {detail && <div className="text-[0.6875rem] text-muted-foreground">{detail}</div>}
  </div>
);

/** A thin bar for a group or a month: the share that came in. */
const MiniBar = ({ percent }: { percent: number }) => (
  <div data-keep-bg className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.25)' }}>
    <div data-keep-bg className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: progressTone(percent).bar }} />
  </div>
);

interface TeacherSalaryPanelProps {
  row: SalaryOverviewRow;
  year: number;
  month: number;
  onClose: () => void;
}

export const TeacherSalaryPanel = ({ row, year, month, onClose }: TeacherSalaryPanelProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const teacherId = row.teacher_id;
  const name = teacherFullName(row);
  const { detail, loading: historyLoading } = useSalaryTeacherDetail(teacherId, 6);
  const { rows: studentRows, loading: studentsLoading } = useTeacherStudentPayments(teacherId, year, month);
  const [markOpen, setMarkOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);

  // The teacher detail is shared app state: use it only once it is this teacher's.
  const history = detail?.teacher?.teacher_id === teacherId ? detail.history : [];
  const monthEntry = history.find((entry) => entry.salary_year === year && entry.salary_month === month);
  const advances = monthEntry?.advances ?? [];
  const advanceTotal = Number(row.advance_total) || 0;
  const salary = row.salary;
  const status = resolveSalaryStatus(salary, advanceTotal);
  const groups = useMemo(() => groupStudentPayments(studentRows), [studentRows]);
  const progress = row.payment_progress;
  const percent = collectedPercent(progress);
  const lastMonths = history.slice(0, 6);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {name}
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', STATUS_STYLE[status].className)}>{t(STATUS_STYLE[status].label)}</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{formatSalaryPeriod(year, month)}</p>
        </DialogHeader>

        {/* The salary month in numbers */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat icon={Wallet} label={t('Salary')} value={salary ? formatMoney(salary.amount) : '—'} detail={salary?.is_paid ? `${t('Paid')} ${formatDay(salary.paid_at)}` : t('Not paid yet')} />
          <Stat icon={HandCoins} label={t('Advance')} value={advanceTotal > 0 ? formatMoney(advanceTotal) : '—'} detail={t('{count} times', { count: advances.length })} tone="text-sky-600" />
          <Stat icon={Banknote} label={t('Received')} value={formatMoney(receivedSoFar(salary, advanceTotal))} tone="text-emerald-600" />
          <Stat
            icon={Wallet}
            label={t('Left to pay')}
            value={salary?.is_paid ? '—' : salary ? formatMoney(remainingAfterAdvances(salary.amount, advanceTotal)) : '—'}
            tone="text-rose-600"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setMarkOpen(true)}>
            {salary?.is_paid ? t('Edit salary') : t('Mark as paid')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAdvanceOpen(true)}>
            {t('Give Advance')}
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => navigate(`/salary/${teacherId}`)}>
            <ExternalLink className="h-4 w-4" />
            {t('Full history')}
          </Button>
        </div>

        {/* Students' payments for the month */}
        <section className="space-y-3 rounded-lg border p-3">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Users className="h-4 w-4" />
            {t('Student payments')}
          </h3>
          <PaymentLine progress={progress} />
          {progress && progress.students > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-950/40">
                <div className="text-base font-black text-emerald-600">{progress.paid_students}</div>
                {t('Paid')}
              </div>
              <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-950/40">
                <div className="text-base font-black text-amber-600">{progress.partial_students}</div>
                {t('Partly paid')}
              </div>
              <div className="rounded-md bg-rose-50 p-2 dark:bg-rose-950/40">
                <div className="text-base font-black text-rose-600">{progress.unpaid_students}</div>
                {t('Unpaid')}
              </div>
            </div>
          )}
          {studentsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            groups.length > 0 && (
              <div className="divide-y rounded-md border">
                {groups.map((group) => {
                  const groupPercent = collectedPercent({ expected: group.expected, collected: group.collected });
                  return (
                    <div key={String(group.classId)} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
                      <span className="truncate font-semibold">{group.className}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatMoney(group.collected)} / {formatMoney(group.expected)}
                      </span>
                      <MiniBar percent={groupPercent} />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {group.paid}/{group.students.length} {t('paid')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          )}
          {percent < 100 && progress && progress.remaining > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('Still owed')}: <span className="font-semibold text-rose-600">{formatMoney(progress.remaining)}</span>
            </p>
          )}
        </section>

        {/* Advances this month */}
        <section className="space-y-2 rounded-lg border p-3">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <HandCoins className="h-4 w-4" />
            {t('Advances this month')}
          </h3>
          {historyLoading && !history.length ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : advances.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('No advances this month.')}</p>
          ) : (
            <div className="divide-y text-sm">
              {advances.map((advance) => (
                <div key={advance.advance_id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span className="tabular-nums text-muted-foreground">{formatDay(advance.given_at)}</span>
                  <span className="text-xs text-muted-foreground">
                    {[advance.payment_method, advance.given_by_name, advance.notes].filter(Boolean).join(' · ')}
                  </span>
                  <span className="font-bold tabular-nums text-sky-600">{formatMoney(advance.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* The last months */}
        <section className="space-y-2 rounded-lg border p-3">
          <h3 className="text-sm font-bold">{t('Last months')}</h3>
          {historyLoading && !history.length ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : lastMonths.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('No history yet.')}</p>
          ) : (
            <div className="divide-y text-sm">
              {lastMonths.map((entry) => {
                const entryStatus = resolveSalaryStatus(entry.salary, entry.advance_total);
                const stats = entry.student_stats || EMPTY_STATS;
                return (
                  <div key={`${entry.salary_year}-${entry.salary_month}`} className="grid grid-cols-2 items-center gap-2 py-2 sm:grid-cols-[110px_1fr_auto_auto]">
                    <span className="font-semibold">{formatSalaryPeriod(entry.salary_year, entry.salary_month)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('{paid} of {total} paid', { paid: stats.paid_students, total: stats.total_students })}
                    </span>
                    <span className="tabular-nums">{entry.salary ? formatMoney(entry.salary.amount) : '—'}</span>
                    <span className={cn('w-fit rounded-full px-2 py-0.5 text-xs font-bold', STATUS_STYLE[entryStatus].className)}>
                      {t(STATUS_STYLE[entryStatus].label)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {markOpen && (
          <MarkSalaryPaidDialog
            open
            onOpenChange={(open) => !open && setMarkOpen(false)}
            teacherId={teacherId}
            teacherName={name}
            salaryYear={year}
            salaryMonth={month}
            studentStats={row.student_stats || EMPTY_STATS}
            existingAmount={salary?.amount}
            existingPaymentMethod={salary?.payment_method}
            existingNotes={salary?.notes}
            advanceTotal={advanceTotal}
          />
        )}
        {advanceOpen && (
          <SalaryAdvanceDialog
            open
            onOpenChange={(open) => !open && setAdvanceOpen(false)}
            teacherId={teacherId}
            teacherName={name}
            salaryYear={year}
            salaryMonth={month}
            advances={advances}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
