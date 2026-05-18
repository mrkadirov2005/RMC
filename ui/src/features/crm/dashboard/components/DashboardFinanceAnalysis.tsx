// Source file for the dashboard area in the crm feature.

import { ChevronLeft, ChevronRight, CreditCard, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardFinancialMonth } from '../types';

interface DashboardFinanceAnalysisProps {
  finance: DashboardFinancialMonth;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

const formatMoney = (value: number) => `$${value.toLocaleString()}`;

export const DashboardFinanceAnalysis = ({
  finance,
  onPreviousMonth,
  onNextMonth,
}: DashboardFinanceAnalysisProps) => {
  const maxPaid = Math.max(...finance.buckets.map((bucket) => bucket.paid), 1);
  const unpaidRate = finance.expectedPayments > 0
    ? Math.min(Math.round((finance.remainingPayments / finance.expectedPayments) * 100), 100)
    : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-cyan-600" />
            Financial Analysis
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Expected tuition, collected payments, and remaining balance for the selected month.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={onPreviousMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-36 text-center text-sm font-semibold">{finance.monthLabel}</div>
          <Button type="button" variant="outline" size="icon" onClick={onNextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Expected</p>
            <p className="mt-1 text-xl font-bold">{formatMoney(finance.expectedPayments)}</p>
          </div>
          <div className="rounded-lg border bg-emerald-500/5 p-3">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Collected</p>
            <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatMoney(finance.paidPayments)}
            </p>
          </div>
          <div className="rounded-lg border bg-rose-500/5 p-3">
            <p className="text-xs text-rose-700 dark:text-rose-300">Remaining</p>
            <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300">
              {formatMoney(finance.remainingPayments)}
            </p>
          </div>
          <div className="rounded-lg border bg-amber-500/5 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">Outstanding debt</p>
            <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">
              {formatMoney(finance.outstandingDebt)}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{finance.collectionRate}% collected</span>
            <span>{unpaidRate}% remaining</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <div className="bg-emerald-500 transition-all" style={{ width: `${finance.collectionRate}%` }} />
            <div className="bg-rose-500 transition-all" style={{ width: `${unpaidRate}%` }} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="rounded-lg border p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Collections by month segment</p>
                <p className="text-xs text-muted-foreground">Paid payments grouped by payment date.</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="grid h-52 grid-cols-4 items-end gap-3">
              {finance.buckets.map((bucket) => {
                const height = Math.max((bucket.paid / maxPaid) * 100, bucket.paid > 0 ? 8 : 0);
                return (
                  <div key={bucket.label} className="flex h-full flex-col justify-end gap-2">
                    <div className="flex flex-1 items-end rounded-md bg-muted/50 px-2">
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
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{finance.paidStudents} students paid</p>
                <p className="text-xs text-muted-foreground">Covered their expected monthly amount</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-rose-500/10 text-rose-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{finance.unpaidStudents} students remaining</p>
                <p className="text-xs text-muted-foreground">Still below expected payment</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
