import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import type { OwnerManagerStatisticsCollections } from '../../types';
import { buildOwnerTeacherEarnings } from '../../utils';

interface Props {
  data: any[];
  collections: OwnerManagerStatisticsCollections;
}

interface Row {
  label: string;
  count: number;
}

interface BarItem extends Row {
  color: string;
  badgeClass: string;
}

const countByGender = (data: any[], gender: string) =>
  data.filter((item) => String(item?.gender || '').toLowerCase() === gender).length;

const topCounts = (values: string[], fallback = 'Unknown'): Row[] => {
  const map = new Map<string, number>();
  values.forEach((value) => {
    const label = String(value || '').trim() || fallback;
    map.set(label, (map.get(label) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const getMonthLabel = (monthKey: string, language: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
};

export const TeacherStatsPanel = ({ data, collections }: Props) => {
  const { language, t } = useLanguage();
  const total = data.length;
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const teacherEarnings = useMemo(
    () => buildOwnerTeacherEarnings(collections.students, collections.teachers, collections.classes, collections.payments, selectedMonth),
    [collections, selectedMonth]
  );
  const monthLabel = useMemo(() => getMonthLabel(selectedMonth, language), [language, selectedMonth]);
  const teacherClassMap = useMemo(() => {
    const map = new Map<number, number>();
    collections.classes.forEach((cls) => {
      const teacherId = Number(cls?.teacher_id || 0);
      if (teacherId) map.set(teacherId, (map.get(teacherId) || 0) + 1);
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
      const teacherId = Number(student?.teacher_id || classTeacherMap.get(Number(student?.class_id || 0)) || 0);
      if (teacherId) map.set(teacherId, (map.get(teacherId) || 0) + 1);
    });
    return map;
  }, [collections.classes, collections.students]);

  const topSpecs = useMemo(() => {
    const specCounts = new Map<string, number>();
    data.forEach((item) => {
      const spec = String(item?.specialization || '').trim();
      if (spec) specCounts.set(spec, (specCounts.get(spec) || 0) + 1);
    });
    return Array.from(specCounts.entries()).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
  }, [data]);
  const groupLoadRows = useMemo(
    () => topCounts(data.map((teacher) => bucketCount(teacherClassMap.get(Number(teacher?.teacher_id || teacher?.id || 0)) || 0, 'groups'))),
    [data, teacherClassMap]
  );
  const studentLoadRows = useMemo(
    () => topCounts(data.map((teacher) => bucketCount(teacherStudentMap.get(Number(teacher?.teacher_id || teacher?.id || 0)) || 0, 'students'))),
    [data, teacherStudentMap]
  );
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
  const coveredTeachers = data.filter((teacher) => (teacherClassMap.get(Number(teacher?.teacher_id || teacher?.id || 0)) || 0) > 0).length;
  const paidStudents = teacherEarnings.reduce((sum, row) => sum + row.paidStudents, 0);
  const unpaidStudents = teacherEarnings.reduce((sum, row) => sum + row.unpaidStudents, 0);
  const genderItems: BarItem[] = [
    { label: 'Male', count: countByGender(data, 'male'), color: 'bg-sky-500', badgeClass: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300' },
    { label: 'Female', count: countByGender(data, 'female'), color: 'bg-rose-500', badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300' },
    { label: 'Other', count: Math.max(total - countByGender(data, 'male') - countByGender(data, 'female'), 0), color: 'bg-amber-500', badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-3 shadow-sm dark:border-white/10 dark:from-white/[0.04] dark:via-white/[0.03] dark:to-white/[0.04]">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-sm font-black text-slate-950 dark:text-white">{t('Teacher analytics')}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-white/55">{t('Staffing, load, and finance coverage.')}</p>
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
        <Insight title="Group Coverage" value={`${coveredTeachers}/${total}`} detail={`${average(totalGroups, total)} avg groups`} tone="from-emerald-600 to-teal-600" />
        <Insight title="Student Load" value={totalStudents.toLocaleString()} detail={`${Math.round(average(totalStudents, total))} avg students`} tone="from-blue-600 to-cyan-600" />
        <Insight title="Paid Students" value={paidStudents.toLocaleString()} detail={`${unpaidStudents} unpaid`} tone="from-violet-600 to-fuchsia-600" />
        <Insight title="Specializations" value={topSpecs.length.toLocaleString()} detail={`${totalGroups} groups`} tone="from-amber-500 to-orange-600" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Progress title="Gender Breakdown" description="Teacher distribution by gender." items={genderItems} total={total} />
        <Progress title="Monthly Payment Coverage" description="Teacher payment health for selected month." items={[
          { label: 'Paid students', count: paidStudents, color: 'bg-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300' },
          { label: 'Unpaid students', count: unpaidStudents, color: 'bg-rose-500', badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300' },
        ]} total={paidStudents + unpaidStudents} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <Distribution title="Specializations" rows={topSpecs} total={total} tone="from-fuchsia-600 to-pink-600" />
        <Distribution title="Group Load" rows={groupLoadRows} total={total} tone="from-emerald-600 to-teal-600" />
        <Distribution title="Student Load" rows={studentLoadRows} total={total} tone="from-blue-600 to-cyan-600" />
        <Distribution title="Finance Coverage" rows={financeRows} total={total} tone="from-amber-500 to-orange-600" />
      </div>
    </div>
  );
};

const bucketCount = (count: number, label: 'groups' | 'students') => {
  if (count === 0) return `0 ${label}`;
  if (label === 'groups') return count <= 2 ? '1-2 groups' : count <= 4 ? '3-4 groups' : '5+ groups';
  return count <= 10 ? '1-10 students' : count <= 30 ? '11-30 students' : count <= 60 ? '31-60 students' : '61+ students';
};

const average = (sum: number, total: number) => total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

const Insight = ({ title, value, detail, tone }: { title: string; value: string | number; detail: string; tone: string }) => {
  const { t } = useLanguage();
  return (
    <Card className="overflow-hidden rounded-md border-0 bg-white shadow-sm dark:bg-white/[0.04]">
      <div className={cn('h-1 bg-gradient-to-r', tone)} />
      <CardContent className="p-3">
        <p className="text-[10px] font-black uppercase text-slate-500">{t(title)}</p>
        <p className="text-xl font-black leading-tight text-slate-950 dark:text-white">{value}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
};

const Progress = ({ title, description, items, total }: { title: string; description: string; items: BarItem[]; total: number }) => {
  const { t } = useLanguage();
  return (
    <Card className="border-slate-200/60 bg-white/80 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-900 dark:text-white">{t(title)}</CardTitle>
        <CardDescription className="text-slate-500 dark:text-white/55">{t(description)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => <ProgressRow key={item.label} item={item} total={total} />)}
      </CardContent>
    </Card>
  );
};

const ProgressRow = ({ item, total }: { item: BarItem; total: number }) => {
  const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <Badge variant="outline" className={cn('text-xs font-medium', item.badgeClass)}>{item.label}</Badge>
        <span className="text-xs text-slate-500 dark:text-white/45">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/5">
        <div className={cn('h-full rounded-full transition-all duration-300', item.color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const Distribution = ({ title, rows, total, tone }: { title: string; rows: Row[]; total: number; tone: string }) => {
  const { t } = useLanguage();
  return (
    <Card className="overflow-hidden rounded-md border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className={cn('h-1 bg-gradient-to-r', tone)} />
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm font-black text-slate-950 dark:text-white">{t(title)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        {rows.slice(0, 8).map((row) => {
          const percent = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
              <span className="truncate font-black text-slate-800 dark:text-white/85">{row.label}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700">{row.count} · {percent}%</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
