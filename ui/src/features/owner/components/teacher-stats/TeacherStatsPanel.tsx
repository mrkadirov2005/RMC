import { useMemo, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, LineChart, PieChart as PieChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import type { OwnerManagerStatisticsCollections } from '../../types';
import { buildOwnerTeacherEarnings } from '../../utils';
import { StudentStatsChart } from '../student-stats/StudentStatsChart';
import type { StudentChartMode, StudentStatRow, StudentStatSlide } from '../student-stats/types';

interface Props {
  data: any[];
  collections: OwnerManagerStatisticsCollections;
}

const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6', '#06b6d4', '#64748b'];

const countByGender = (data: any[], gender: string) =>
  data.filter((item) => String(item?.gender || '').toLowerCase() === gender).length;

const countByStatus = (data: any[], status: string) =>
  data.filter((item) => String(item?.status || '').toLowerCase() === status).length;

const topCounts = (values: string[], fallback = 'Unknown'): StudentStatRow[] => {
  const map = new Map<string, number>();
  values.forEach((value) => {
    const label = String(value || '').trim() || fallback;
    map.set(label, (map.get(label) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const withColors = (rows: StudentStatRow[]) =>
  rows.map((row, index) => ({ ...row, color: row.color || chartColors[index % chartColors.length] }));

const bucketCount = (count: number, label: 'groups' | 'students') => {
  if (count === 0) return `0 ${label}`;
  if (label === 'groups') return count <= 2 ? '1-2 groups' : count <= 4 ? '3-4 groups' : '5+ groups';
  return count <= 10 ? '1-10 students' : count <= 30 ? '11-30 students' : count <= 60 ? '31-60 students' : '61+ students';
};

const average = (sum: number, total: number) => (total > 0 ? Math.round((sum / total) * 10) / 10 : 0);

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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeSlide, setActiveSlide] = useState(0);
  const [chartMode, setChartMode] = useState<StudentChartMode>('pie');

  const analytics = useMemo(() => buildTeacherAnalytics(data, collections, selectedMonth), [collections, data, selectedMonth]);
  const selectedSlide = analytics.slides[activeSlide] || analytics.slides[0];
  const monthLabel = useMemo(() => getMonthLabel(selectedMonth, language), [language, selectedMonth]);

  const goToSlide = (nextIndex: number) => {
    setActiveSlide((nextIndex + analytics.slides.length) % analytics.slides.length);
    setChartMode('pie');
  };

  if (!selectedSlide) return null;

  return (
    <div className="relative rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4 shadow-sm dark:border-white/10 dark:from-white/[0.04] dark:via-white/[0.03] dark:to-white/[0.04]">
      <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">{t('Teacher analytics')}</p>
          <p className="text-xs font-semibold text-slate-500 dark:text-white/55">{monthLabel}</p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => {
            setSelectedMonth(event.target.value);
            setActiveSlide(0);
            setChartMode('pie');
          }}
          className="h-8 rounded-md border border-emerald-100 bg-white px-2 text-xs font-bold text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      <NavButton direction="left" onClick={() => goToSlide(activeSlide - 1)} />
      <NavButton direction="right" onClick={() => goToSlide(activeSlide + 1)} />

      <div className="mx-auto max-w-6xl rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Insight label="Group Coverage" value={`${analytics.coveredTeachers}/${data.length}`} detail={`${average(analytics.totalGroups, data.length)} avg groups`} />
          <Insight label="Student Load" value={analytics.totalStudents.toLocaleString()} detail={`${Math.round(average(analytics.totalStudents, data.length))} avg students`} />
          <Insight label="Paid Students" value={analytics.paidStudents.toLocaleString()} detail={`${analytics.unpaidStudents} unpaid`} />
          <Insight label="Specializations" value={analytics.specializations.toLocaleString()} detail={`${analytics.totalGroups} groups`} />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-slate-950 dark:text-white">{t(selectedSlide.title)}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-white/55">{t(selectedSlide.description)}</p>
          </div>
          <span className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">
            {activeSlide + 1}/{analytics.slides.length}
          </span>
          <ChartModeButtons mode={chartMode} onChange={setChartMode} />
        </div>

        <div className="min-h-[360px] rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-slate-950/20">
          <StudentStatsChart
            key={`${selectedMonth}-${activeSlide}-${chartMode}`}
            mode={chartMode}
            rows={selectedSlide.rows}
            total={selectedSlide.total}
            modalListTitle={chartMode === 'pie' ? t(selectedSlide.title) : undefined}
          />
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto rounded-md border border-slate-100 bg-white p-1.5 dark:border-white/10 dark:bg-white/[0.03]">
          {analytics.slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => goToSlide(index)}
              className={cn(
                'shrink-0 rounded px-2.5 py-1.5 text-xs font-black transition',
                activeSlide === index
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
              )}
            >
              {t(slide.title)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const buildTeacherAnalytics = (data: any[], collections: OwnerManagerStatisticsCollections, selectedMonth: string) => {
  const total = data.length;
  const teacherEarnings = buildOwnerTeacherEarnings(collections.students, collections.teachers, collections.classes, collections.payments, selectedMonth);
  const teacherClassMap = new Map<number, number>();
  collections.classes.forEach((cls) => {
    const teacherId = Number(cls?.teacher_id || 0);
    if (teacherId) teacherClassMap.set(teacherId, (teacherClassMap.get(teacherId) || 0) + 1);
  });
  const classTeacherMap = new Map<number, number>();
  collections.classes.forEach((cls) => {
    const classId = Number(cls?.class_id || cls?.id || 0);
    const teacherId = Number(cls?.teacher_id || 0);
    if (classId && teacherId) classTeacherMap.set(classId, teacherId);
  });
  const teacherStudentMap = new Map<number, number>();
  collections.students.forEach((student) => {
    const teacherId = Number(student?.teacher_id || classTeacherMap.get(Number(student?.class_id || 0)) || 0);
    if (teacherId) teacherStudentMap.set(teacherId, (teacherStudentMap.get(teacherId) || 0) + 1);
  });

  const topSpecs = topCounts(data.map((teacher) => teacher?.specialization), 'No specialization');
  const paidStudents = teacherEarnings.reduce((sum, row) => sum + row.paidStudents, 0);
  const unpaidStudents = teacherEarnings.reduce((sum, row) => sum + row.unpaidStudents, 0);
  const totalGroups = Array.from(teacherClassMap.values()).reduce((sum, count) => sum + count, 0);
  const totalStudents = Array.from(teacherStudentMap.values()).reduce((sum, count) => sum + count, 0);
  const coveredTeachers = data.filter((teacher) => (teacherClassMap.get(Number(teacher?.teacher_id || teacher?.id || 0)) || 0) > 0).length;

  const slides: StudentStatSlide[] = [
    {
      title: 'Overview',
      description: 'Main teacher numbers at a glance.',
      rows: withColors([
        { label: 'Total Teachers', count: total },
        { label: 'Active', count: countByStatus(data, 'active') },
        { label: 'With Groups', count: coveredTeachers },
        { label: 'Retired', count: countByStatus(data, 'retired') },
      ]),
      total,
    },
    {
      title: 'Gender Breakdown',
      description: 'Teacher distribution by gender.',
      rows: withColors([
        { label: 'Male', count: countByGender(data, 'male') },
        { label: 'Female', count: countByGender(data, 'female') },
        { label: 'Other', count: Math.max(total - countByGender(data, 'male') - countByGender(data, 'female'), 0) },
      ]),
      total,
    },
    {
      title: 'Monthly Payment Coverage',
      description: 'Teacher payment health for selected month.',
      rows: withColors([
        { label: 'Paid students', count: paidStudents, color: '#10b981' },
        { label: 'Unpaid students', count: unpaidStudents, color: '#e11d48' },
      ]),
      total: paidStudents + unpaidStudents,
    },
    { title: 'Specializations', description: 'Teacher specialization distribution.', rows: withColors(topSpecs), total },
    {
      title: 'Group Load',
      description: 'How many groups teachers manage.',
      rows: withColors(topCounts(data.map((teacher) => bucketCount(teacherClassMap.get(Number(teacher?.teacher_id || teacher?.id || 0)) || 0, 'groups')))),
      total,
    },
    {
      title: 'Student Load',
      description: 'How many students teachers handle.',
      rows: withColors(topCounts(data.map((teacher) => bucketCount(teacherStudentMap.get(Number(teacher?.teacher_id || teacher?.id || 0)) || 0, 'students')))),
      total,
    },
    {
      title: 'Finance Coverage',
      description: 'Teacher finance state for the selected month.',
      rows: withColors([
        { label: 'With paid students', count: teacherEarnings.filter((row) => row.paidStudents > 0).length },
        { label: 'No paid students', count: teacherEarnings.filter((row) => row.paidStudents === 0).length },
        { label: 'Has unpaid students', count: teacherEarnings.filter((row) => row.unpaidStudents > 0).length },
        { label: 'Fully paid groups', count: teacherEarnings.filter((row) => row.totalStudents > 0 && row.unpaidStudents === 0).length },
      ]),
      total,
    },
  ];

  return { slides, totalGroups, totalStudents, coveredTeachers, paidStudents, unpaidStudents, specializations: topSpecs.length };
};

const Insight = ({ label, value, detail }: { label: string; value: string | number; detail: string }) => {
  const { t } = useLanguage();
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-black uppercase text-slate-500">{t(label)}</p>
      <p className="text-lg font-black leading-tight text-slate-950 dark:text-white">{value}</p>
      <p className="text-xs font-semibold text-slate-500">{detail}</p>
    </div>
  );
};

const NavButton = ({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) => {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:bg-slate-950 dark:text-white',
        direction === 'left' ? 'left-2' : 'right-2'
      )}
      aria-label={direction === 'left' ? 'Previous statistic' : 'Next statistic'}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
};

const ChartModeButtons = ({ mode, onChange }: { mode: StudentChartMode; onChange: (mode: StudentChartMode) => void }) => (
  <div className="flex items-center gap-1">
    {([
      { mode: 'pie', label: 'Pie', Icon: PieChartIcon },
      { mode: 'bar', label: 'Bar', Icon: BarChart3 },
      { mode: 'line', label: 'Line', Icon: LineChart },
    ] as const).map(({ mode: value, label, Icon }) => (
      <button
        key={value}
        type="button"
        onClick={() => onChange(value)}
        className={cn(
          'inline-flex h-8 items-center rounded-md border px-2 text-xs font-black transition',
          mode === value
            ? 'border-emerald-500 bg-emerald-600 text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
        )}
      >
        <Icon className="mr-1 h-3.5 w-3.5" />
        {label}
      </button>
    ))}
  </div>
);
