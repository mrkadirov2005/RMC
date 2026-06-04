// Dashboard stat cards and mini analytics for each entity tab.

import { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  KeyRound,
  Pencil,
  Shield,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
  UserX,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getOwnerManagerRowId } from '../utils';
import type { LucideIcon } from 'lucide-react';
import type { OwnerManagerTabType, OwnerManagerStatisticsCollections } from '../types';
import { buildOwnerTeacherEarnings } from '../utils';

interface OwnerManagerTabStatsProps {
  activeTab: OwnerManagerTabType;
  data: any[];
  loading: boolean;
  crossCounts: { students: number; teachers: number; classes: number };
  collections: OwnerManagerStatisticsCollections;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  onResetPassword: (item: any) => void;
}

interface StatCard {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: string;
}

interface BarItem {
  label: string;
  count: number;
  color: string;
  badgeClass: string;
}

const countByStatus = (data: any[], status: string) =>
  data.filter((item) => String(item?.status || '').toLowerCase() === status).length;

const countByGender = (data: any[], gender: string) =>
  data.filter((item) => String(item?.gender || '').toLowerCase() === gender).length;

// --- Stat card builders ---

const buildCenterStats = (data: any[], cross: { students: number; teachers: number; classes: number }): StatCard[] => [
  { label: 'Total Centers', value: data.length, icon: Building2, tone: 'from-indigo-500 to-sky-500' },
  { label: 'Total Students', value: cross.students, icon: GraduationCap, tone: 'from-emerald-500 to-teal-500' },
  { label: 'Total Teachers', value: cross.teachers, icon: Users, tone: 'from-fuchsia-500 to-pink-500' },
  { label: 'Total Classes', value: cross.classes, icon: BookOpen, tone: 'from-amber-500 to-orange-500' },
];

const buildOwnerStats = (data: any[]): StatCard[] => [
  { label: 'Total Owners', value: data.length, icon: Shield, tone: 'from-indigo-500 to-sky-500' },
  { label: 'Active', value: countByStatus(data, 'active'), icon: CheckCircle2, tone: 'from-emerald-500 to-teal-500' },
  { label: 'Inactive', value: countByStatus(data, 'inactive'), icon: XCircle, tone: 'from-slate-400 to-slate-500' },
];

const buildSuperuserStats = (data: any[]): StatCard[] => {
  const fullAccess = data.filter((item) => {
    const perms = Array.isArray(item?.permissions) ? item.permissions : [];
    return perms.length >= 10;
  }).length;
  return [
    { label: 'Total Admins', value: data.length, icon: ShieldCheck, tone: 'from-indigo-500 to-sky-500' },
    { label: 'Active', value: countByStatus(data, 'active'), icon: CheckCircle2, tone: 'from-emerald-500 to-teal-500' },
    { label: 'Full Access', value: fullAccess, icon: KeyRound, tone: 'from-fuchsia-500 to-pink-500' },
    { label: 'Suspended', value: countByStatus(data, 'suspended'), icon: UserX, tone: 'from-amber-500 to-orange-500' },
  ];
};

const buildTeacherStats = (data: any[]): StatCard[] => {
  const specializations = new Set(
    data.map((item) => String(item?.specialization || '').trim().toLowerCase()).filter(Boolean)
  ).size;
  return [
    { label: 'Total Teachers', value: data.length, icon: Users, tone: 'from-indigo-500 to-sky-500' },
    { label: 'Active', value: countByStatus(data, 'active'), icon: CheckCircle2, tone: 'from-emerald-500 to-teal-500' },
    { label: 'Specializations', value: specializations, icon: BookOpen, tone: 'from-fuchsia-500 to-pink-500' },
    { label: 'Retired', value: countByStatus(data, 'retired'), icon: UserMinus, tone: 'from-amber-500 to-orange-500' },
  ];
};

const buildStudentStats = (data: any[]): StatCard[] => {
  const withClass = data.filter((item) => item?.class_id).length;
  const classPercent = data.length > 0 ? Math.round((withClass / data.length) * 100) : 0;
  return [
    { label: 'Total Students', value: data.length, icon: GraduationCap, tone: 'from-indigo-500 to-sky-500' },
    { label: 'Active', value: countByStatus(data, 'active'), icon: CheckCircle2, tone: 'from-emerald-500 to-teal-500' },
    { label: 'In Classes', value: `${classPercent}%`, icon: BookOpen, tone: 'from-amber-500 to-orange-500' },
    { label: 'Graduated', value: countByStatus(data, 'graduated'), icon: Award, tone: 'from-fuchsia-500 to-pink-500' },
  ];
};

// --- Progress bar component ---

const ProgressBreakdown = ({ title, description, items, total }: {
  title: string;
  description: string;
  items: BarItem[];
  total: number;
}) => (
  <Card className="border-slate-200/60 bg-white/80 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/10">
    <CardHeader className="pb-2">
      <CardTitle className="text-base text-slate-900 dark:text-white">{title}</CardTitle>
      <CardDescription className="text-slate-500 dark:text-white/55">{description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {items.map((item) => {
        const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-xs font-medium', item.badgeClass)}>
                  {item.label}
                </Badge>
                <span className="text-slate-600 dark:text-white/70">{item.count.toLocaleString()}</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-white/45">{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/5">
              <div className={cn('h-full rounded-full transition-all duration-300', item.color)} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </CardContent>
  </Card>
);

// --- Per-tab breakdowns ---

const CentersBreakdown = ({ data, cross }: { data: any[]; cross: { students: number; teachers: number; classes: number } }) => {
  const total = cross.students + cross.teachers + cross.classes;
  const items: BarItem[] = [
    { label: 'Students', count: cross.students, color: 'bg-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300' },
    { label: 'Teachers', count: cross.teachers, color: 'bg-fuchsia-500', badgeClass: 'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20 dark:text-fuchsia-300' },
    { label: 'Classes', count: cross.classes, color: 'bg-amber-500', badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300' },
  ];

  const avgStudentsPerCenter = data.length > 0 ? Math.round(cross.students / data.length) : 0;
  const avgTeachersPerCenter = data.length > 0 ? Math.round(cross.teachers / data.length) : 0;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ProgressBreakdown title="Resource Distribution" description="Students, teachers, and classes across all centers." items={items} total={total} />
      <Card className="border-slate-200/60 bg-white/80 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900 dark:text-white">Per-Center Averages</CardTitle>
          <CardDescription className="text-slate-500 dark:text-white/55">Average distribution per center.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">Avg Students</p>
            <p className="mt-2 text-2xl font-semibold text-indigo-800 dark:text-indigo-100">{avgStudentsPerCenter}</p>
          </div>
          <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-600 dark:text-fuchsia-300">Avg Teachers</p>
            <p className="mt-2 text-2xl font-semibold text-fuchsia-800 dark:text-fuchsia-100">{avgTeachersPerCenter}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SuperuserBreakdown = ({ data }: { data: any[] }) => {
  const total = data.length;
  const statusItems: BarItem[] = [
    { label: 'Active', count: countByStatus(data, 'active'), color: 'bg-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300' },
    { label: 'Inactive', count: countByStatus(data, 'inactive'), color: 'bg-slate-400', badgeClass: 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-300' },
    { label: 'Suspended', count: countByStatus(data, 'suspended'), color: 'bg-amber-500', badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300' },
  ];

  const permCounts = new Map<string, number>();
  data.forEach((item) => {
    const perms = Array.isArray(item?.permissions) ? item.permissions : [];
    perms.forEach((p: string) => permCounts.set(p, (permCounts.get(p) || 0) + 1));
  });
  const topPerms = Array.from(permCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ProgressBreakdown title="Status Breakdown" description="Admin accounts by current status." items={statusItems} total={total} />
      <Card className="border-slate-200/60 bg-white/80 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900 dark:text-white">Top Permissions</CardTitle>
          <CardDescription className="text-slate-500 dark:text-white/55">Most assigned permissions across admins.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {topPerms.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-white/55">No permission data available.</p>
          ) : (
            topPerms.map(([perm, count]) => (
              <div key={perm} className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                <span className="text-sm font-medium text-slate-700 dark:text-white/80">{perm}</span>
                <Badge variant="outline" className="border-slate-200/70 text-xs dark:border-white/10">{count} admins</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const getMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const TeacherBreakdown = ({ data, collections, onEdit, onDelete, onResetPassword }: {
  data: any[];
  collections: OwnerManagerStatisticsCollections;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  onResetPassword: (item: any) => void;
}) => {
  const total = data.length;
  const male = countByGender(data, 'male');
  const female = countByGender(data, 'female');
  const other = total - male - female;

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const genderItems: BarItem[] = [
    { label: 'Male', count: male, color: 'bg-sky-500', badgeClass: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300' },
    { label: 'Female', count: female, color: 'bg-rose-500', badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300' },
    { label: 'Other', count: other, color: 'bg-amber-500', badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300' },
  ];

  const specCounts = new Map<string, number>();
  data.forEach((item) => {
    const spec = String(item?.specialization || '').trim();
    if (spec) specCounts.set(spec, (specCounts.get(spec) || 0) + 1);
  });
  const topSpecs = Array.from(specCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const teacherEarnings = useMemo(
    () => buildOwnerTeacherEarnings(collections.students, collections.teachers, collections.classes, collections.payments, selectedMonth),
    [collections, selectedMonth]
  );
  const totalEarned = useMemo(() => teacherEarnings.reduce((sum, row) => sum + row.earnedAmount, 0), [teacherEarnings]);
  const monthLabel = useMemo(() => getMonthLabel(selectedMonth), [selectedMonth]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <ProgressBreakdown title="Gender Breakdown" description="Teacher distribution by gender." items={genderItems} total={total} />
        <Card className="border-slate-200/60 bg-white/80 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-900 dark:text-white">Top Specializations</CardTitle>
            <CardDescription className="text-slate-500 dark:text-white/55">Most common teacher specializations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topSpecs.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-white/55">No specialization data available.</p>
            ) : (
              topSpecs.map(([spec, count]) => (
                <div key={spec} className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                  <span className="text-sm font-medium text-slate-700 dark:text-white/80">{spec}</span>
                  <Badge variant="outline" className="border-slate-200/70 text-xs dark:border-white/10">{count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Teacher Earnings */}
      <Card className="border-slate-200/60 bg-white/80 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/10">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base text-slate-900 dark:text-white">Teacher Earnings</CardTitle>
              <CardDescription className="text-slate-500 dark:text-white/55">
                Earnings for {monthLabel}, sorted from highest to lowest.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
          </div>

          {/* Earnings summary cards */}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">Earned Total</p>
              <p className="mt-1 text-xl font-semibold text-emerald-800 dark:text-emerald-100">
                <DollarSign className="mr-0.5 inline h-4 w-4" />{totalEarned.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">Top Teacher</p>
              <p className="mt-1 truncate text-sm font-semibold text-indigo-800 dark:text-indigo-100">
                {teacherEarnings[0]?.teacherName || 'No data'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">Month</p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-white/90">{monthLabel}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {teacherEarnings.length === 0 ? (
            <div className="px-6 pb-6 text-sm text-slate-500 dark:text-white/55">No earnings data for this month.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200/70 bg-slate-100/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/[0.03]">
                  <TableHead className="text-slate-600 dark:text-white/70">Teacher</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-white/70">Classes</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-white/70">Students</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-white/70">Paid</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-white/70">Unpaid</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-white/70">Earnings</TableHead>
                  <TableHead className="w-[120px] text-right text-slate-600 dark:text-white/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teacherEarnings.map((row, index) => {
                  const teacherRecord = data.find((t) => {
                    const id = Number(t?.teacher_id || t?.id || 0);
                    return id === row.teacherId;
                  });
                  return (
                    <TableRow key={row.teacherId} className="border-slate-200/60 dark:border-white/5">
                      <TableCell className="text-slate-800 dark:text-white/85">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-white/40">{index + 1}.</span>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{row.teacherName}</span>
                            <span className="text-xs text-slate-500 dark:text-white/45">#{row.teacherId}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-slate-700 dark:text-white/80">{row.classCount}</TableCell>
                      <TableCell className="text-right text-slate-700 dark:text-white/80">{row.totalStudents}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-300">{row.paidStudents}</TableCell>
                      <TableCell className="text-right text-rose-600 dark:text-rose-300">{row.unpaidStudents}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-900 dark:text-white">${row.earnedAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {teacherRecord && (
                          <div className="inline-flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => onResetPassword(teacherRecord)} className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400" title="Reset password">
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onEdit(teacherRecord)} className="text-sky-600 hover:bg-sky-500/10 hover:text-sky-700 dark:text-sky-400" title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onDelete(Number(getOwnerManagerRowId(teacherRecord)))} className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StudentBreakdown = ({ data }: { data: any[] }) => {
  const total = data.length;
  const male = countByGender(data, 'male');
  const female = countByGender(data, 'female');
  const other = total - male - female;

  const genderItems: BarItem[] = [
    { label: 'Male', count: male, color: 'bg-sky-500', badgeClass: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300' },
    { label: 'Female', count: female, color: 'bg-rose-500', badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300' },
    { label: 'Other', count: other, color: 'bg-amber-500', badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300' },
  ];

  const statusItems: BarItem[] = [
    { label: 'Active', count: countByStatus(data, 'active'), color: 'bg-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300' },
    { label: 'Graduated', count: countByStatus(data, 'graduated'), color: 'bg-indigo-500', badgeClass: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-300' },
    { label: 'Inactive', count: countByStatus(data, 'inactive'), color: 'bg-slate-400', badgeClass: 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-300' },
    { label: 'Removed', count: countByStatus(data, 'removed'), color: 'bg-rose-500', badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300' },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ProgressBreakdown title="Gender Breakdown" description="Student distribution by gender." items={genderItems} total={total} />
      <ProgressBreakdown title="Status Breakdown" description="Students by enrollment status." items={statusItems} total={total} />
    </div>
  );
};

// --- Main component ---

export const OwnerManagerTabStats = ({ activeTab, data, loading, crossCounts, collections, onEdit, onDelete, onResetPassword }: OwnerManagerTabStatsProps) => {
  const stats = useMemo(() => {
    switch (activeTab) {
      case 'centers': return buildCenterStats(data, crossCounts);
      case 'owners': return buildOwnerStats(data);
      case 'superusers': return buildSuperuserStats(data);
      case 'teachers': return buildTeacherStats(data);
      case 'students': return buildStudentStats(data);
      default: return [];
    }
  }, [activeTab, data, crossCounts]);

  if (stats.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className={cn(
        'grid gap-4',
        stats.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4'
      )}>
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="border-slate-200/60 bg-white/80 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/10"
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {loading ? '...' : typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                </div>
                <div className={cn('rounded-2xl bg-gradient-to-br p-3 text-white', card.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mini dashboard breakdowns */}
      {!loading && data.length > 0 && (
        <>
          {activeTab === 'centers' && <CentersBreakdown data={data} cross={crossCounts} />}
          {activeTab === 'superusers' && <SuperuserBreakdown data={data} />}
          {activeTab === 'teachers' && <TeacherBreakdown data={data} collections={collections} onEdit={onEdit} onDelete={onDelete} onResetPassword={onResetPassword} />}
          {activeTab === 'students' && <StudentBreakdown data={data} />}
        </>
      )}
    </div>
  );
};
