import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { OwnerOverviewCollections } from '../types';
import { OwnerStatisticsCarousel } from './OwnerStatisticsCarousel';

interface Props {
  collections: OwnerOverviewCollections;
  summary?: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalPayments: number;
    currentMonthPayments: number;
    previousMonthPayments: number;
    paidStudentsThisMonth: number;
    collected: number;
  };
  activeCenterLabel: string;
  loading: boolean;
}

export const OwnerOverviewPanel = ({ collections, summary, activeCenterLabel, loading }: Props) => {
  const students = Number(summary?.totalStudents || 0);
  const teachers = Number(summary?.totalTeachers || 0);
  const groups = Number(summary?.totalClasses || 0);
  const centers = summary ? 1 : 0;
  const admins = collections.superusers.length;
  const studentsPerTeacher = teachers ? Math.round(students / teachers) : 0;
  const studentsPerGroup = groups ? Math.round(students / groups) : 0;
  const currentMonthPayments = Number(summary?.currentMonthPayments || 0);
  const previousMonthPayments = Number(summary?.previousMonthPayments || 0);
  const paymentPercentage = students
    ? Math.min(100, Math.round((Number(summary?.paidStudentsThisMonth || 0) / students) * 100))
    : 0;
  const paymentChange = currentMonthPayments - previousMonthPayments;

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Overall students" value={students.toLocaleString()} detail={activeCenterLabel} />
        <Metric label="Overall teachers" value={teachers.toLocaleString()} detail={activeCenterLabel} />
        <Metric
          label="Payments this month"
          value={currentMonthPayments.toLocaleString()}
          detail={`${Math.abs(paymentChange).toLocaleString()} ${paymentChange > 0 ? 'more' : paymentChange < 0 ? 'fewer' : 'change'} than last month`}
          trend={paymentChange}
        />
        <Metric label="Total payment percentage" value={`${paymentPercentage}%`} detail="Students paid this month" />
      </div>

      {loading ? <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Loading overview...</CardContent></Card> : <OwnerStatisticsCarousel centerLabel={activeCenterLabel} centers={centers} students={students} teachers={teachers} groups={groups} admins={admins} payments={Number(summary?.totalPayments || 0)} />}

      <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="grid divide-y p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Ratio label="Students per teacher" value={studentsPerTeacher} />
          <Ratio label="Students per group" value={studentsPerGroup} />
          <Ratio label="Payments recorded" value={Number(summary?.totalPayments || 0)} />
        </CardContent>
      </Card>
    </section>
  );
};

const Ratio = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between px-4 py-3">
    <span className="text-sm text-muted-foreground">{label}</span>
    <strong className="text-lg text-slate-950 dark:text-white">{value.toLocaleString()}</strong>
  </div>
);

const Metric = ({ label, value, detail, trend }: { label: string; value: string; detail: string; trend?: number }) => {
  const TrendIcon = trend === undefined || trend === 0 ? Minus : trend > 0 ? ArrowUpRight : ArrowDownRight;
  const trendTone = trend === undefined || trend === 0 ? 'text-slate-400' : trend > 0 ? 'text-emerald-600' : 'text-rose-600';

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          {trend !== undefined && <TrendIcon className={`h-5 w-5 ${trendTone}`} aria-label={trend > 0 ? 'Increasing' : trend < 0 ? 'Decreasing' : 'No change'} />}
        </div>
      </CardContent>
    </Card>
  );
};
