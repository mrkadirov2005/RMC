// Statistics view for the owner feature.

import { useMemo, useState } from 'react';
import { BarChart3, BadgeCheck, BookMarked, CalendarDays, UserCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type {
  OwnerManagerStatisticsCollections,
  OwnerManagerStatisticsSection,
  OwnerManagerStatisticsSummary,
} from '../types';
import { buildOwnerPaymentMonthStats, buildOwnerTeacherEarnings } from '../utils';
import { PieChart } from '@/shared/components/PieChart';

interface Props {
  summary: OwnerManagerStatisticsSummary;
  collections: OwnerManagerStatisticsCollections;
  loading: boolean;
}

const statCards = [
  { key: 'total', label: 'Total Students', icon: Users, tone: 'from-indigo-500 to-sky-500' },
  { key: 'active', label: 'Active Students', icon: BadgeCheck, tone: 'from-emerald-500 to-teal-500' },
  { key: 'class', label: 'Assigned to Classes', icon: BookMarked, tone: 'from-amber-500 to-orange-500' },
  { key: 'teacher', label: 'Assigned to Teachers', icon: UserCheck, tone: 'from-fuchsia-500 to-pink-500' },
] as const;

const sectionTabs: { value: OwnerManagerStatisticsSection; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'payments', label: 'Payments' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'statistics', label: 'Statistics' },
];

const getMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map((value) => Number(value));
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

// Renders the owner statistics module.
export const OwnerManagerStatistics = ({ summary, collections, loading }: Props) => {
  const [activeSection, setActiveSection] = useState<OwnerManagerStatisticsSection>('overview');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedSchoolLabel, setSelectedSchoolLabel] = useState<string | null>(null);

  const total = Math.max(summary.totalStudents, 0);
  const monthLabel = useMemo(() => getMonthLabel(selectedMonth), [selectedMonth]);
  const paymentStats = useMemo(
    () => buildOwnerPaymentMonthStats(collections.students, collections.payments, selectedMonth),
    [collections.payments, collections.students, selectedMonth]
  );
  const teacherEarnings = useMemo(
    () =>
      buildOwnerTeacherEarnings(
        collections.students,
        collections.teachers,
        collections.classes,
        collections.payments,
        selectedMonth
      ),
    [collections.classes, collections.payments, collections.students, collections.teachers, selectedMonth]
  );
  const totalEarned = useMemo(
    () => teacherEarnings.reduce((sum, row) => sum + row.earnedAmount, 0),
    [teacherEarnings]
  );

  const schoolDistribution = useMemo(() => {
    const palette = [
      '#38bdf8', // sky-400
      '#22c55e', // green-500
      '#f97316', // orange-500
      '#a78bfa', // purple-400
      '#f43f5e', // rose-500
      '#facc15', // yellow-400
      '#60a5fa', // blue-400
      '#34d399', // emerald-400
      '#fb7185', // rose-400
    ];

    const counts = new Map<string, number>();
    collections.students.forEach((student) => {
      const raw = String(student?.school_name || '').trim();
      const key = raw.length > 0 ? raw : 'Unknown';
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const sorted = Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const topSchools = sorted.filter((row) => row.label !== 'Unknown').slice(0, 8);
    const remainingSchools = sorted.filter((row) => row.label !== 'Unknown').slice(8);
    const remaining = remainingSchools.reduce((sum, row) => sum + row.count, 0);
    const otherSchoolLabels = new Set(remainingSchools.map((row) => row.label));

    const top = [...topSchools];
    const unknownCount = counts.get('Unknown') || 0;
    if (unknownCount > 0) {
      top.unshift({ label: 'Unknown', count: unknownCount });
    }
    if (remaining > 0) {
      top.push({ label: 'Other', count: remaining });
    }

    const slices = top
      .filter((row) => row.count > 0)
      .map((row, index) => ({
        label: row.label,
        value: row.count,
        color: palette[index % palette.length],
      }));

    return {
      slices,
      otherSchoolLabels,
    };
  }, [collections.students]);

  const selectedSchoolStudents = useMemo(() => {
    if (!selectedSchoolLabel) return [];

    return collections.students.filter((student) => {
      const raw = String(student?.school_name || '').trim();
      const label = raw.length > 0 ? raw : 'Unknown';

      if (selectedSchoolLabel === 'Other') {
        return raw.length > 0 && schoolDistribution.otherSchoolLabels.has(label);
      }
      return label === selectedSchoolLabel;
    });
  }, [collections.students, schoolDistribution.otherSchoolLabels, selectedSchoolLabel]);

  const genderRows = [
    { label: 'Male', count: summary.maleStudents, className: 'bg-sky-500/15 text-sky-700 border-sky-400/40 dark:text-sky-200 dark:border-sky-400/20' },
    { label: 'Female', count: summary.femaleStudents, className: 'bg-rose-500/15 text-rose-700 border-rose-400/40 dark:text-rose-200 dark:border-rose-400/20' },
    { label: 'Other', count: summary.otherStudents, className: 'bg-amber-500/15 text-amber-700 border-amber-400/40 dark:text-amber-200 dark:border-amber-400/20' },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/60 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/[0.03] dark:shadow-black/10">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-300" />
            <CardTitle className="text-xl text-slate-900 dark:text-white">Total Student Statistics</CardTitle>
          </div>
          <CardDescription className="text-slate-500 dark:text-white/60">
            Combined numbers from every center, shown only in the owner panel.
          </CardDescription>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-950/40">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/70">
              <CalendarDays className="h-4 w-4 text-amber-300" />
              Selected month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30"
            />
            <span className="text-sm text-slate-500 dark:text-white/50">{monthLabel}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as OwnerManagerStatisticsSection)}>
            <TabsList className="h-auto w-max gap-1 bg-slate-100 p-1 text-slate-600 dark:bg-white/5 dark:text-white/70">
              {sectionTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="px-4 py-2 data-[state=active]:bg-amber-400 data-[state=active]:text-slate-950"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  const value =
                    card.key === 'total'
                      ? summary.totalStudents
                      : card.key === 'active'
                        ? summary.activeStudents
                        : card.key === 'class'
                          ? summary.assignedToClass
                          : summary.assignedToTeacher;

                  return (
                    <div
                      key={card.key}
                      className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-slate-950/40 dark:shadow-black/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">{card.label}</p>
                          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                            {loading ? '...' : value.toLocaleString()}
                          </p>
                        </div>
                        <div className={cn('rounded-2xl bg-gradient-to-br p-3 text-white', card.tone)}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">Gender Breakdown</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-white/55">
                      How the total student body is distributed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loading ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">
                        Loading student demographics...
                      </div>
                    ) : (
                      genderRows.map((row) => {
                        const percent = total > 0 ? Math.round((row.count / total) * 100) : 0;
                        return (
                          <div key={row.label} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn('font-medium', row.className)}>
                                  {row.label}
                                </Badge>
                                <span className="text-slate-600 dark:text-white/70">{row.count.toLocaleString()} students</span>
                              </div>
                              <span className="text-slate-500 dark:text-white/45">{percent}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/5">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  row.label === 'Male' ? 'bg-sky-400' : row.label === 'Female' ? 'bg-rose-400' : 'bg-amber-400'
                                )}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">Center Breakdown</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-white/55">
                      Top centers by total student count.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto p-0">
                    {loading ? (
                      <div className="px-6 pb-6 pt-2 text-sm text-slate-500 dark:text-white/55">Loading combined student data...</div>
                    ) : summary.centerBreakdown.length === 0 ? (
                      <div className="px-6 pb-6 text-sm text-slate-500 dark:text-white/55">No students found yet.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200/70 bg-slate-100/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.03]">
                            <TableHead className="text-slate-600 dark:text-white/70">Center</TableHead>
                            <TableHead className="text-right text-slate-600 dark:text-white/70">Students</TableHead>
                            <TableHead className="text-right text-slate-600 dark:text-white/70">Active</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.centerBreakdown.slice(0, 6).map((center) => (
                            <TableRow key={center.centerId} className="border-slate-200/60 dark:border-white/5">
                              <TableCell className="text-slate-800 dark:text-white/85">
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium">{center.centerName}</span>
                                  <span className="text-xs text-slate-500 dark:text-white/45">Center #{center.centerId}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-slate-700 dark:text-white/80">{center.totalStudents.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-slate-700 dark:text-white/80">{center.activeStudents.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-slate-200/70 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  {summary.inactiveStudents.toLocaleString()} inactive students
                </Badge>
                <Badge variant="outline" className="border-slate-200/70 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  {summary.activeStudents.toLocaleString()} active students
                </Badge>
                <Badge variant="outline" className="border-slate-200/70 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  {summary.totalStudents.toLocaleString()} total students
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">Students total</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{paymentStats.totalStudents.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">Paid students</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-300">{paymentStats.paidStudents.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">Unpaid students</p>
                  <p className="mt-2 text-3xl font-semibold text-rose-600 dark:text-rose-300">{paymentStats.unpaidStudents.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">Paid share</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{paymentStats.paidPercent}%</p>
                </div>
              </div>

              <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">Paid vs Unpaid Students</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-white/55">
                    Student count for {monthLabel}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">
                      Loading payment statistics...
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-white/70">
                        <span>{paymentStats.paidStudents} paid</span>
                        <span>{paymentStats.unpaidStudents} unpaid</span>
                      </div>
                      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200/70 shadow-inner dark:bg-white/5">
                        <div className="flex h-full w-full">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${paymentStats.paidPercent}%` }}
                          />
                          <div
                            className="h-full bg-rose-500 transition-all duration-300"
                            style={{ width: `${paymentStats.unpaidPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-200/70">Paid students</p>
                          <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{paymentStats.paidStudents}</p>
                        </div>
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-rose-700 dark:text-rose-200/70">Unpaid students</p>
                          <p className="mt-2 text-2xl font-semibold text-rose-800 dark:text-rose-100">{paymentStats.unpaidStudents}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teachers" className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">Teachers</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{teacherEarnings.length.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">Earned total</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-300">${totalEarned.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">Top teacher</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    {teacherEarnings[0]?.teacherName || 'No data'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">Selected month</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{monthLabel}</p>
                </div>
              </div>

              <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">Teacher Earnings</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-white/55">
                    Earnings for {monthLabel}, sorted from highest to lowest.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  {loading ? (
                    <div className="px-6 pb-6 pt-2 text-sm text-slate-500 dark:text-white/55">Loading teacher earnings...</div>
                  ) : teacherEarnings.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-slate-500 dark:text-white/55">No teachers found yet.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200/70 bg-slate-100/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.03]">
                          <TableHead className="text-slate-600 dark:text-white/70">Teacher</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">Classes</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">Students</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">Paid</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">Unpaid</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">Earnings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teacherEarnings.map((row, index) => (
                          <TableRow key={row.teacherId} className="border-slate-200/60 dark:border-white/5">
                            <TableCell className="text-slate-800 dark:text-white/85">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 dark:text-white/40">{index + 1}.</span>
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium">{row.teacherName}</span>
                                  <span className="text-xs text-slate-500 dark:text-white/45">Teacher #{row.teacherId}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-slate-700 dark:text-white/80">{row.classCount.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-slate-700 dark:text-white/80">{row.totalStudents.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-emerald-600 dark:text-emerald-300">{row.paidStudents.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-rose-600 dark:text-rose-300">{row.unpaidStudents.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                              ${row.earnedAmount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics" className="mt-6 space-y-6">
              <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">Students by school</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-white/55">
                    Distribution based on the optional student school fields.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-[260px_1fr]">
                  <div className="flex items-center justify-center">
                    <PieChart data={schoolDistribution.slices} />
                  </div>
                  <div className="space-y-3">
                    {loading ? (
                      <div className="text-sm text-slate-500 dark:text-white/55">Loading school breakdown...</div>
                    ) : schoolDistribution.slices.length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-white/55">
                        No students found yet. Add optional `school_name` on student records to populate this chart.
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {schoolDistribution.slices.map((slice) => (
                          <button
                            key={slice.label}
                            type="button"
                            onClick={() => setSelectedSchoolLabel(slice.label)}
                            className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-amber-400/40 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-400/25 dark:hover:bg-white/[0.06]"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="h-3.5 w-3.5 rounded-sm"
                                style={{ backgroundColor: slice.color }}
                                aria-hidden="true"
                              />
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{slice.label}</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-white/80">{slice.value.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Dialog
                open={selectedSchoolLabel != null}
                onOpenChange={(open) => {
                  if (!open) setSelectedSchoolLabel(null);
                }}
              >
                <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-background text-foreground sm:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-slate-900 dark:text-white">
                      {selectedSchoolLabel === 'Other'
                        ? 'Students from other schools'
                        : selectedSchoolLabel === 'Unknown'
                          ? 'Students with no school set'
                          : `Students from ${selectedSchoolLabel}`}
                    </DialogTitle>
                  </DialogHeader>

                  {loading ? (
                    <div className="text-sm text-slate-500 dark:text-white/55">Loading students...</div>
                  ) : selectedSchoolStudents.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-white/55">No students found for this selection.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-white/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200/70 bg-slate-100/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.03]">
                            <TableHead className="text-slate-600 dark:text-white/70">Student</TableHead>
                            <TableHead className="text-slate-600 dark:text-white/70">Enrollment</TableHead>
                            <TableHead className="text-slate-600 dark:text-white/70">Center</TableHead>
                            <TableHead className="text-slate-600 dark:text-white/70">Class</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSchoolStudents.map((student: any) => {
                            const studentId = Number(student?.student_id || student?.id || 0);
                            const name =
                              [student?.first_name, student?.last_name].filter(Boolean).join(' ').trim() ||
                              (studentId ? `Student #${studentId}` : 'Student');
                            return (
                              <TableRow key={studentId || `${student?.enrollment_number || name}`} className="border-slate-200/60 dark:border-white/5">
                                <TableCell className="text-slate-800 dark:text-white/85">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-medium">{name}</span>
                                    {studentId ? <span className="text-xs text-slate-500 dark:text-white/45">#{studentId}</span> : null}
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-600 dark:text-white/75">{student?.enrollment_number || '-'}</TableCell>
                                <TableCell className="text-slate-600 dark:text-white/75">{student?.center_id ? `#${student.center_id}` : '-'}</TableCell>
                                <TableCell className="text-slate-600 dark:text-white/75">{student?.class_id ? `#${student.class_id}` : '-'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
