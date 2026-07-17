interface GradesStatisticsSectionProps {
  gradeStatistics: {
    totalGrades: number;
    averagePercentage: number;
    passingGrades: number;
    failingGrades: number;
    passRate: number;
    segments: Array<{ label: string; count: number; percent: number; className: string }>;
  };
  studentsCount: number;
  classesCount: number;
  teachersCount: number;
  subjectsCount: number;
}

const GradesStatisticsSection = ({
  gradeStatistics,
  studentsCount,
  classesCount,
  teachersCount,
  subjectsCount,
}: GradesStatisticsSectionProps) => {
  const segmentCardTone: Record<string, string> = {
    A: 'border-emerald-200 bg-emerald-50/80',
    B: 'border-blue-200 bg-blue-50/80',
    C: 'border-amber-200 bg-amber-50/80',
    D: 'border-orange-200 bg-orange-50/80',
    F: 'border-rose-200 bg-rose-50/80',
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-violet-50/70 to-fuchsia-50/80 p-5 shadow-sm dark:border-white/10 dark:from-white/[0.04] dark:via-white/[0.03] dark:to-fuchsia-500/10">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">Grade overview</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">High-level view of class coverage, grading volume, and subject reach.</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-right shadow-sm dark:border-white/10 dark:bg-slate-950/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Average</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{gradeStatistics.averagePercentage.toFixed(1)}%</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 shadow-lg shadow-blue-500/20">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/70">Students</p>
            <p className="mt-2 text-2xl font-black text-white">{studentsCount}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 shadow-lg shadow-emerald-500/20">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/70">Classes</p>
            <p className="mt-2 text-2xl font-black text-white">{classesCount}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 shadow-lg shadow-violet-500/20">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/70">Teachers</p>
            <p className="mt-2 text-2xl font-black text-white">{teachersCount}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 shadow-lg shadow-amber-500/20">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/70">Subjects</p>
            <p className="mt-2 text-2xl font-black text-white">{subjectsCount}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black">Grade Distribution</p>
              <p className="text-xs text-muted-foreground">Compact breakdown of A to F grade volume.</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{gradeStatistics.totalGrades} total grades</p>
              <p>{gradeStatistics.averagePercentage.toFixed(1)}% average</p>
            </div>
          </div>
          <div className="flex min-h-[9rem] items-end gap-3">
            {gradeStatistics.segments.some((segment) => segment.count > 0) ? (
              gradeStatistics.segments.map((segment) => {
                const maxCount = Math.max(...gradeStatistics.segments.map((entry) => entry.count), 1);
                const heightPercent = segment.count > 0 ? (segment.count / maxCount) * 100 : 12;
                return (
                  <div key={segment.label} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{segment.count}</span>
                    <div className="flex h-28 w-full items-end rounded-2xl bg-slate-100/80 p-1.5 dark:bg-white/[0.04]">
                      <div className={`w-full rounded-lg ${segment.className} shadow-sm`} style={{ height: `${Math.max(heightPercent, 12)}%` }} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium">Grade {segment.label}</p>
                      <p className="text-[11px] text-muted-foreground">{segment.percent.toFixed(0)}%</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No grade data yet
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black">Grade Mix</p>
              <p className="text-xs text-muted-foreground">Relative share of grade letters.</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{gradeStatistics.passingGrades} passing</p>
              <p>{gradeStatistics.failingGrades} failing</p>
            </div>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-muted shadow-inner">
            <div className="flex h-full w-full">
              {gradeStatistics.segments.map((segment) => (
                <div key={segment.label} className={`h-full transition-all duration-300 ${segment.className}`} style={{ width: `${segment.percent}%` }} />
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm xl:grid-cols-5">
            {gradeStatistics.segments.map((segment) => (
              <div key={segment.label} className={`rounded-2xl border p-3 ${segmentCardTone[segment.label] || 'border-slate-200 bg-slate-100/80'}`}>
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Grade {segment.label}</p>
                <p className="mt-1 text-lg font-black text-slate-900">{segment.count}</p>
                <p className="text-xs text-muted-foreground">{segment.percent.toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradesStatisticsSection;
