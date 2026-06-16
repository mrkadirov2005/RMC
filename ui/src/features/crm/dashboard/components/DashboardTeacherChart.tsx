import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardCollections } from '../types';
import { useLanguage } from '../../../../i18n/LanguageContext';

interface Props {
  collections: DashboardCollections;
}

const barColors = [
  'from-blue-500 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-violet-500 to-purple-600',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
  'from-lime-400 to-green-600',
  'from-fuchsia-400 to-pink-600',
];

export const DashboardTeacherChart = ({ collections }: Props) => {
  const { t } = useLanguage();

  const teacherData = useMemo(() => {
    const teacherMap = new Map<number, { name: string; count: number }>();
    for (const teacher of collections.teachers) {
      const id = Number(teacher.teacher_id);
      if (!id) continue;
      const name = [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || `Teacher #${id}`;
      teacherMap.set(id, { name, count: 0 });
    }
    for (const student of collections.students) {
      const teacherId = Number(student.teacher_id);
      if (!teacherId) continue;
      const entry = teacherMap.get(teacherId);
      if (entry) entry.count += 1;
    }
    return Array.from(teacherMap.values())
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [collections]);

  const maxCount = teacherData[0]?.count || 1;

  if (teacherData.length === 0) return null;

  return (
    <Card className="overflow-hidden border-violet-100/80 bg-gradient-to-br from-white via-violet-50/40 to-fuchsia-50/40 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
      <CardHeader className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-400 dark:hidden" />
        <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-card-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-50 text-violet-700 dark:h-auto dark:w-auto dark:bg-transparent dark:text-violet-600">
            <BarChart3 className="h-5 w-5" />
          </span>
          {t('Students per Teacher')}
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">{t('Top teachers by assigned student count.')}</p>
      </CardHeader>
      <CardContent className="space-y-2.5 pb-5">
        {teacherData.map((teacher, i) => {
          const pct = Math.max((teacher.count / maxCount) * 100, 3);
          return (
            <div key={teacher.name} className="flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-xs font-medium">{teacher.name}</span>
              <div className="relative flex-1 h-7 rounded-md bg-slate-100/80 dark:bg-muted overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-md bg-gradient-to-r ${barColors[i % barColors.length]} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {teacher.count}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
