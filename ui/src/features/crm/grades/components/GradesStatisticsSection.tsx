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
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">Overview</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3">
            <p className="text-xs text-white/70">Students</p>
            <p className="text-lg font-bold text-white">{studentsCount}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3">
            <p className="text-xs text-white/70">Classes</p>
            <p className="text-lg font-bold text-white">{classesCount}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-3">
            <p className="text-xs text-white/70">Teachers</p>
            <p className="text-lg font-bold text-white">{teachersCount}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-3">
            <p className="text-xs text-white/70">Subjects</p>
            <p className="text-lg font-bold text-white">{subjectsCount}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Grade Distribution</p>
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
                    <div className="flex h-28 w-full items-end rounded-xl bg-muted/30 p-1.5">
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

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Grade Mix</p>
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

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm xl:grid-cols-4">
            {gradeStatistics.segments.map((segment) => (
              <div key={segment.label} className="rounded-xl border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Grade {segment.label}</p>
                <p className="font-semibold">{segment.count}</p>
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
