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
    shell: 'border-0 bg-sky-600 text-white shadow-sm',
    iconShell: 'bg-white/20 text-white',
  },
  {
    key: 'payments',
    icon: DollarSign,
    shell: 'border-0 bg-emerald-600 text-white shadow-sm',
    iconShell: 'bg-white/20 text-white',
  },
  {
    key: 'assignments',
    icon: CheckCircle,
    shell: 'border-0 bg-amber-500 text-white shadow-sm',
    iconShell: 'bg-white/20 text-white',
  },
  {
    key: 'grades',
    icon: Star,
    shell: 'border-0 bg-fuchsia-600 text-white shadow-sm',
    iconShell: 'bg-white/20 text-white',
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {data.map((item, index) => {
        const config = statCards[index];
        const Icon = config.icon;
        return (
          <Card key={config.key} className={cn('rounded-lg shadow-sm', config.shell)}>
            <CardContent className="flex min-h-[74px] items-center gap-2.5 p-3">
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', config.iconShell)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/80">{item.label}</p>
                <p className="truncate text-lg font-bold text-white">{item.value}</p>
                <p className="truncate text-xs text-white/75">{item.sub}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
