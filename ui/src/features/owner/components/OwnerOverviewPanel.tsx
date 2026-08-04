import { Banknote, BookOpen, Building2, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatMoney } from '@/utils/helpers';
import type { OwnerOverviewCollections } from '../types';

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

export const OwnerOverviewPanel = ({ collections, summary, loading }: Props) => {
  const students = Number(summary?.totalStudents || 0);
  const teachers = Number(summary?.totalTeachers || 0);
  const groups = Number(summary?.totalClasses || 0);
  const centers = collections.centers.length;
  const admins = collections.superusers.length;
  const collected = Number(summary?.collected || 0);
  const studentsPerTeacher = teachers ? Math.round(students / teachers) : 0;
  const studentsPerGroup = groups ? Math.round(students / groups) : 0;

  const metrics = [
    { label: 'Centers', value: centers.toLocaleString(), icon: Building2 },
    { label: 'Students', value: students.toLocaleString(), icon: GraduationCap },
    { label: 'Teachers', value: teachers.toLocaleString(), icon: Users },
    { label: 'Groups', value: groups.toLocaleString(), icon: BookOpen },
    { label: 'Admins', value: admins.toLocaleString(), icon: ShieldCheck },
    { label: 'Collected', value: formatMoney(collected), icon: Banknote },
  ];

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 truncate text-xl font-bold text-slate-950 dark:text-white">
                {loading ? '—' : value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

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
