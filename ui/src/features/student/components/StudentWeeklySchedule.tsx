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
  <Card className="overflow-hidden animate-fade-in animation-delay-400">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <CalendarDays className="h-4 w-4 text-primary" />
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
        'flex flex-col gap-2 rounded-xl border p-3 transition-all',
        isToday ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : 'bg-muted/30 border-transparent'
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn('text-[10px] font-bold uppercase tracking-wider', isToday ? 'text-primary' : 'text-muted-foreground')}>
          {t(day).substring(0, 3)}
        </span>
        {isToday && <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
      </div>

      <div className="min-h-[40px] space-y-1.5">
        {items.length === 0 ? (
          <div className="py-2 text-[10px] italic text-muted-foreground/50">{t('No class')}</div>
        ) : (
          items.map((item, index) => (
            <div key={index} className="rounded-lg border bg-background p-2 shadow-sm">
              <div className="text-[11px] font-bold leading-tight text-primary">{item.time}</div>
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
