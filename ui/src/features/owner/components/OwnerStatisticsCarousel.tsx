import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PieChart, type PieSlice } from '@/shared/components/PieChart';

type Slide = { title: string; value: string; detail: string; data: PieSlice[] };

interface Props {
  centerLabel: string;
  centers: number;
  students: number;
  teachers: number;
  groups: number;
  admins: number;
  payments: number;
}

const Chart = ({ slide, compact = false }: { slide: Slide; compact?: boolean }) => (
  <div className={`grid items-center gap-5 ${compact ? '' : 'sm:grid-cols-[210px_1fr]'}`}>
    <div className="flex justify-center rounded-xl bg-slate-950 p-4">
      <PieChart data={slide.data} size={compact ? 150 : 180} strokeWidth={compact ? 24 : 28} />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{slide.title}</p>
      <p className="mt-1 text-4xl font-black text-slate-950 dark:text-white">{slide.value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{slide.detail}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {slide.data.map((slice) => {
          const repeatsHeadline = slide.value === slice.value.toLocaleString();
          return <span key={slice.label} className="inline-flex items-center gap-1.5 text-xs font-medium"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />{slice.label}{repeatsHeadline ? '' : `: ${slice.value.toLocaleString()}`}</span>;
        })}
      </div>
    </div>
  </div>
);

export const OwnerStatisticsCarousel = ({ centerLabel, centers, students, teachers, groups, admins, payments }: Props) => {
  const slides = useMemo<Slide[]>(() => [
    {
      title: 'Students', value: students.toLocaleString(), detail: `Enrolled at ${centerLabel}.`,
      data: [{ label: 'Students', value: students, color: '#3b82f6' }, { label: 'Teachers', value: teachers, color: '#10b981' }, { label: 'Admins', value: admins, color: '#8b5cf6' }],
    },
    {
      title: 'Learning network', value: `${groups ? Math.round(students / groups) : 0} / group`, detail: 'Average number of students in each group.',
      data: [{ label: 'Groups', value: groups, color: '#f59e0b' }, { label: 'Centers', value: centers, color: '#06b6d4' }],
    },
    {
      title: 'Payment activity', value: `${students ? (payments / students).toFixed(1) : '0.0'} / student`, detail: 'Average recorded payments per enrolled student.',
      data: [{ label: 'Payments', value: payments, color: '#ec4899' }, { label: 'Students', value: students, color: '#6366f1' }],
    },
  ], [admins, centerLabel, centers, groups, payments, students, teachers]);

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      {slides.map((slide) => (
        <Card key={slide.title} className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
          <CardContent className="p-4"><Chart slide={slide} compact /></CardContent>
        </Card>
      ))}
    </div>
  );
};
