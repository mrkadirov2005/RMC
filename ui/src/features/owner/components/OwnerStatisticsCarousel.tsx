import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [paused, setPaused] = useState(false);
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

  useEffect(() => {
    if (showAll || paused) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 5600);
    return () => window.clearInterval(timer);
  }, [paused, showAll, slides.length]);

  const move = (direction: number) => setIndex((current) => (current + direction + slides.length) % slides.length);

  return <>
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <CardContent className="p-4 sm:p-5">
        <div className="grid overflow-hidden">
          {slides.map((slide, slideIndex) => (
            <div
              key={slide.title}
              aria-hidden={slideIndex !== index}
              className={`col-start-1 row-start-1 transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                slideIndex === index
                  ? 'pointer-events-auto translate-x-0 scale-100 opacity-100'
                  : slideIndex < index
                    ? 'pointer-events-none -translate-x-8 scale-[0.985] opacity-0'
                    : 'pointer-events-none translate-x-8 scale-[0.985] opacity-0'
              }`}
            >
              <Chart slide={slide} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-1.5">{slides.map((slide, slideIndex) => <button key={slide.title} type="button" aria-label={`Show ${slide.title}`} onClick={() => setIndex(slideIndex)} className={`h-1.5 rounded-full transition-all ${slideIndex === index ? 'w-7 bg-indigo-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />)}</div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setShowAll(true)}><LayoutGrid className="mr-1.5 h-4 w-4" />See all</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Dialog open={showAll} onOpenChange={setShowAll}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Platform overview</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-3">{slides.map((slide) => <Card key={slide.title}><CardContent className="p-4"><Chart slide={slide} compact /></CardContent></Card>)}</div>
      </DialogContent>
    </Dialog>
  </>;
};
