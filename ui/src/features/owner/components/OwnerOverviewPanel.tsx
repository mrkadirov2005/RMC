import { Card, CardContent } from '@/components/ui/card';
import type { OwnerOverviewCollections } from '../types';
import { OwnerStatisticsCarousel } from './OwnerStatisticsCarousel';

interface Props {
  collections: OwnerOverviewCollections;
  summary?: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalPayments: number;
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

  return (
    <section className="space-y-3">
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
