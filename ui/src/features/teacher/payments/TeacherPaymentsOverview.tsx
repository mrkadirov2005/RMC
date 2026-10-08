// Teacher's own payments page: how much each group has paid this month, what is still owed,
// and what the teacher earns from it at their share percentage.

import { useState } from 'react';
import { Calendar, ChevronDown, Loader2, Percent, PiggyBank, TrendingUp, Users, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { getCenterMonthKey } from '@/shared/billingPeriod';
import { useMyGroupPayments } from './useMyGroupPayments';
import { GroupPaidBadge, PaymentStateBadge } from './PaymentStateBadge';
import type { GroupPayment } from './types';

const progressTone = (percent: number) =>
  percent >= 90 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-rose-500';

const ProgressBar = ({ percent, className }: { percent: number; className?: string }) => (
  <div className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}>
    <div className={cn('h-full rounded-full transition-all', progressTone(percent))} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
  </div>
);

const StatTile = ({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) => (
  <div className="rounded-xl border bg-card p-3 shadow-sm">
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', tone)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      {label}
    </div>
    <div className="mt-2 text-lg font-black tabular-nums">{value}</div>
    {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
  </div>
);

const GroupCard = ({ group, sharePercent }: { group: GroupPayment; sharePercent: number }) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <button type="button" onClick={() => setOpen((value) => !value)} className="w-full space-y-3 p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-bold">{group.class_name}</div>
            <div className="text-xs text-muted-foreground">
              {t('{fee} per month', { fee: formatMoney(group.monthly_fee) })}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <GroupPaidBadge paid={group.paid_students} total={group.total_students} />
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">{t('{percent}% collected', { percent: String(group.collected_percent) })}</span>
            <span className="text-muted-foreground">{formatMoney(group.collected)} / {formatMoney(group.expected)}</span>
          </div>
          <ProgressBar percent={group.collected_percent} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">{t('Collected')}</div>
            <div className="font-bold text-emerald-700 dark:text-emerald-400">{formatMoney(group.collected)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t('Remaining')}</div>
            <div className="font-bold text-rose-600 dark:text-rose-400">{formatMoney(group.remaining)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t('My share ({percent}%)', { percent: String(sharePercent) })}</div>
            <div className="font-bold">{formatMoney(group.teacher_share)}</div>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t">
          {group.students.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">{t('No students')}</div>
          ) : (
            <ul className="divide-y">
              {group.students.map((student) => (
                <li key={student.student_id} className={cn('flex items-center justify-between gap-3 px-4 py-2 text-sm', student.transferred && 'bg-rose-50/70 dark:bg-rose-950/30')}>
                  <span className={cn('min-w-0 truncate font-medium', student.transferred && 'text-rose-700 dark:text-rose-300')}>
                    {student.name}
                    {student.transferred && <span className="ml-1.5 text-xs font-semibold">· {t('Transferred')}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {student.remaining > 0 && (
                      <span className="text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                        {t('{amount} left', { amount: formatMoney(student.remaining) })}
                      </span>
                    )}
                    <PaymentStateBadge state={student.state} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default function TeacherPaymentsOverview() {
  const { t } = useLanguage();
  const [month, setMonth] = useState(() => getCenterMonthKey());
  const { data, loading, failed } = useMyGroupPayments(month);
  const totals = data?.totals;
  const sharePercent = data?.salary_percentage ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Wallet className="h-4 w-4 text-indigo-500" />
          {t('Group payments')}
        </h3>
        <div className="relative">
          <Input
            type="month"
            value={month}
            onChange={(event) => event.target.value && setMonth(event.target.value)}
            className="w-[180px] pl-9"
            aria-label={t('Month')}
          />
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : failed || !data || !totals ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{t('Could not load payment statistics.')}</div>
      ) : (
        <>
          <div className="space-y-3 rounded-xl border bg-gradient-to-br from-indigo-50/60 via-card to-emerald-50/50 p-4 shadow-sm dark:from-indigo-950/30 dark:to-emerald-950/20">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('Collected this month')}</div>
                <div className="text-3xl font-black tabular-nums">{totals.collected_percent}%</div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {formatMoney(totals.collected)} / {formatMoney(totals.expected)}
              </div>
            </div>
            <ProgressBar percent={totals.collected_percent} className="h-3" />
            <div className="flex flex-wrap gap-2 text-xs">
              <PaymentStateBadge state="paid" />
              <span className="tabular-nums">{totals.paid_students}</span>
              <PaymentStateBadge state="partial" className="ml-2" />
              <span className="tabular-nums">{totals.partial_students}</span>
              <PaymentStateBadge state="unpaid" className="ml-2" />
              <span className="tabular-nums">{totals.unpaid_students}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={TrendingUp}
              label={t('Collected')}
              value={formatMoney(totals.collected)}
              hint={t('{count} students', { count: String(totals.total_students) })}
              tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            />
            <StatTile
              icon={PiggyBank}
              label={t('Remaining')}
              value={formatMoney(totals.remaining)}
              hint={t('{count} students have not paid in full', { count: String(totals.partial_students + totals.unpaid_students) })}
              tone="bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            />
            <StatTile
              icon={Percent}
              label={t('My salary so far')}
              value={formatMoney(totals.current_salary)}
              hint={
                sharePercent > 0
                  ? t('{percent}% of collected payments', { percent: String(sharePercent) })
                  : t('No salary percentage set')
              }
              tone="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            />
            <StatTile
              icon={Users}
              label={t('If everyone pays')}
              value={formatMoney(totals.potential_salary)}
              hint={
                data.salary_record
                  ? t('Recorded salary: {amount} ({status})', {
                      amount: formatMoney(data.salary_record.amount),
                      status: t(data.salary_record.is_paid ? 'Paid' : 'Not yet paid'),
                    })
                  : undefined
              }
              tone="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            />
          </div>

          {data.groups.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('No classes assigned yet')}</div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {data.groups.map((group) => (
                <GroupCard key={group.class_id} group={group} sharePercent={sharePercent} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
