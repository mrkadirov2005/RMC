// To'lovlar -> Statistics: the chosen month only. Top: how much should come in, how much came in,
// the share collected and the share still unpaid. Below: how many teachers have been paid their
// salary for the month and how many are still waiting.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { paymentAPI, salaryAPI } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatMoney } from '@/utils/helpers';
import { monthKeyOf, monthRange } from '../../debts/debtMonths';
import { paymentMonthStats, salaryPaidStats, type SummaryTotals } from '../monthStats';

const Bar = ({ percent, tone }: { percent: number; tone: string }) => (
  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
    <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
  </div>
);

const Tile = ({ label, value, detail }: { label: string; value: string; detail?: string }) => (
  <div className="rounded-lg border bg-card p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
  </div>
);

export const PaymentsMonthStats = () => {
  const { t } = useLanguage();
  const [month, setMonth] = useState(monthKeyOf(new Date()));
  const [totals, setTotals] = useState<SummaryTotals | null>(null);
  const [salaryRows, setSalaryRows] = useState<Array<{ salary?: { is_paid?: boolean } | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const [year, monthNumber] = month.split('-').map(Number);
    Promise.all([
      paymentAPI.getStudentsSummary({ ...monthRange(month, month), limit: 1 }).then((res) => getApiPayload<{ totals: SummaryTotals }>(res)?.totals || null).catch(() => null),
      salaryAPI.getOverview({ year, month: monthNumber }).then((res) => {
        const payload = getApiPayload<any>(res);
        return Array.isArray(payload) ? payload : Array.isArray(payload?.teachers) ? payload.teachers : [];
      }).catch(() => []),
    ]).then(([nextTotals, nextSalaries]) => {
      if (cancelled) return;
      setTotals(nextTotals);
      setSalaryRows(nextSalaries);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month]);

  const stats = paymentMonthStats(totals);
  const salary = salaryPaidStats(salaryRows);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor="payment-stats-month" className="text-xs">{t('Month')}</Label>
          <Input id="payment-stats-month" type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} className="h-9 w-44" />
        </div>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      <section className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Tile label={t('Collected')} value={formatMoney(stats.collected)} detail={`${stats.paidStudents} / ${stats.students} ${t('students paid in full')}`} />
          <Tile label={t('Should come in this month')} value={formatMoney(stats.expected)} />
          <Tile label={t('Collected so far')} value={`${stats.collectedPercent}%`} detail={formatMoney(stats.collected)} />
          <Tile label={t('Still unpaid')} value={`${stats.unpaidPercent}%`} detail={formatMoney(stats.remaining)} />
        </div>
        <div className="space-y-1.5 rounded-lg border bg-card p-4">
          <div className="flex justify-between text-sm font-semibold">
            <span>{t('Payments closed this month')}</span>
            <span className="tabular-nums">{stats.collectedPercent}%</span>
          </div>
          <Bar percent={stats.collectedPercent} tone="bg-emerald-500" />
          <p className="text-xs text-muted-foreground">
            {t('Not paid at all')}: <b className="tabular-nums">{stats.unpaidStudents}</b> · {t('Part paid')}: <b className="tabular-nums">{stats.partialStudents}</b>
          </p>
        </div>
      </section>

      <section className="space-y-1.5 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
          <span>{t('Teachers paid their salary')}</span>
          <span className="tabular-nums">{salary.paid} / {salary.teachers} · {salary.paidPercent}%</span>
        </div>
        <Bar percent={salary.paidPercent} tone="bg-sky-500" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{t('Still waiting')}: <b className="tabular-nums">{salary.waiting}</b> ({salary.waitingPercent}%)</span>
          <Link to="/salary" className="font-semibold text-primary hover:underline">{t('View full Salary report')} →</Link>
        </div>
      </section>
    </div>
  );
};
