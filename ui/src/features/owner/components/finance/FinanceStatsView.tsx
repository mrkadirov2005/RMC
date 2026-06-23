import { BarChart3, LineChart, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart } from '@/shared/components/PieChart';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';

type ChartMode = 'pie' | 'bar' | 'line';

interface TeacherRow {
  teacherId: number;
  teacherName: string;
  classCount: number;
  earnedAmount: number;
}

interface TeacherGroup {
  id: number;
  name: string;
  paidCount: number;
  unpaidCount: number;
  groupCollected: number;
  expectedAmount: number;
  paidPercent: number;
}

interface MonthlyTrend {
  month: string;
  collected: number;
}

interface PaymentStats {
  paidStudents: number;
  unpaidStudents: number;
  paidPercent: number;
  unpaidPercent: number;
}

interface Props {
  selectedMonth: string;
  expectedMonthlyTotal: number;
  totalCollected: number;
  unpaidEstimate: number;
  paymentStats: PaymentStats;
  teacherRows: TeacherRow[];
  statsTeacherId: number | null;
  selectedStatsTeacher: TeacherRow | null;
  statsTeacherGroups: TeacherGroup[];
  statsPaidPercent: number;
  statsPaidStudents: number;
  statsUnpaidStudents: number;
  statsCollected: number;
  statsExpected: number;
  chartMode: ChartMode;
  mostPaidGroups: TeacherGroup[];
  mostUnpaidGroups: TeacherGroup[];
  monthlyTrend: MonthlyTrend[];
  maxTrendCollected: number;
  linePoints: string;
  initials: (name: string) => string;
  onTeacherSelect: (teacherId: number) => void;
  onChartModeChange: (mode: ChartMode) => void;
}

export const FinanceStatsView = ({
  selectedMonth,
  expectedMonthlyTotal,
  totalCollected,
  unpaidEstimate,
  paymentStats,
  teacherRows,
  statsTeacherId,
  selectedStatsTeacher,
  statsTeacherGroups,
  statsPaidPercent,
  statsPaidStudents,
  statsUnpaidStudents,
  statsCollected,
  statsExpected,
  chartMode,
  mostPaidGroups,
  mostUnpaidGroups,
  monthlyTrend,
  maxTrendCollected,
  linePoints,
  initials,
  onTeacherSelect,
  onChartModeChange,
}: Props) => (
  <div className="space-y-3">
    <div className="grid gap-2 md:grid-cols-4">
      {[
        ['Kutilgan tolov', formatMoney(expectedMonthlyTotal), 'border-slate-200 bg-white text-slate-900'],
        ['Kelgan tolov', formatMoney(totalCollected), 'border-blue-200 bg-blue-50 text-blue-800'],
        ['Taxminiy qarz', formatMoney(unpaidEstimate), 'border-rose-200 bg-rose-50 text-rose-800'],
        ['Tolov ulushi', `${paymentStats.paidPercent}%`, 'border-emerald-200 bg-emerald-50 text-emerald-800'],
      ].map(([label, value, tone]) => (
        <div key={label} className={cn('rounded-md border p-3 shadow-sm', tone as string)}>
          <p className="text-[11px] font-black uppercase opacity-70">{label}</p>
          <p className="mt-1 text-xl font-black leading-tight">{value}</p>
        </div>
      ))}
      <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm md:col-span-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between gap-3 text-xs font-black text-slate-600">
          <span>{paymentStats.paidStudents} to'lagan</span>
          <span>{paymentStats.unpaidStudents} qarzdor</span>
        </div>
        <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="animate-chart-bar-fill bg-emerald-500" style={{ width: `${paymentStats.paidPercent}%` }} />
          <div className="animate-chart-bar-fill bg-rose-400" style={{ width: `${paymentStats.unpaidPercent}%`, animationDelay: '180ms' }} />
        </div>
      </div>
    </div>

    <div className="rounded-md border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex gap-2 overflow-x-auto border-b p-2 dark:border-white/10">
        {teacherRows.map((teacher, index) => {
          const active = statsTeacherId === teacher.teacherId;
          return (
            <button
              key={teacher.teacherId}
              type="button"
              onClick={() => onTeacherSelect(teacher.teacherId)}
              className={cn(
                'flex min-w-[190px] items-center gap-2 rounded-md border px-2 py-1.5 text-left transition',
                active ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50'
              )}
            >
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-black text-white', index % 2 ? 'bg-orange-600' : 'bg-blue-600')}>
                {initials(teacher.teacherName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-black text-slate-950">{teacher.teacherName}</span>
                <span className="block truncate text-[10px] font-bold text-slate-500">
                  {teacher.classCount} guruh · {formatMoney(teacher.earnedAmount)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                {selectedStatsTeacher?.teacherName || 'Oqituvchi tanlang'}
              </p>
              <p className="text-[11px] font-semibold text-slate-500">
                {selectedMonth} · {statsTeacherGroups.length} guruh · {statsPaidPercent}% to'langan
              </p>
            </div>
            <ChartModeButtons mode={chartMode} onChange={onChartModeChange} />
          </div>

          <FinanceChart
            key={`${statsTeacherId || 'all'}-${selectedMonth}-${chartMode}`}
            mode={chartMode}
            statsPaidStudents={statsPaidStudents}
            statsUnpaidStudents={statsUnpaidStudents}
            statsCollected={statsCollected}
            statsExpected={statsExpected}
            mostPaidGroups={mostPaidGroups}
            monthlyTrend={monthlyTrend}
            maxTrendCollected={maxTrendCollected}
            linePoints={linePoints}
          />
        </div>

        <FinanceRankings mostPaidGroups={mostPaidGroups} mostUnpaidGroups={mostUnpaidGroups} monthlyTrend={monthlyTrend} maxTrendCollected={maxTrendCollected} />
      </div>
    </div>
  </div>
);

const ChartModeButtons = ({ mode, onChange }: { mode: ChartMode; onChange: (mode: ChartMode) => void }) => (
  <>
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
          'inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-black transition',
          mode === value ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
        )}
      >
        <Icon className="mr-1.5 h-3.5 w-3.5" />
        {label}
      </button>
    ))}
  </>
);

const FinanceChart = ({
  mode,
  statsPaidStudents,
  statsUnpaidStudents,
  statsCollected,
  statsExpected,
  mostPaidGroups,
  monthlyTrend,
  maxTrendCollected,
  linePoints,
}: {
  mode: ChartMode;
  statsPaidStudents: number;
  statsUnpaidStudents: number;
  statsCollected: number;
  statsExpected: number;
  mostPaidGroups: TeacherGroup[];
  monthlyTrend: MonthlyTrend[];
  maxTrendCollected: number;
  linePoints: string;
}) => (
  <div className="animate-chart-open mt-3 min-h-[260px] rounded-md border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/20">
    {mode === 'pie' && (
      <div className="grid gap-3 md:grid-cols-[260px_1fr]">
        <div className="flex items-center justify-center">
          <PieChart
            size={230}
            strokeWidth={34}
            data={[
              { label: "To'lagan", value: statsPaidStudents, color: '#10b981' },
              { label: 'Qarzdor', value: statsUnpaidStudents, color: '#f43f5e' },
            ]}
          />
        </div>
        <div className="grid content-center gap-2">
          {[
            ["To'lagan talabalar", statsPaidStudents, 'bg-emerald-100 text-emerald-700'],
            ['Qarzdor talabalar', statsUnpaidStudents, 'bg-rose-100 text-rose-700'],
            ['Kelgan tolov', formatMoney(statsCollected), 'bg-blue-100 text-blue-700'],
            ['Kutilgan tolov', formatMoney(statsExpected), 'bg-slate-100 text-slate-700'],
          ].map(([label, value, tone]) => (
            <div key={label} className={cn('rounded px-3 py-2', tone as string)}>
              <p className="text-[10px] font-black uppercase opacity-70">{label}</p>
              <p className="text-lg font-black">{value}</p>
            </div>
          ))}
        </div>
      </div>
    )}
    {mode === 'bar' && <FinanceBarChart groups={mostPaidGroups} />}
    {mode === 'line' && <FinanceLineChart monthlyTrend={monthlyTrend} maxTrendCollected={maxTrendCollected} linePoints={linePoints} />}
  </div>
);

const FinanceBarChart = ({ groups }: { groups: TeacherGroup[] }) => (
  <div className="space-y-2">
    {groups.map((group) => (
      <div key={group.id} className="grid grid-cols-[130px_1fr_54px] items-center gap-2 text-xs">
        <span className="truncate font-black text-slate-700">{group.name}</span>
        <div className="flex h-5 overflow-hidden rounded bg-slate-100">
          <div className="animate-chart-bar-fill bg-emerald-500" style={{ width: `${group.paidPercent}%` }} />
          <div className="animate-chart-bar-fill bg-rose-400" style={{ width: `${Math.max(100 - group.paidPercent, 0)}%`, animationDelay: '160ms' }} />
        </div>
        <span className="text-right font-black text-slate-600">{group.paidPercent}%</span>
      </div>
    ))}
    {groups.length === 0 && <div className="flex h-48 items-center justify-center text-sm font-semibold text-slate-500">No group data</div>}
  </div>
);

const FinanceLineChart = ({ monthlyTrend, maxTrendCollected, linePoints }: { monthlyTrend: MonthlyTrend[]; maxTrendCollected: number; linePoints: string }) => (
  <div className="space-y-3">
    <div className="h-56 rounded bg-slate-50 p-3">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <polyline
          className="animate-chart-line-draw"
          pathLength={100}
          points={linePoints}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {monthlyTrend.map((item, index) => {
          const x = monthlyTrend.length > 1 ? (index / (monthlyTrend.length - 1)) * 100 : 50;
          const y = 92 - (item.collected / maxTrendCollected) * 84;
          return <circle key={item.month} className="animate-chart-point-pop" cx={x} cy={y} r="1.8" fill="#10b981" style={{ animationDelay: `${index * 80 + 450}ms` }} />;
        })}
      </svg>
    </div>
    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
      {monthlyTrend.slice(-4).map((item) => (
        <div key={item.month} className="rounded bg-blue-50 px-2 py-1.5 text-blue-800">
          <p className="text-[10px] font-black">{item.month}</p>
          <p className="text-xs font-black">{formatMoney(item.collected)}</p>
        </div>
      ))}
    </div>
  </div>
);

const FinanceRankings = ({
  mostPaidGroups,
  mostUnpaidGroups,
  monthlyTrend,
  maxTrendCollected,
}: {
  mostPaidGroups: TeacherGroup[];
  mostUnpaidGroups: TeacherGroup[];
  monthlyTrend: MonthlyTrend[];
  maxTrendCollected: number;
}) => (
  <div className="space-y-2">
    <FinanceRanking title="Eng yaxshi to'layotgan guruhlar" tone="emerald" groups={mostPaidGroups.slice(0, 5)} value={(group) => `${group.paidPercent}%`} />
    <FinanceRanking title="Eng kop qarzdor guruhlar" tone="rose" groups={mostUnpaidGroups.slice(0, 5)} value={(group) => `${group.unpaidCount} qarzdor`} />
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-xs font-black uppercase text-slate-500">Oylar boyicha umumiy tolov</p>
      <div className="mt-2 space-y-1.5">
        {monthlyTrend.slice(-6).map((item) => (
          <div key={item.month} className="grid grid-cols-[64px_1fr_auto] items-center gap-2 text-xs">
            <span className="font-black text-slate-500">{item.month.slice(5)}</span>
            <div className="h-2 rounded bg-slate-100">
              <div className="animate-chart-bar-fill h-2 rounded bg-blue-500" style={{ width: `${Math.round((item.collected / maxTrendCollected) * 100)}%` }} />
            </div>
            <span className="font-black text-slate-700">{formatMoney(item.collected)}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const FinanceRanking = ({
  title,
  tone,
  groups,
  value,
}: {
  title: string;
  tone: 'emerald' | 'rose';
  groups: TeacherGroup[];
  value: (group: TeacherGroup) => string;
}) => (
  <div className={cn('rounded-md border p-3', tone === 'emerald' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50')}>
    <p className={cn('text-xs font-black uppercase', tone === 'emerald' ? 'text-emerald-700' : 'text-rose-700')}>{title}</p>
    <div className="mt-2 space-y-1.5">
      {groups.map((group) => (
        <div key={group.id} className="flex items-center justify-between gap-2 rounded bg-white/80 px-2 py-1.5 text-xs">
          <span className="truncate font-black text-slate-800">{group.name}</span>
          <span className={cn('shrink-0 font-black', tone === 'emerald' ? 'text-emerald-700' : 'text-rose-700')}>{value(group)}</span>
        </div>
      ))}
    </div>
  </div>
);
