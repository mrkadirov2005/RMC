// Source file for the dashboard area in the crm feature.

import { ChevronLeft, ChevronRight, CreditCard, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardFinancialMonth, DashboardStatCard } from '../types';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '../../../../i18n/LanguageContext';

interface DashboardFinanceAnalysisProps {
  finance: DashboardFinancialMonth;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onMetricClick?: (card: DashboardStatCard) => void;
}

const financeMetrics: Array<{
  label: string;
  valueKey: keyof Pick<
    DashboardFinancialMonth,
    'expectedPayments' | 'paidPayments' | 'remainingPayments' | 'outstandingDebt'
  >;
  detailsType: NonNullable<DashboardStatCard['detailsType']>;
  labelClass: string;
  valueClass: string;
  shellClass: string;
}> = [
  {
    label: 'Expected',
    valueKey: 'expectedPayments',
    detailsType: 'expectedPayments',
    labelClass: 'text-white/80',
    valueClass: 'text-white',
    shellClass: 'border-cyan-500/20 bg-gradient-to-br from-cyan-500 via-cyan-600 to-sky-700 shadow-cyan-500/40',
  },
  {
    label: 'Collected',
    valueKey: 'paidPayments',
    detailsType: 'collectedPayments',
    labelClass: 'text-white/80',
    valueClass: 'text-white',
    shellClass: 'border-teal-500/20 bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-700 shadow-teal-500/40',
  },
  {
    label: 'Remaining',
    valueKey: 'remainingPayments',
    detailsType: 'remainingPayments',
    labelClass: 'text-white/80',
    valueClass: 'text-white',
    shellClass: 'border-amber-500/20 bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 shadow-amber-500/40',
  },
  {
    label: 'Outstanding debt',
    valueKey: 'outstandingDebt',
    detailsType: 'outstandingDebts',
    labelClass: 'text-white/80',
    valueClass: 'text-white',
    shellClass: 'border-red-500/20 bg-gradient-to-br from-red-500 via-red-600 to-rose-700 shadow-red-500/40',
  },
];

export const DashboardFinanceAnalysis = ({
  finance,
  onPreviousMonth,
  onNextMonth,
  onMetricClick,
}: DashboardFinanceAnalysisProps) => {
  const { t } = useLanguage();
  const localizedMonthLabel = finance.monthLabel.replace(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/,
    (_, month, year) => `${t(month)} ${year}`
  );
  const maxPaid = Math.max(...finance.buckets.map((bucket) => bucket.paid), 1);
  const unpaidRate = finance.expectedPayments > 0
    ? Math.min(Math.round((finance.remainingPayments / finance.expectedPayments) * 100), 100)
    : 0;

  return (
    <Card className="overflow-hidden border-cyan-100/80 bg-gradient-to-br from-white via-cyan-50/45 to-emerald-50/45 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm dark:hover:shadow-md">
      <CardHeader className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-400 dark:hidden" />
        <div>
          <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-card-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:h-auto dark:w-auto dark:bg-transparent dark:text-cyan-600">
              <CreditCard className="h-5 w-5" />
            </span>
            {t('Financial Analysis')}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('Expected tuition, collected payments, and remaining balance for the selected month.')}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-1 dark:border-transparent dark:bg-transparent dark:p-0">
          <Button type="button" size="icon" onClick={onPreviousMonth} aria-label={t('Previous month')} className="bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md hover:from-cyan-600 hover:to-sky-700 border-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-36 text-center text-sm font-semibold">{localizedMonthLabel}</div>
          <Button type="button" size="icon" onClick={onNextMonth} aria-label={t('Next month')} className="bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md hover:from-cyan-600 hover:to-sky-700 border-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {financeMetrics.map((metric) => (
            <button
              key={metric.detailsType}
              type="button"
              className={`rounded-lg border p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:shadow-none dark:hover:translate-y-0 dark:hover:shadow-none ${metric.shellClass}`}
              onClick={() =>
                onMetricClick?.({
                  label: t(metric.label),
                  value: formatMoney(Number(finance[metric.valueKey]) || 0),
                  icon: CreditCard,
                  accent: 'from-cyan-500 to-emerald-500',
                  detailsType: metric.detailsType,
                })
              }
            >
              <p className={`text-xs ${metric.labelClass}`}>{t(metric.label)}</p>
              <p className={`mt-1 text-xl font-bold ${metric.valueClass}`}>
                {formatMoney(Number(finance[metric.valueKey]) || 0)}
              </p>
              <p className="mt-1 text-[11px] font-medium text-white/70">{t('View details')}</p>
            </button>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{finance.collectionRate}% {t('collected')}</span>
            <span>{unpaidRate}% {t('remaining')}</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <div className="bg-emerald-500 transition-all" style={{ width: `${finance.collectionRate}%` }} />
            <div className="bg-rose-500 transition-all" style={{ width: `${unpaidRate}%` }} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="rounded-lg border border-cyan-100 bg-gradient-to-b from-white via-sky-50/70 to-emerald-50/45 p-4 shadow-sm dark:border-border dark:bg-none dark:shadow-none">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{t('Collections by month segment')}</p>
                <p className="text-xs text-muted-foreground">{t('Paid payments grouped by payment date.')}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="grid h-52 grid-cols-4 items-end gap-3">
              {finance.buckets.map((bucket) => {
                const height = Math.max((bucket.paid / maxPaid) * 100, bucket.paid > 0 ? 8 : 0);
                return (
                  <div key={bucket.label} className="flex h-full flex-col justify-end gap-2">
                    <div className="flex flex-1 items-end rounded-md bg-white/80 px-2 shadow-inner dark:bg-muted/50 dark:shadow-none">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-cyan-600 to-emerald-500 transition-all"
                        style={{ height: `${height}%` }}
                        title={formatMoney(bucket.paid)}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold">{bucket.label}</p>
                      <p className="text-[11px] text-muted-foreground">{formatMoney(bucket.paid)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 shadow-sm dark:border-border dark:bg-transparent dark:shadow-none">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{finance.paidStudents} {t('students paid')}</p>
                <p className="text-xs text-muted-foreground">{t('Covered their expected monthly amount')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-rose-100 bg-rose-50/70 p-3 shadow-sm dark:border-border dark:bg-transparent dark:shadow-none">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{finance.unpaidStudents} {t('students remaining')}</p>
                <p className="text-xs text-muted-foreground">{t('Still below expected payment')}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
