// Source file for the dashboard area in the crm feature.

import { CreditCard, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStats } from '../types';
import { formatMoney } from '@/utils/helpers';

interface DashboardPaymentOverviewProps {
  stats: DashboardStats;
}

// Renders the dashboard payment overview module.
export const DashboardPaymentOverview = ({ stats }: DashboardPaymentOverviewProps) => {
  const unpaidRate = stats.expectedPaymentsThisMonth > 0
    ? Math.min(Math.round((stats.remainingPaymentsThisMonth / stats.expectedPaymentsThisMonth) * 100), 100)
    : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Student Payments</CardTitle>
          <p className="text-xs text-muted-foreground">This month&apos;s expected vs collected tuition</p>
        </div>
        <CreditCard className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Should pay</p>
            <p className="mt-1 text-xl font-bold">{formatMoney(stats.expectedPaymentsThisMonth)}</p>
          </div>
          <div className="rounded-lg border bg-emerald-500/5 p-3">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Paid</p>
            <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatMoney(stats.paymentsThisMonth)}
            </p>
          </div>
          <div className="rounded-lg border bg-rose-500/5 p-3">
            <p className="text-xs text-rose-700 dark:text-rose-300">Still unpaid</p>
            <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300">
              {formatMoney(stats.remainingPaymentsThisMonth)}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{stats.paymentCollectionRate}% collected</span>
            <span>{unpaidRate}% remaining</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${stats.paymentCollectionRate}%` }}
            />
            <div
              className="bg-rose-500 transition-all"
              style={{ width: `${unpaidRate}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{stats.paidStudentsThisMonth} students paid</p>
              <p className="text-xs text-muted-foreground">Covered their expected monthly payment</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-rose-500/10 text-rose-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{stats.unpaidStudentsThisMonth} students remaining</p>
              <p className="text-xs text-muted-foreground">Still below their expected monthly payment</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
