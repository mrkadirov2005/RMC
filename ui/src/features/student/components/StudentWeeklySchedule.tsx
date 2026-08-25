import { CalendarDays, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ScheduleItem } from '../types';

interface StudentWeeklyScheduleProps {
  daysOfWeek: string[];
  scheduleByDay: Record<string, ScheduleItem[]>;
  t: (value: string) => string;
}

export const StudentWeeklySchedule = ({ daysOfWeek, scheduleByDay, t }: StudentWeeklyScheduleProps) => (
  <Card className="animate-fade-in animation-delay-400">
    <CardHeader className="border-b">
      <CardTitle className="flex items-center gap-2 text-base text-foreground">
        <CalendarDays className="h-4 w-4 text-teal-700 dark:text-teal-300" />
        {t('Weekly Class Schedule')}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
        {daysOfWeek.map((day) => (
          <ScheduleDay key={day} day={day} items={scheduleByDay[day] || []} t={t} />
        ))}
      </div>
    </CardContent>
  </Card>
);

const ScheduleDay = ({ day, items, t }: { day: string; items: ScheduleItem[]; t: (value: string) => string }) => {
  const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3 transition-all',
        isToday ? 'border-teal-600/40 bg-teal-600/10 ring-1 ring-teal-600/20 dark:border-teal-400/40 dark:bg-teal-400/10' : 'bg-muted/40'
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn('text-[10px] font-bold uppercase tracking-wider', isToday ? 'text-teal-700 dark:text-teal-300' : 'text-muted-foreground')}>
          {t(day).substring(0, 3)}
        </span>
        {isToday && <div className="h-1.5 w-1.5 rounded-full bg-teal-600 dark:bg-teal-300" />}
      </div>

      <div className="min-h-[40px] space-y-1.5">
        {items.length === 0 ? (
          <div className="py-2 text-[10px] italic text-muted-foreground">{t('No class')}</div>
        ) : (
          items.map((item, index) => (
            <div key={index} className="rounded-lg border bg-card p-2 shadow-sm">
              <div className="text-[11px] font-bold leading-tight text-foreground">{item.time}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
                <MapPin className="h-2 w-2" />
                {t('Room')} {item.room_number}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
