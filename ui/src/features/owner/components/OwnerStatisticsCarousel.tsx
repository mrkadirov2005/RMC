import { useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  currentMonthPayments: number;
  previousMonthPayments: number;
  paidStudentsThisMonth: number;
  todayPayments: number;
  yesterdayPayments: number;
  paidStudentsToday: number;
  paidStudentsYesterday: number;
  attendancePresent: number;
  attendanceAbsent: number;
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

export const OwnerStatisticsCarousel = ({ centerLabel, students, teachers, admins, currentMonthPayments, previousMonthPayments, paidStudentsToday, paidStudentsYesterday, attendancePresent, attendanceAbsent }: Props) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const slides = useMemo<Slide[]>(() => {
    const paymentChange = currentMonthPayments - previousMonthPayments;
    const todayPercentage = students ? Math.round((Math.min(paidStudentsToday, students) / students) * 100) : 0;
    const yesterdayPercentage = students ? Math.round((Math.min(paidStudentsYesterday, students) / students) * 100) : 0;
    const percentageChange = todayPercentage - yesterdayPercentage;
    const attendanceTotal = attendancePresent + attendanceAbsent;
    const attendancePercentage = attendanceTotal ? Math.round((attendancePresent / attendanceTotal) * 100) : 0;
    const paymentTrend = paymentChange > 0
      ? `Increasing by ${paymentChange.toLocaleString()} compared with last month.`
      : paymentChange < 0
        ? `Decreasing by ${Math.abs(paymentChange).toLocaleString()} compared with last month.`
        : 'No change compared with last month.';
    const percentageTrend = percentageChange > 0
      ? `Up ${percentageChange} percentage points from yesterday.`
      : percentageChange < 0
        ? `Down ${Math.abs(percentageChange)} percentage points from yesterday.`
        : 'No percentage change from yesterday.';

    return [
      {
        title: 'Overall students', value: students.toLocaleString(), detail: `Enrolled at ${centerLabel}.`,
        data: [{ label: 'Students', value: students, color: '#3b82f6' }, { label: 'Staff', value: teachers + admins, color: '#10b981' }],
      },
      {
        title: 'Overall teachers', value: teachers.toLocaleString(), detail: `Teaching at ${centerLabel}.`,
        data: [{ label: 'Teachers', value: teachers, color: '#f59e0b' }, { label: 'Admins', value: admins, color: '#06b6d4' }],
      },
      {
        title: 'Monthly payment count', value: currentMonthPayments.toLocaleString(), detail: paymentTrend,
        data: [{ label: 'This month', value: currentMonthPayments, color: '#ec4899' }, { label: 'Last month', value: previousMonthPayments, color: '#6366f1' }],
      },
      {
        title: 'Daily payment percentage', value: `${todayPercentage}%`, detail: percentageTrend,
        data: [{ label: 'Today', value: todayPercentage, color: '#10b981' }, { label: 'Yesterday', value: yesterdayPercentage, color: '#f59e0b' }],
      },
      {
        title: 'Overall attendance', value: `${attendancePercentage}%`, detail: 'Present and late attendance across all recorded sessions.',
        data: [{ label: 'Present', value: attendancePresent, color: '#14b8a6' }, { label: 'Absent', value: attendanceAbsent, color: '#f43f5e' }],
      },
    ];
  }, [admins, attendanceAbsent, attendancePresent, centerLabel, currentMonthPayments, paidStudentsToday, paidStudentsYesterday, previousMonthPayments, students, teachers]);

  const move = (direction: number) => sliderRef.current?.scrollBy({ left: direction * 400, behavior: 'smooth' });

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Scroll statistics left" onClick={() => move(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Scroll statistics right" onClick={() => move(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div ref={sliderRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {slides.map((slide) => (
          <Card key={slide.title} className="min-w-[280px] snap-start overflow-hidden border-slate-200 bg-white shadow-sm sm:min-w-[340px] lg:min-w-[380px] dark:border-border dark:bg-card">
            <CardContent className="p-4">
              <Chart slide={slide} compact />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
