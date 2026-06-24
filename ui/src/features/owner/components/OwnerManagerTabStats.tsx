// Dashboard stat cards and mini analytics for each entity tab.

import { useMemo } from 'react';
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
import { useLanguage } from '../../../i18n/LanguageContext';
import { StudentStatsCarousel } from './student-stats/StudentStatsCarousel';
import { TeacherStatsPanel } from './teacher-stats/TeacherStatsPanel';

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

// --- Main component ---

export const OwnerManagerTabStats = ({ activeTab, data, loading, crossCounts, collections }: OwnerManagerTabStatsProps) => {
  const { t } = useLanguage();
  const effectiveData = activeTab === 'teachers' && data.length === 0 && collections.teachers.length > 0
    ? collections.teachers
    : data;
  const stats = useMemo(() => {
    switch (activeTab) {
      case 'centers': return buildCenterStats(effectiveData, crossCounts);
      case 'owners': return buildOwnerStats(effectiveData);
      case 'superusers': return buildSuperuserStats(effectiveData);
      case 'teachers': return buildTeacherStats(effectiveData);
      case 'students': return buildStudentStats(effectiveData);
      default: return [];
    }
  }, [activeTab, effectiveData, crossCounts]);

  if (stats.length === 0) return null;

  return (
    <div className="space-y-4">
      {activeTab !== 'students' && (
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
      )}

      {/* Mini dashboard breakdowns */}
      {!loading && effectiveData.length > 0 && (
        <>
          {activeTab === 'centers' && <CentersBreakdown data={effectiveData} cross={crossCounts} />}
          {activeTab === 'superusers' && <SuperuserBreakdown data={effectiveData} />}
          {activeTab === 'teachers' && <TeacherStatsPanel data={effectiveData} collections={collections} />}
          {activeTab === 'students' && <StudentStatsCarousel data={effectiveData} collections={collections} />}
        </>
      )}
    </div>
  );
};
