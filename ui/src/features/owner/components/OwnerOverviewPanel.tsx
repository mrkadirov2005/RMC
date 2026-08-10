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
    currentMonthPayments: number;
    previousMonthPayments: number;
    paidStudentsThisMonth: number;
    todayPayments: number;
    yesterdayPayments: number;
    paidStudentsToday: number;
    paidStudentsYesterday: number;
    attendancePresent: number;
    attendanceAbsent: number;
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
  return (
    <section className="space-y-3">
      {loading ? <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Loading overview...</CardContent></Card> : <OwnerStatisticsCarousel centerLabel={activeCenterLabel} centers={centers} students={students} teachers={teachers} groups={groups} admins={admins} payments={Number(summary?.totalPayments || 0)} currentMonthPayments={Number(summary?.currentMonthPayments || 0)} previousMonthPayments={Number(summary?.previousMonthPayments || 0)} paidStudentsThisMonth={Number(summary?.paidStudentsThisMonth || 0)} todayPayments={Number(summary?.todayPayments || 0)} yesterdayPayments={Number(summary?.yesterdayPayments || 0)} paidStudentsToday={Number(summary?.paidStudentsToday || 0)} paidStudentsYesterday={Number(summary?.paidStudentsYesterday || 0)} attendancePresent={Number(summary?.attendancePresent || 0)} attendanceAbsent={Number(summary?.attendanceAbsent || 0)} />}
    </section>
  );
};
