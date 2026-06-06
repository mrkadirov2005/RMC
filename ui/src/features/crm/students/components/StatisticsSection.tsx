// Source file for the students area in the crm feature.

import { Calendar, DollarSign, CheckCircle, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';

interface StatisticsSectionProps {
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    late: number;
  };
  paymentStats: {
    total: number;
    completed: number;
    pending: number;
    totalAmount: number;
  };
  assignmentStats: {
    total: number;
    submitted: number;
    pending: number;
  };
  gradeAverage: string;
}

const statCards = [
  {
    key: 'attendance',
    icon: Calendar,
    shell: 'border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 shadow-[0_16px_42px_-34px_rgba(14,165,233,0.9)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm',
    iconShell: 'bg-gradient-to-br from-sky-500 to-cyan-500 text-white dark:bg-sky-500 dark:bg-none',
  },
  {
    key: 'payments',
    icon: DollarSign,
    shell: 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-[0_16px_42px_-34px_rgba(16,185,129,0.9)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm',
    iconShell: 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white dark:bg-emerald-500 dark:bg-none',
  },
  {
    key: 'assignments',
    icon: CheckCircle,
    shell: 'border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[0_16px_42px_-34px_rgba(245,158,11,0.9)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm',
    iconShell: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white dark:bg-amber-500 dark:bg-none',
  },
  {
    key: 'grades',
    icon: Star,
    shell: 'border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 shadow-[0_16px_42px_-34px_rgba(99,102,241,0.9)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm',
    iconShell: 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white dark:bg-indigo-500 dark:bg-none',
  },
] as const;

// Renders the statistics section module.
export const StatisticsSection = ({
  attendanceStats,
  paymentStats,
  assignmentStats,
  gradeAverage,
}: StatisticsSectionProps) => {
  const data = [
    {
      label: 'Attendance',
      value: `${attendanceStats.present}/${attendanceStats.total}`,
      sub: 'Present out of Total',
    },
    {
      label: 'Payments',
      value: formatMoney(paymentStats.totalAmount),
      sub: `${paymentStats.completed} completed`,
    },
    {
      label: 'Assignments',
      value: `${assignmentStats.submitted}/${assignmentStats.total}`,
      sub: 'Submitted',
    },
    {
      label: 'Average Grade',
      value: gradeAverage === 'N/A' ? 'N/A' : `${gradeAverage}%`,
      sub: 'Overall',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {data.map((item, index) => {
        const config = statCards[index];
        const Icon = config.icon;
        return (
          <Card key={config.key} className={cn('rounded-lg shadow-sm', config.shell)}>
            <CardContent className="flex min-h-[116px] items-center gap-4 p-5">
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', config.iconShell)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                <p className="truncate text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
