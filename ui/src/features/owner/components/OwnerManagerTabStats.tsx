// Dashboard stat cards and mini analytics for each entity tab.

import { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Shield,
  ShieldCheck,
  UserMinus,
  Users,
  UserX,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { OwnerManagerTabType, OwnerManagerStatisticsCollections } from '../types';
import { buildOwnerTeacherEarnings } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';

interface OwnerManagerTabStatsProps {
  activeTab: OwnerManagerTabType;
  data: any[];
  loading: boolean;
  crossCounts: { students: number; teachers: number; classes: number };
  collections: OwnerManagerStatisticsCollections;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  onHardDelete: (id: number) => void;
  onResetPassword: (item: any) => void;
  canHardDelete: boolean;
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

const statSurfaceClasses = [
  'border-0 bg-gradient-to-br from-indigo-600 to-sky-600 text-white shadow-indigo-500/25',
  'border-0 bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-emerald-500/25',
  'border-0 bg-gradient-to-br from-fuchsia-600 to-pink-600 text-white shadow-fuchsia-500/25',
  'border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-orange-500/25',
  'border-0 bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-rose-500/25',
] as const;

const countByStatus = (data: any[], status: string) =>
  data.filter((item) => String(item?.status || '').toLowerCase() === status).length;

const countByGender = (data: any[], gender: string) =>
  data.filter((item) => String(item?.gender || '').toLowerCase() === gender).length;

const getAge = (value: unknown) => {
  if (!value) return null;
  const birthDate = new Date(String(value));
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 && age < 100 ? age : null;
};

const inferSubjectBucket = (name: string) => {
  const value = name.toLowerCase();
  if (value.includes('koreys')) return 'Koreys tili';
  if (value.includes('arab')) return 'Arab tili';
  if (value.includes('rus')) return 'Rus tili';
  if (value.includes('matematika')) return 'Matematika';
  if (value.includes('ielts')) return 'IELTS';
  if (value.includes('grammar') || value.includes('grammatika')) return 'Grammar';
  if (value.includes('kids')) return 'Kids English';
  if (value.includes('starter')) return 'Starter';
  if (value.includes('flyer')) return 'Flyers';
  if (value.includes('mover')) return 'Movers';
  if (value.includes('a1')) return 'A1';
  if (value.includes('a2')) return 'A2';
  if (value.includes('b1')) return 'B1';
  if (value.includes('b2')) return 'B2';
  return 'Other';
};

const topCounts = (values: string[], fallback = 'Unknown') => {
  const map = new Map<string, number>();
  values.forEach((value) => {
    const label = String(value || '').trim() || fallback;
    map.set(label, (map.get(label) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

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
}) => {
  const { t } = useLanguage();

  return (
    <Card className="border-slate-200/60 bg-white/80 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-900 dark:text-white">{t(title)}</CardTitle>
        <CardDescription className="text-slate-500 dark:text-white/55">{t(description)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn('text-xs font-medium', item.badgeClass)}>
                    {t(item.label)}
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
};

// --- Per-tab breakdowns ---

const CentersBreakdown = ({ data, cross }: { data: any[]; cross: { students: number; teachers: number; classes: number } }) => {
  const { t } = useLanguage();
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
          <CardTitle className="text-base text-slate-900 dark:text-white">{t('Per-Center Averages')}</CardTitle>
          <CardDescription className="text-slate-500 dark:text-white/55">{t('Average distribution per center.')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">{t('Avg Students')}</p>
            <p className="mt-2 text-2xl font-semibold text-indigo-800 dark:text-indigo-100">{avgStudentsPerCenter}</p>
          </div>
          <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-600 dark:text-fuchsia-300">{t('Avg Teachers')}</p>
            <p className="mt-2 text-2xl font-semibold text-fuchsia-800 dark:text-fuchsia-100">{avgTeachersPerCenter}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SuperuserBreakdown = ({ data }: { data: any[] }) => {
  const { t } = useLanguage();
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
          <CardTitle className="text-base text-slate-900 dark:text-white">{t('Top Permissions')}</CardTitle>
          <CardDescription className="text-slate-500 dark:text-white/55">{t('Most assigned permissions across admins.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {topPerms.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-white/55">{t('No permission data available.')}</p>
          ) : (
            topPerms.map(([perm, count]) => (
              <div key={perm} className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                <span className="text-sm font-medium text-slate-700 dark:text-white/80">{perm}</span>
                <Badge variant="outline" className="border-slate-200/70 text-xs dark:border-white/10">{count} {t('admins')}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const getMonthLabel = (monthKey: string, language: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'en-US', { month: 'long', year: 'numeric' });
};

const TeacherInsightCard = ({
  title,
  description,
  value,
  detail,
  tone,
}: {
  title: string;
  description: string;
  value: string | number;
  detail: string;
  tone: string;
}) => {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden rounded-md border-0 bg-white shadow-sm dark:bg-white/[0.04]">
      <div className={cn('h-1 bg-gradient-to-r', tone)} />
      <CardContent className="p-3">
        <p className="text-[10px] font-black uppercase text-slate-500">{t(title)}</p>
        <p className="text-xl font-black leading-tight text-slate-950 dark:text-white">{value}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{t(description)} · {detail}</p>
      </CardContent>
    </Card>
  );
};

const TeacherBreakdown = ({ data, collections }: {
  data: any[];
  collections: OwnerManagerStatisticsCollections;
}) => {
  const { language, t } = useLanguage();
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
    .map(([label, count]) => ({ label, count }));

  const teacherEarnings = useMemo(
    () => buildOwnerTeacherEarnings(collections.students, collections.teachers, collections.classes, collections.payments, selectedMonth),
    [collections, selectedMonth]
  );
  const monthLabel = useMemo(() => getMonthLabel(selectedMonth, language), [language, selectedMonth]);
  const teacherClassMap = useMemo(() => {
    const map = new Map<number, number>();
    collections.classes.forEach((cls) => {
      const teacherId = Number(cls?.teacher_id || 0);
      if (!teacherId) return;
      map.set(teacherId, (map.get(teacherId) || 0) + 1);
    });
    return map;
  }, [collections.classes]);
  const teacherStudentMap = useMemo(() => {
    const classTeacherMap = new Map<number, number>();
    collections.classes.forEach((cls) => {
      const classId = Number(cls?.class_id || cls?.id || 0);
      const teacherId = Number(cls?.teacher_id || 0);
      if (classId && teacherId) classTeacherMap.set(classId, teacherId);
    });
    const map = new Map<number, number>();
    collections.students.forEach((student) => {
      const classId = Number(student?.class_id || 0);
      const teacherId = Number(student?.teacher_id || classTeacherMap.get(classId) || 0);
      if (!teacherId) return;
      map.set(teacherId, (map.get(teacherId) || 0) + 1);
    });
    return map;
  }, [collections.classes, collections.students]);
  const groupLoadRows = useMemo(() => {
    const labels = data.map((teacher) => {
      const id = Number(teacher?.teacher_id || teacher?.id || 0);
      const count = teacherClassMap.get(id) || 0;
      if (count === 0) return '0 groups';
      if (count <= 2) return '1-2 groups';
      if (count <= 4) return '3-4 groups';
      return '5+ groups';
    });
    return topCounts(labels);
  }, [data, teacherClassMap]);
  const studentLoadRows = useMemo(() => {
    const labels = data.map((teacher) => {
      const id = Number(teacher?.teacher_id || teacher?.id || 0);
      const count = teacherStudentMap.get(id) || 0;
      if (count === 0) return '0 students';
      if (count <= 10) return '1-10 students';
      if (count <= 30) return '11-30 students';
      if (count <= 60) return '31-60 students';
      return '61+ students';
    });
    return topCounts(labels);
  }, [data, teacherStudentMap]);
  const financeRows = useMemo(
    () => [
      { label: 'With paid students', count: teacherEarnings.filter((row) => row.paidStudents > 0).length },
      { label: 'No paid students', count: teacherEarnings.filter((row) => row.paidStudents === 0).length },
      { label: 'Has unpaid students', count: teacherEarnings.filter((row) => row.unpaidStudents > 0).length },
      { label: 'Fully paid groups', count: teacherEarnings.filter((row) => row.totalStudents > 0 && row.unpaidStudents === 0).length },
    ],
    [teacherEarnings]
  );
  const totalGroups = Array.from(teacherClassMap.values()).reduce((sum, count) => sum + count, 0);
  const totalStudents = Array.from(teacherStudentMap.values()).reduce((sum, count) => sum + count, 0);
  const avgGroups = total > 0 ? Math.round((totalGroups / total) * 10) / 10 : 0;
  const avgStudents = total > 0 ? Math.round(totalStudents / total) : 0;
  const coveredTeachers = data.filter((teacher) => {
    const id = Number(teacher?.teacher_id || teacher?.id || 0);
    return (teacherClassMap.get(id) || 0) > 0;
  }).length;
  const paidStudents = teacherEarnings.reduce((sum, row) => sum + row.paidStudents, 0);
  const unpaidStudents = teacherEarnings.reduce((sum, row) => sum + row.unpaidStudents, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-3 shadow-sm dark:border-white/10 dark:from-white/[0.04] dark:via-white/[0.03] dark:to-white/[0.04]">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-sm font-black text-slate-950 dark:text-white">{t('Teacher analytics')}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-white/55">
              {t('Teacher list is hidden here. Use this owner view for staffing, load, and finance coverage.')}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-black text-slate-500">{monthLabel}</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-8 rounded-md border border-emerald-100 bg-white px-2 text-xs font-bold text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <TeacherInsightCard title="Group Coverage" description="Teachers with groups" value={`${coveredTeachers}/${total}`} detail={`${avgGroups} avg groups`} tone="from-emerald-600 to-teal-600" />
        <TeacherInsightCard title="Student Load" description="Students assigned" value={totalStudents.toLocaleString()} detail={`${avgStudents} avg students`} tone="from-blue-600 to-cyan-600" />
        <TeacherInsightCard title="Paid Students" description="Selected month" value={paidStudents.toLocaleString()} detail={`${unpaidStudents} unpaid`} tone="from-violet-600 to-fuchsia-600" />
        <TeacherInsightCard title="Specializations" description="Unique teaching areas" value={specCounts.size.toLocaleString()} detail={`${totalGroups} groups`} tone="from-amber-500 to-orange-600" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProgressBreakdown title="Gender Breakdown" description="Teacher distribution by gender." items={genderItems} total={total} />
        <ProgressBreakdown title="Monthly Payment Coverage" description="Teacher payment health for selected month." items={[
          { label: 'Paid students', count: paidStudents, color: 'bg-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300' },
          { label: 'Unpaid students', count: unpaidStudents, color: 'bg-rose-500', badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300' },
        ]} total={paidStudents + unpaidStudents} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <DistributionCard title="Specializations" description="Teacher distribution by specialization." rows={topSpecs} total={total} tone="from-fuchsia-600 to-pink-600" />
        <DistributionCard title="Group Load" description="How many groups teachers manage." rows={groupLoadRows} total={total} tone="from-emerald-600 to-teal-600" />
        <DistributionCard title="Student Load" description="Student count per teacher bucket." rows={studentLoadRows} total={total} tone="from-blue-600 to-cyan-600" />
        <DistributionCard title="Finance Coverage" description="Payment coverage by teacher." rows={financeRows} total={total} tone="from-amber-500 to-orange-600" />
      </div>
    </div>
  );
};

const DistributionCard = ({
  title,
  description,
  rows,
  total,
  tone,
}: {
  title: string;
  description: string;
  rows: { label: string; count: number }[];
  total: number;
  tone: string;
}) => {
  const { t } = useLanguage();
  const visibleRows = rows.slice(0, 8);

  return (
    <Card className="overflow-hidden rounded-md border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className={cn('h-1 bg-gradient-to-r', tone)} />
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm font-black text-slate-950 dark:text-white">{t(title)}</CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-white/55">{t(description)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        {visibleRows.length === 0 ? (
          <p className="text-xs font-semibold text-slate-500">{t('No data available.')}</p>
        ) : (
          visibleRows.map((row) => {
            const percent = total > 0 ? Math.round((row.count / total) * 100) : 0;
            return (
              <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-black text-slate-800 dark:text-white/85">{row.label}</span>
                    <span className="font-black text-slate-500">{percent}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full bg-gradient-to-r', tone)} style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                  {row.count}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

const StudentBreakdown = ({ data, collections }: { data: any[]; collections: OwnerManagerStatisticsCollections }) => {
  const { t } = useLanguage();
  const total = data.length;
  const male = countByGender(data, 'male');
  const female = countByGender(data, 'female');
  const other = total - male - female;
  const classLookup = useMemo(() => {
    const map = new Map<number, any>();
    collections.classes.forEach((cls) => {
      const id = Number(cls?.class_id || cls?.id || 0);
      if (id) map.set(id, cls);
    });
    return map;
  }, [collections.classes]);

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

  const schoolRows = useMemo(
    () => topCounts(data.map((student) => student?.school_name), 'No school'),
    [data]
  );
  const schoolClassRows = useMemo(
    () => topCounts(data.map((student) => student?.school_class), 'No school class'),
    [data]
  );
  const groupRows = useMemo(
    () =>
      topCounts(
        data.map((student) => {
          const classId = Number(student?.class_id || 0);
          const cls = classLookup.get(classId);
          return cls?.class_name || student?.class_name || 'No group';
        }),
        'No group'
      ),
    [classLookup, data]
  );
  const ageRows = useMemo(() => {
    const labels = data.map((student) => {
      const age = getAge(student?.date_of_birth);
      if (age == null) return 'No age';
      if (age <= 6) return '0-6';
      if (age <= 9) return '7-9';
      if (age <= 12) return '10-12';
      if (age <= 15) return '13-15';
      if (age <= 18) return '16-18';
      return '19+';
    });
    return topCounts(labels, 'No age');
  }, [data]);
  const subjectRows = useMemo(
    () =>
      topCounts(
        data.map((student) => {
          const classId = Number(student?.class_id || 0);
          const cls = classLookup.get(classId);
          return inferSubjectBucket(String(cls?.class_name || student?.class_name || ''));
        }),
        'Other'
      ),
    [classLookup, data]
  );
  const assignmentRows = useMemo(
    () => [
      { label: 'Assigned to group', count: data.filter((student) => Number(student?.class_id || 0) > 0).length },
      { label: 'No group', count: data.filter((student) => !Number(student?.class_id || 0)).length },
      { label: 'Assigned to teacher', count: data.filter((student) => Number(student?.teacher_id || 0) > 0).length },
      { label: 'No teacher', count: data.filter((student) => !Number(student?.teacher_id || 0)).length },
    ],
    [data]
  );

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-fuchsia-50 p-3 shadow-sm dark:border-white/10 dark:from-white/[0.04] dark:via-white/[0.03] dark:to-white/[0.04]">
        <p className="text-sm font-black text-slate-950 dark:text-white">{t('Student analytics')}</p>
        <p className="text-xs font-semibold text-slate-500 dark:text-white/55">
          {t('Student list is hidden here. Use this owner view for distribution and coverage decisions.')}
        </p>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <ProgressBreakdown title="Gender Breakdown" description="Student distribution by gender." items={genderItems} total={total} />
        <ProgressBreakdown title="Status Breakdown" description="Students by enrollment status." items={statusItems} total={total} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <DistributionCard title="Schools" description="Where students study outside the center." rows={schoolRows} total={total} tone="from-blue-600 to-cyan-600" />
        <DistributionCard title="School Classes" description="School grade/class distribution." rows={schoolClassRows} total={total} tone="from-emerald-600 to-teal-600" />
        <DistributionCard title="Groups" description="CRM group distribution." rows={groupRows} total={total} tone="from-violet-600 to-fuchsia-600" />
        <DistributionCard title="Ages" description="Age range distribution." rows={ageRows} total={total} tone="from-amber-500 to-orange-600" />
        <DistributionCard title="Subjects" description="Subject distribution inferred from groups." rows={subjectRows} total={total} tone="from-rose-600 to-pink-600" />
        <DistributionCard title="Assignment Coverage" description="Group and teacher assignment health." rows={assignmentRows} total={total} tone="from-slate-700 to-slate-950" />
      </div>
    </div>
  );
};

// --- Main component ---

export const OwnerManagerTabStats = ({ activeTab, data, loading, crossCounts, collections }: OwnerManagerTabStatsProps) => {
  const { t } = useLanguage();
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
        'grid gap-2',
        stats.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4'
      )}>
        {stats.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className={cn('overflow-hidden rounded-md shadow-lg backdrop-blur dark:shadow-black/10', statSurfaceClasses[index % statSurfaceClasses.length])}
            >
              <CardContent className="flex items-center justify-between gap-3 p-2">
                <div>
                  <p className="text-[10px] font-black uppercase text-white/75">
                    {t(card.label)}
                  </p>
                  <p className="text-lg font-black leading-tight text-white">
                    {loading ? '...' : typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                </div>
                <div className="rounded bg-white/20 p-2 text-white">
                  <Icon className="h-4 w-4" />
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
          {activeTab === 'teachers' && <TeacherBreakdown data={data} collections={collections} />}
          {activeTab === 'students' && <StudentBreakdown data={data} collections={collections} />}
        </>
      )}
    </div>
  );
};
