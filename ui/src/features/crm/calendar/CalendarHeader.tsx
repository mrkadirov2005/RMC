// Source file for the calendar area in the crm feature.

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarHeaderProps {
  calendarView: 'month' | 'week';
  displayMonth: number;
  displayYear: number;
  weekStartDate: Date;
  onViewChange: (view: 'month' | 'week') => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

// Renders the calendar header module.
export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  calendarView,
  displayMonth,
  displayYear,
  weekStartDate,
  onViewChange,
  onPrevMonth,
  onNextMonth,
  onPrevWeek,
  onNextWeek,
}) => {
  const displayText = calendarView === 'month' 
    ? new Date(displayYear, displayMonth).toLocaleString('default', { month: 'long', year: 'numeric' })
    : `Week of ${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}-${String(weekStartDate.getDate()).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Current view</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-card-foreground">{displayText}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={calendarView} onValueChange={(v: any) => onViewChange(v)}>
          <TabsList className="bg-slate-100/80 dark:bg-muted">
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white/70 p-1 shadow-sm dark:border-border dark:bg-background dark:shadow-none">
          <Button 
            variant="outline" 
            size="sm"
            onClick={calendarView === 'month' ? onPrevMonth : onPrevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={calendarView === 'month' ? onNextMonth : onNextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
