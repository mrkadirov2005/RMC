// Statistics view for the owner feature.

import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, BookMarked, Building2, CalendarDays, DollarSign, GraduationCap, Percent, Target, Trophy, UserMinus, Users, Wallet } from 'lucide-react';
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
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '../../../i18n/LanguageContext';

interface Props {
  summary: OwnerManagerStatisticsSummary;
  collections: OwnerManagerStatisticsCollections;
  loading: boolean;
}

const sectionTabs: { value: OwnerManagerStatisticsSection; label: string }[] = [
  { value: 'overview', label: 'Executive' },
  { value: 'payments', label: 'Revenue' },
  { value: 'teachers', label: 'Staff' },
  { value: 'statistics', label: 'Enrollment Mix' },
];

const getMonthLabel = (monthKey: string, language: string) => {
  const [year, month] = monthKey.split('-').map((value) => Number(value));
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'en-US', { month: 'long', year: 'numeric' });
};

const getPaymentAmount = (payment: any) => Number(payment?.amount || payment?.paid_amount || payment?.payment_amount || 0);

const getPaymentMonth = (payment: any) => {
  const raw = payment?.payment_date || payment?.created_at || payment?.updated_at;
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getTeacherDisplayName = (teacher: any, fallbackId?: number) => {
  const name = [teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (teacher?.full_name) return String(teacher.full_name);
  if (fallbackId) return `Teacher #${fallbackId}`;
  return 'No teacher';
};

const getClassDisplayName = (cls: any, fallbackId?: number) => {
  const name = [cls?.class_name, cls?.class_code].filter(Boolean).join(' / ').trim();
  if (name) return name;
  if (fallbackId) return `Group #${fallbackId}`;
  return 'No group';
};

const kpiSurfaceClasses = [
  'border-indigo-300/80 bg-gradient-to-br from-indigo-100 via-sky-50 to-cyan-200/80 shadow-indigo-200/70 dark:border-indigo-400/25 dark:from-indigo-900/45 dark:via-slate-950/80 dark:to-sky-900/35',
  'border-emerald-300/80 bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-200/75 shadow-emerald-200/70 dark:border-emerald-400/25 dark:from-emerald-900/45 dark:via-slate-950/80 dark:to-teal-900/35',
  'border-cyan-300/80 bg-gradient-to-br from-cyan-100 via-blue-50 to-sky-200/80 shadow-cyan-200/70 dark:border-cyan-400/25 dark:from-cyan-900/45 dark:via-slate-950/80 dark:to-blue-900/35',
  'border-fuchsia-300/80 bg-gradient-to-br from-fuchsia-100 via-pink-50 to-violet-200/75 shadow-fuchsia-200/70 dark:border-fuchsia-400/25 dark:from-fuchsia-900/45 dark:via-slate-950/80 dark:to-violet-900/35',
  'border-amber-300/80 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-200/85 shadow-amber-200/70 dark:border-amber-400/25 dark:from-amber-900/45 dark:via-slate-950/80 dark:to-orange-900/35',
  'border-violet-300/80 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-indigo-200/75 shadow-violet-200/70 dark:border-violet-400/25 dark:from-violet-900/45 dark:via-slate-950/80 dark:to-fuchsia-900/35',
  'border-lime-300/80 bg-gradient-to-br from-lime-100 via-emerald-50 to-teal-200/75 shadow-lime-200/70 dark:border-lime-400/25 dark:from-lime-900/45 dark:via-slate-950/80 dark:to-emerald-900/35',
  'border-slate-300/80 bg-gradient-to-br from-slate-100 via-white to-slate-200 shadow-slate-200/80 dark:border-slate-600/70 dark:from-slate-800 dark:via-slate-900/85 dark:to-slate-700/70',
] as const;

// Renders the owner statistics module.
export const OwnerManagerStatistics = ({ summary, collections, loading }: Props) => {
  const { language, t } = useLanguage();
  const [activeSection, setActiveSection] = useState<OwnerManagerStatisticsSection>('overview');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedSchoolLabel, setSelectedSchoolLabel] = useState<string | null>(null);

  const total = Math.max(summary.totalStudents, 0);
  const monthLabel = useMemo(() => getMonthLabel(selectedMonth, language), [language, selectedMonth]);
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
  const deletedStudentBreakdown = useMemo(() => {
    const teacherLookup = new Map<number, string>();
    collections.teachers.forEach((teacher) => {
      const teacherId = Number(teacher?.teacher_id || teacher?.id || 0);
      if (teacherId) teacherLookup.set(teacherId, getTeacherDisplayName(teacher, teacherId));
    });

    const classLookup = new Map<number, string>();
    collections.classes.forEach((cls) => {
      const classId = Number(cls?.class_id || cls?.id || 0);
      if (classId) classLookup.set(classId, getClassDisplayName(cls, classId));
    });

    const grouped = new Map<string, {
      key: string;
      teacherId: number;
      teacherName: string;
      classId: number;
      groupName: string;
      deletedCount: number;
      latestDeletedAt: string;
    }>();

    collections.deletedStudents.forEach((student) => {
      const teacherId = Number(student?.teacher_id || 0);
      const classId = Number(student?.class_id || 0);
      const teacherName =
        [student?.teacher_first_name, student?.teacher_last_name].filter(Boolean).join(' ').trim() ||
        teacherLookup.get(teacherId) ||
        getTeacherDisplayName(null, teacherId);
      const groupName =
        [student?.class_name, student?.class_code].filter(Boolean).join(' / ').trim() ||
        classLookup.get(classId) ||
        getClassDisplayName(null, classId);
      const key = `${teacherId || 'none'}:${classId || 'none'}`;
      const current = grouped.get(key) || {
        key,
        teacherId,
        teacherName,
        classId,
        groupName,
        deletedCount: 0,
        latestDeletedAt: '',
      };
      const deletedAt = String(student?.deleted_at || '');
      current.deletedCount += 1;
      if (deletedAt && (!current.latestDeletedAt || new Date(deletedAt) > new Date(current.latestDeletedAt))) {
        current.latestDeletedAt = deletedAt;
      }
      grouped.set(key, current);
    });

    return Array.from(grouped.values()).sort((a, b) => {
      if (b.deletedCount !== a.deletedCount) return b.deletedCount - a.deletedCount;
      return a.teacherName.localeCompare(b.teacherName);
    });
  }, [collections.classes, collections.deletedStudents, collections.teachers]);
  const deletedStudentTotal = useMemo(
    () => deletedStudentBreakdown.reduce((sum, row) => sum + row.deletedCount, 0),
    [deletedStudentBreakdown]
  );
  const totalEarned = useMemo(
    () => teacherEarnings.reduce((sum, row) => sum + row.earnedAmount, 0),
    [teacherEarnings]
  );
  const totalTeachers = collections.teachers.length;
  const totalClasses = collections.classes.length;
  const totalBranches = summary.centerBreakdown.length;
  const activeRate = total > 0 ? Math.round((summary.activeStudents / total) * 100) : 0;
  const classCoverage = total > 0 ? Math.round((summary.assignedToClass / total) * 100) : 0;
  const teacherCoverage = total > 0 ? Math.round((summary.assignedToTeacher / total) * 100) : 0;
  const averageClassSize = totalClasses > 0 ? Math.round(total / totalClasses) : 0;
  const revenuePerPaidStudent = paymentStats.paidStudents > 0 ? Math.round(totalEarned / paymentStats.paidStudents) : 0;
  const centerBarRows = useMemo(() => {
    const max = Math.max(...summary.centerBreakdown.map((row) => row.totalStudents), 1);
    return summary.centerBreakdown.slice(0, 8).map((row) => ({
      ...row,
      width: Math.max(4, Math.round((row.totalStudents / max) * 100)),
    }));
  }, [summary.centerBreakdown]);
  const paymentTrend = useMemo(() => {
    const totals = new Map<string, number>();
    collections.payments.forEach((payment) => {
      const month = getPaymentMonth(payment);
      if (!month) return;
      totals.set(month, (totals.get(month) || 0) + getPaymentAmount(payment));
    });

    const now = new Date();
    const rows = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: date.toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'en-US', { month: 'short' }),
        value: totals.get(key) || 0,
      };
    });
    const max = Math.max(...rows.map((row) => row.value), 1);
    const points = rows.map((row, index) => {
      const x = rows.length === 1 ? 0 : (index / (rows.length - 1)) * 100;
      const y = 100 - (row.value / max) * 86 - 7;
      return `${x},${y}`;
    }).join(' ');
    return { rows, points, max };
  }, [collections.payments, language]);

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
  const classLevelRows = useMemo(() => {
    const counts = new Map<string, number>();
    collections.classes.forEach((cls) => {
      const raw = cls?.level == null || cls?.level === '' ? 'No level' : `Level ${cls.level}`;
      counts.set(raw, (counts.get(raw) || 0) + 1);
    });
    const max = Math.max(...Array.from(counts.values()), 1);
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count, width: Math.max(6, Math.round((count / max) * 100)) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [collections.classes]);
  const paymentMethodRows = useMemo(() => {
    const counts = new Map<string, { count: number; amount: number }>();
    collections.payments.forEach((payment) => {
      if (getPaymentMonth(payment) !== selectedMonth) return;
      const label = String(payment?.payment_method || 'Unknown').trim() || 'Unknown';
      const current = counts.get(label) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += getPaymentAmount(payment);
      counts.set(label, current);
    });
    return Array.from(counts.entries())
      .map(([label, row]) => ({ label, ...row }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [collections.payments, selectedMonth]);
  const executiveKpis = [
    { label: 'Total Students', value: summary.totalStudents.toLocaleString(), detail: `${activeRate}% ${t('active')}`, icon: Users, tone: 'from-indigo-500 to-sky-500' },
    { label: 'Monthly Revenue', value: formatMoney(totalEarned), detail: `${paymentStats.paidPercent}% ${t('paid')}`, icon: DollarSign, tone: 'from-emerald-500 to-teal-500' },
    { label: 'Branches', value: totalBranches.toLocaleString(), detail: `${totalClasses.toLocaleString()} ${t('classes')}`, icon: Building2, tone: 'from-cyan-500 to-blue-500' },
    { label: 'Teachers', value: totalTeachers.toLocaleString(), detail: `${teacherCoverage}% ${t('student coverage')}`, icon: GraduationCap, tone: 'from-fuchsia-500 to-rose-500' },
    { label: 'Class Coverage', value: `${classCoverage}%`, detail: `${summary.assignedToClass.toLocaleString()} ${t('assigned')}`, icon: BookMarked, tone: 'from-amber-500 to-orange-500' },
    { label: 'Avg Class Size', value: averageClassSize.toLocaleString(), detail: t('Students per class'), icon: Activity, tone: 'from-violet-500 to-indigo-500' },
    { label: 'Paid Students', value: paymentStats.paidStudents.toLocaleString(), detail: `${paymentStats.unpaidStudents.toLocaleString()} ${t('unpaid')}`, icon: Wallet, tone: 'from-lime-500 to-emerald-500' },
    { label: 'Revenue / Paid', value: formatMoney(revenuePerPaidStudent), detail: t('Average collected'), icon: Percent, tone: 'from-slate-600 to-slate-900' },
  ];
  const topCenter = centerBarRows[0];
  const topTeacher = teacherEarnings[0];
  const insightCards = [
    {
      label: 'Strongest branch',
      value: topCenter?.centerName || t('No branch data'),
      detail: topCenter ? `${topCenter.totalStudents.toLocaleString()} ${t('students enrolled')}` : t('Add branch data to compare performance'),
      icon: Trophy,
      tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200',
    },
    {
      label: 'Revenue leader',
      value: topTeacher?.teacherName || t('No teacher data'),
      detail: topTeacher ? `${formatMoney(topTeacher.earnedAmount)} ${t('collected in')} ${monthLabel}` : t('Teacher earnings will appear here'),
      icon: Target,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200',
    },
    {
      label: 'Needs attention',
      value: `${paymentStats.unpaidStudents.toLocaleString()} ${t('unpaid')}`,
      detail: `${paymentStats.unpaidPercent}% ${t('of students have no completed payment this month')}`,
      icon: AlertTriangle,
      tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200',
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200/60 bg-white/90 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-white/[0.03] dark:shadow-black/10">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-2xl text-slate-900 dark:text-white">{t('Owner Performance Dashboard')}</CardTitle>
              </div>
              <CardDescription className="mt-2 text-slate-500 dark:text-white/60">
                {t('Executive-level statistics across students, branches, revenue, classes, and teacher performance.')}
              </CardDescription>
            </div>
            <div className="flex w-fit flex-wrap items-center gap-3 rounded-lg border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-950/40">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/70">
                <CalendarDays className="h-4 w-4 text-emerald-500" />
                {t('Month')}
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30"
              />
              <span className="text-sm text-slate-500 dark:text-white/50">{monthLabel}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-gradient-to-br from-white to-sky-50 shadow-sm dark:border-white/10 dark:from-slate-950/40 dark:to-slate-950/40">
              <div className="relative p-5 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-300" />
                <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-end">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/50">{t('Current month snapshot')}</p>
                    <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
                      <div>
                        <p className="text-5xl font-bold tracking-normal text-slate-900 dark:text-white">{formatMoney(totalEarned)}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-white/60">{t('Collected revenue in')} {monthLabel}</p>
                      </div>
                      <div className="rounded-lg border border-emerald-300/80 bg-gradient-to-br from-emerald-100 via-white to-lime-100 px-4 py-3 shadow-sm shadow-emerald-200/70 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:bg-none">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{paymentStats.paidPercent}%</p>
                        <p className="text-xs text-emerald-700/80 dark:text-emerald-200/70">{t('Paid share')}</p>
                      </div>
                      <div className="rounded-lg border border-sky-300/80 bg-gradient-to-br from-sky-100 via-white to-cyan-100 px-4 py-3 shadow-sm shadow-sky-200/70 dark:border-sky-400/20 dark:bg-sky-500/10 dark:bg-none">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeRate}%</p>
                        <p className="text-xs text-sky-700/80 dark:text-sky-200/70">{t('Active students')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-300/80 bg-gradient-to-br from-amber-100 via-white to-orange-100 p-4 shadow-sm shadow-amber-200/70 dark:border-amber-400/20 dark:bg-amber-500/10 dark:bg-none">
                    <div className="mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-white/55">
                      <span>{t('6-month revenue')}</span>
                      <span>{formatMoney(paymentTrend.max)} {t('peak')}</span>
                    </div>
                    <div className="flex h-28 items-end gap-2">
                      {paymentTrend.rows.map((row) => {
                        const height = paymentTrend.max > 0 ? Math.max(8, Math.round((row.value / paymentTrend.max) * 100)) : 8;
                        return (
                          <div key={row.key} className="flex flex-1 flex-col items-center gap-2">
                            <div className="flex h-20 w-full items-end rounded-md bg-slate-100 dark:bg-white/5">
                              <div
                                className="w-full rounded-md bg-gradient-to-t from-emerald-500 to-sky-400"
                                style={{ height: `${height}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-white/45">{row.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {insightCards.map((insight) => {
                const Icon = insight.icon;
                return (
                  <div key={insight.label} className={cn('rounded-xl border p-4 shadow-sm', insight.tone)}>
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-white/70 p-2 dark:bg-white/10">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase opacity-70">{t(insight.label)}</p>
                        <p className="mt-1 truncate text-base font-bold">{insight.value}</p>
                        <p className="mt-1 text-sm opacity-75">{insight.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {executiveKpis.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={cn('overflow-hidden rounded-lg border shadow-md dark:shadow-black/10', kpiSurfaceClasses[index % kpiSurfaceClasses.length])}
                >
                  <div className={cn('h-1 bg-gradient-to-r', card.tone)} />
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-700/75 dark:text-white/60">{t(card.label)}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{loading ? '...' : card.value}</p>
                      <p className="mt-1 text-sm text-slate-700/70 dark:text-white/60">{card.detail}</p>
                    </div>
                    <div className={cn('rounded-lg bg-gradient-to-br p-2.5 text-white', card.tone)}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as OwnerManagerStatisticsSection)}>
            <TabsList className="h-auto w-max gap-1 rounded-lg bg-slate-100 p-1 text-slate-600 dark:bg-white/5 dark:text-white/70">
              {sectionTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-md px-4 py-2 data-[state=active]:bg-slate-950 data-[state=active]:text-white dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
                >
                  {t(tab.label)}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="border-slate-200/70 bg-gradient-to-br from-white to-emerald-50 dark:border-white/10 dark:bg-slate-950/40 dark:bg-none">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Enrollment Health')}</CardTitle>
                    <CardDescription>{t('Active and inactive student balance.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-end justify-between">
                      <p className="text-4xl font-bold text-slate-950 dark:text-white">{activeRate}%</p>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{summary.activeStudents.toLocaleString()} {t('active')}</Badge>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${activeRate}%` }} />
                    </div>
                    <p className="text-sm text-muted-foreground">{summary.inactiveStudents.toLocaleString()} {t('inactive, graduated, or removed students.')}</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-gradient-to-br from-white to-indigo-50 dark:border-white/10 dark:bg-slate-950/40 dark:bg-none">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Assignment Coverage')}</CardTitle>
                    <CardDescription>{t('How complete class and teacher assignment is.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>{t('Class assigned')}</span><strong>{classCoverage}%</strong></div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full bg-indigo-500" style={{ width: `${classCoverage}%` }} /></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>{t('Teacher assigned')}</span><strong>{teacherCoverage}%</strong></div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full bg-fuchsia-500" style={{ width: `${teacherCoverage}%` }} /></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-gradient-to-br from-white to-amber-50 dark:border-white/10 dark:bg-slate-950/40 dark:bg-none">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Revenue Pulse')}</CardTitle>
                    <CardDescription>{t('Selected month collection performance.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-4xl font-bold text-slate-950 dark:text-white">{formatMoney(totalEarned)}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-white/80 p-3 dark:bg-white/5"><p className="text-muted-foreground">{t('Paid share')}</p><p className="font-semibold">{paymentStats.paidPercent}%</p></div>
                      <div className="rounded-lg bg-white/80 p-3 dark:bg-white/5"><p className="text-muted-foreground">{t('Avg paid')}</p><p className="font-semibold">{formatMoney(revenuePerPaidStudent)}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Students by Center')}</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-white/55">
                      {t('Bar chart for the busiest centers.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {centerBarRows.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-white/55">{t('No center statistics available.')}</p>
                    ) : centerBarRows.map((center) => (
                      <div key={center.centerId} className="grid grid-cols-[minmax(90px,150px)_1fr_auto] items-center gap-3 text-sm">
                        <span className="truncate font-medium text-slate-700 dark:text-white/75">{center.centerName}</span>
                        <div className="h-8 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                          <div
                            className="flex h-full items-center rounded-lg bg-gradient-to-r from-indigo-500 to-sky-400 px-2 text-xs font-semibold text-white"
                            style={{ width: `${center.width}%` }}
                          >
                            {center.totalStudents}
                          </div>
                        </div>
                        <span className="text-right text-slate-500 dark:text-white/45">{center.activeStudents} {t('active')}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Payment Trend')}</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-white/55">
                      {t('Line chart for collected payments over the last 6 months.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-48 rounded-xl border border-slate-200/70 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                        <line x1="0" y1="93" x2="100" y2="93" stroke="currentColor" className="text-slate-200 dark:text-white/10" strokeWidth="1" />
                        <polyline fill="none" stroke="url(#owner-payment-trend)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={paymentTrend.points} />
                        <defs>
                          <linearGradient id="owner-payment-trend" x1="0" x2="1" y1="0" y2="0">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#10b981" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <div className="grid grid-cols-6 gap-2 text-center text-xs text-slate-500 dark:text-white/45">
                      {paymentTrend.rows.map((row) => (
                        <div key={row.key}>
                          <p>{row.label}</p>
                          <p className="mt-1 font-semibold text-slate-700 dark:text-white/75">{formatMoney(row.value)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Class Levels')}</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-white/55">
                      {t('Class distribution by level.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {classLevelRows.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-white/55">{t('No class level data available.')}</p>
                    ) : classLevelRows.map((row) => (
                      <div key={row.label} className="grid grid-cols-[110px_1fr_48px] items-center gap-3 text-sm">
                        <span className="truncate font-medium text-slate-700 dark:text-white/75">{row.label}</span>
                        <div className="h-7 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                          <div className="h-full rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${row.width}%` }} />
                        </div>
                        <span className="text-right font-semibold text-slate-700 dark:text-white/75">{row.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Payment Methods')}</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-white/55">
                      {t('Collected amount by method for')} {monthLabel}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {paymentMethodRows.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-white/55">{t('No payment method data this month.')}</p>
                    ) : paymentMethodRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white/85">{row.label}</p>
                          <p className="text-xs text-muted-foreground">{row.count.toLocaleString()} {t('payments')}</p>
                        </div>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-300">{formatMoney(row.amount)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Gender Breakdown')}</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-white/55">
                      {t('How the total student body is distributed.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loading ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">
                        {t('Loading student demographics...')}
                      </div>
                    ) : (
                      genderRows.map((row) => {
                        const percent = total > 0 ? Math.round((row.count / total) * 100) : 0;
                        return (
                          <div key={row.label} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn('font-medium', row.className)}>
                                  {t(row.label)}
                                </Badge>
                                <span className="text-slate-600 dark:text-white/70">{row.count.toLocaleString()} {t('students')}</span>
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
                    <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Center Breakdown')}</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-white/55">
                      {t('Top centers by total student count.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto p-0">
                    {loading ? (
                      <div className="px-6 pb-6 pt-2 text-sm text-slate-500 dark:text-white/55">{t('Loading combined student data...')}</div>
                    ) : summary.centerBreakdown.length === 0 ? (
                      <div className="px-6 pb-6 text-sm text-slate-500 dark:text-white/55">{t('No students found yet.')}</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200/70 bg-slate-100/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.03]">
                            <TableHead className="text-slate-600 dark:text-white/70">{t('Center')}</TableHead>
                            <TableHead className="text-right text-slate-600 dark:text-white/70">{t('Students')}</TableHead>
                            <TableHead className="text-right text-slate-600 dark:text-white/70">{t('Active')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.centerBreakdown.slice(0, 6).map((center) => (
                            <TableRow key={center.centerId} className="border-slate-200/60 dark:border-white/5">
                              <TableCell className="text-slate-800 dark:text-white/85">
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium">{center.centerName}</span>
                                  <span className="text-xs text-slate-500 dark:text-white/45">{t('Center')} #{center.centerId}</span>
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
                  {summary.inactiveStudents.toLocaleString()} {t('inactive students')}
                </Badge>
                <Badge variant="outline" className="border-slate-200/70 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  {summary.activeStudents.toLocaleString()} {t('active students')}
                </Badge>
                <Badge variant="outline" className="border-slate-200/70 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  {summary.totalStudents.toLocaleString()} {t('total students')}
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className={cn('rounded-2xl border p-4 shadow-md dark:shadow-black/10', kpiSurfaceClasses[0])}>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-700/75 dark:text-white/60">{t('Students total')}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{paymentStats.totalStudents.toLocaleString()}</p>
                </div>
                <div className={cn('rounded-2xl border p-4 shadow-md dark:shadow-black/10', kpiSurfaceClasses[1])}>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-700/75 dark:text-white/60">{t('Paid students')}</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-300">{paymentStats.paidStudents.toLocaleString()}</p>
                </div>
                <div className={cn('rounded-2xl border p-4 shadow-md dark:shadow-black/10', kpiSurfaceClasses[4])}>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-700/75 dark:text-white/60">{t('Unpaid students')}</p>
                  <p className="mt-2 text-3xl font-semibold text-rose-600 dark:text-rose-300">{paymentStats.unpaidStudents.toLocaleString()}</p>
                </div>
                <div className={cn('rounded-2xl border p-4 shadow-md dark:shadow-black/10', kpiSurfaceClasses[3])}>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-700/75 dark:text-white/60">{t('Paid share')}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{paymentStats.paidPercent}%</p>
                </div>
              </div>

              <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Paid vs Unpaid Students')}</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-white/55">
                    {t('Student count for')} {monthLabel}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">
                      {t('Loading payment statistics...')}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-white/70">
                        <span>{paymentStats.paidStudents} {t('paid')}</span>
                        <span>{paymentStats.unpaidStudents} {t('unpaid')}</span>
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
                          <p className="text-xs uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-200/70">{t('Paid students')}</p>
                          <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{paymentStats.paidStudents}</p>
                        </div>
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-rose-700 dark:text-rose-200/70">{t('Unpaid students')}</p>
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
                <div className={cn('rounded-2xl border p-4 shadow-md dark:shadow-black/10', kpiSurfaceClasses[2])}>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-700/75 dark:text-white/60">{t('Teachers')}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{teacherEarnings.length.toLocaleString()}</p>
                </div>
                <div className={cn('rounded-2xl border p-4 shadow-md dark:shadow-black/10', kpiSurfaceClasses[1])}>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-700/75 dark:text-white/60">{t('Earned total')}</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-300">{formatMoney(totalEarned)}</p>
                </div>
                <div className={cn('rounded-2xl border p-4 shadow-md dark:shadow-black/10', kpiSurfaceClasses[3])}>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-700/75 dark:text-white/60">{t('Top teacher')}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    {teacherEarnings[0]?.teacherName || t('No data')}
                  </p>
                </div>
                <div className={cn('rounded-2xl border p-4 shadow-md dark:shadow-black/10', kpiSurfaceClasses[4])}>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-700/75 dark:text-white/60">{t('Soft-deleted students')}</p>
                  <p className="mt-2 text-3xl font-semibold text-rose-600 dark:text-rose-300">{deletedStudentTotal.toLocaleString()}</p>
                </div>
              </div>

              <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <UserMinus className="h-5 w-5 text-rose-500" />
                    <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Deleted Students by Teacher Groups')}</CardTitle>
                  </div>
                  <CardDescription className="text-slate-500 dark:text-white/55">
                    {t('Soft-deleted students grouped by teacher and class/group.')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  {loading ? (
                    <div className="px-6 pb-6 pt-2 text-sm text-slate-500 dark:text-white/55">{t('Loading deleted student breakdown...')}</div>
                  ) : deletedStudentBreakdown.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-slate-500 dark:text-white/55">{t('No soft-deleted students found.')}</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200/70 bg-slate-100/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.03]">
                          <TableHead className="text-slate-600 dark:text-white/70">{t('Teacher')}</TableHead>
                          <TableHead className="text-slate-600 dark:text-white/70">{t('Group')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">{t('Deleted students')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">{t('Last deleted')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deletedStudentBreakdown.map((row) => (
                          <TableRow key={row.key} className="border-slate-200/60 dark:border-white/5">
                            <TableCell className="text-slate-800 dark:text-white/85">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{row.teacherName}</span>
                                {row.teacherId ? <span className="text-xs text-slate-500 dark:text-white/45">{t('Teacher')} #{row.teacherId}</span> : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-700 dark:text-white/80">
                              <div className="flex flex-col gap-1">
                                <span>{row.groupName}</span>
                                {row.classId ? <span className="text-xs text-slate-500 dark:text-white/45">{t('Class')} #{row.classId}</span> : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-300">{row.deletedCount.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-slate-600 dark:text-white/75">
                              {row.latestDeletedAt
                                ? new Date(row.latestDeletedAt).toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'en-US')
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Teacher Earnings')}</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-white/55">
                    {t('Earnings for')} {monthLabel}, {t('sorted from highest to lowest.')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  {loading ? (
                    <div className="px-6 pb-6 pt-2 text-sm text-slate-500 dark:text-white/55">{t('Loading teacher earnings...')}</div>
                  ) : teacherEarnings.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-slate-500 dark:text-white/55">{t('No teachers found yet.')}</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200/70 bg-slate-100/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.03]">
                          <TableHead className="text-slate-600 dark:text-white/70">{t('Teacher')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">{t('Classes')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">{t('Students')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">{t('Paid')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">{t('Unpaid')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-white/70">{t('Earnings')}</TableHead>
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
                                  <span className="text-xs text-slate-500 dark:text-white/45">{t('Teacher')} #{row.teacherId}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-slate-700 dark:text-white/80">{row.classCount.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-slate-700 dark:text-white/80">{row.totalStudents.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-emerald-600 dark:text-emerald-300">{row.paidStudents.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-rose-600 dark:text-rose-300">{row.unpaidStudents.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                              {formatMoney(row.earnedAmount)}
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
                  <CardTitle className="text-lg text-slate-900 dark:text-white">{t('Students by school')}</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-white/55">
                    {t('Distribution based on the optional student school fields.')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-[260px_1fr]">
                  <div className="flex items-center justify-center">
                    <PieChart data={schoolDistribution.slices} />
                  </div>
                  <div className="space-y-3">
                    {loading ? (
                      <div className="text-sm text-slate-500 dark:text-white/55">{t('Loading school breakdown...')}</div>
                    ) : schoolDistribution.slices.length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-white/55">
                        {t('No students found yet. Add optional `school_name` on student records to populate this chart.')}
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
                        ? t('Students from other schools')
                        : selectedSchoolLabel === 'Unknown'
                          ? t('Students with no school set')
                          : `${t('Students from')} ${selectedSchoolLabel}`}
                    </DialogTitle>
                  </DialogHeader>

                  {loading ? (
                    <div className="text-sm text-slate-500 dark:text-white/55">{t('Loading students...')}</div>
                  ) : selectedSchoolStudents.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-white/55">{t('No students found for this selection.')}</div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-white/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200/70 bg-slate-100/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.03]">
                            <TableHead className="text-slate-600 dark:text-white/70">{t('Student')}</TableHead>
                            <TableHead className="text-slate-600 dark:text-white/70">{t('Enrollment')}</TableHead>
                            <TableHead className="text-slate-600 dark:text-white/70">{t('Center')}</TableHead>
                            <TableHead className="text-slate-600 dark:text-white/70">{t('Class')}</TableHead>
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
