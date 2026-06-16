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
  <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#32164f] via-[#4c1d95] to-[#0f766e] text-white shadow-lg shadow-violet-200/45 animate-fade-in animation-delay-400">
    <CardHeader className="border-b border-white/12">
      <CardTitle className="flex items-center gap-2 text-base text-white">
        <CalendarDays className="h-4 w-4 text-amber-200" />
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
        isToday ? 'border-amber-200/50 bg-amber-300/20 ring-1 ring-amber-200/30' : 'border-white/10 bg-white/10'
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn('text-[10px] font-bold uppercase tracking-wider', isToday ? 'text-amber-100' : 'text-white/65')}>
          {t(day).substring(0, 3)}
        </span>
        {isToday && <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-200" />}
      </div>

      <div className="min-h-[40px] space-y-1.5">
        {items.length === 0 ? (
          <div className="py-2 text-[10px] italic text-white/45">{t('No class')}</div>
        ) : (
          items.map((item, index) => (
            <div key={index} className="rounded-lg border border-white/12 bg-white/16 p-2 shadow-sm">
              <div className="text-[11px] font-bold leading-tight text-amber-100">{item.time}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[9px] text-white/65">
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
