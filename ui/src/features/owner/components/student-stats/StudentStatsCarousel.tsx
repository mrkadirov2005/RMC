import { useMemo, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, LineChart, PieChart as PieChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import type { OwnerManagerStatisticsCollections } from '../../types';
import { buildStudentStatSlides } from './studentStats';
import { StudentStatsChart } from './StudentStatsChart';
import type { StudentChartMode } from './types';

interface Props {
  data: any[];
  collections: OwnerManagerStatisticsCollections;
}

export const StudentStatsCarousel = ({ data, collections }: Props) => {
  const { t } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);
  const [chartMode, setChartMode] = useState<StudentChartMode>('pie');
  const slides = useMemo(() => buildStudentStatSlides(data, collections), [collections, data]);
  const selectedSlide = slides[activeSlide] || slides[0];

  const goToSlide = (nextIndex: number) => {
    setActiveSlide((nextIndex + slides.length) % slides.length);
    setChartMode('pie');
  };

  if (!selectedSlide) return null;

  return (
    <div className="relative rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-fuchsia-50 p-4 shadow-sm dark:border-white/10 dark:from-white/[0.04] dark:via-white/[0.03] dark:to-white/[0.04]">
      <div className="mx-auto mb-4 max-w-lg rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-sm font-black text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
        {t('Student analytics')}
      </div>

      <NavButton direction="left" onClick={() => goToSlide(activeSlide - 1)} />
      <NavButton direction="right" onClick={() => goToSlide(activeSlide + 1)} />

      <div className="mx-auto max-w-6xl rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-slate-950 dark:text-white">{t(selectedSlide.title)}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-white/55">{t(selectedSlide.description)}</p>
          </div>
          <span className="rounded bg-cyan-100 px-2 py-1 text-[11px] font-black text-cyan-700">
            {activeSlide + 1}/{slides.length}
          </span>
          <ChartModeButtons mode={chartMode} onChange={setChartMode} />
        </div>

        <div className="min-h-[360px] rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-slate-950/20">
          <StudentStatsChart
            key={`${activeSlide}-${chartMode}`}
            mode={chartMode}
            rows={selectedSlide.rows}
            total={selectedSlide.total}
            modalListTitle={chartMode === 'pie' ? t(selectedSlide.title) : undefined}
          />
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto rounded-md border border-slate-100 bg-white p-1.5 dark:border-white/10 dark:bg-white/[0.03]">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => goToSlide(index)}
              className={cn(
                'shrink-0 rounded px-2.5 py-1.5 text-xs font-black transition',
                activeSlide === index
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-cyan-100 hover:text-cyan-800'
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

const NavButton = ({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) => {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-white/10 dark:bg-slate-950 dark:text-white',
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
            ? 'border-blue-500 bg-blue-600 text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
        )}
      >
        <Icon className="mr-1 h-3.5 w-3.5" />
        {label}
      </button>
    ))}
  </div>
);
