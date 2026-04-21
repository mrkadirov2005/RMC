import { cn } from '@/lib/utils';
import type { ClassItem, CalendarDay, SessionItem } from './types';
import { getTimeSlots, parseTimeToMinutes, toLocalDateKey } from './utils';

interface WeekViewProps {
  weekDays: CalendarDay[];
  sessions: SessionItem[];
  classes: ClassItem[];
  today: Date;
  displayMonth: number;
  displayYear: number;
  isSuperuser: boolean;
  onOpenSessionModal: (cls: ClassItem, sid: number, date: string) => void;
  schedule?: any[];
}

export const WeekView: React.FC<WeekViewProps> = ({
  weekDays,
  sessions,
  classes,
  today,
  displayMonth,
  displayYear,
  isSuperuser,
  onOpenSessionModal,
  schedule = [],
}) => {

  // Get sessions grouped by day
  const getSessionsByDay = () => {
    const sessionsByDay = new Map<string, SessionItem[]>();
    
    weekDays.forEach(day => {
      sessionsByDay.set(day.isoDate, []);
    });

    sessions.forEach(session => {
      const dateKey = toLocalDateKey(session.session_date);
      if (sessionsByDay.has(dateKey)) {
        sessionsByDay.get(dateKey)?.push(session);
      }
    });

    // Sort sessions by start time
    sessionsByDay.forEach(daySession => {
      daySession.sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
    });

    return sessionsByDay;
  };

  const timeSlots = getTimeSlots();
  const sessionsByDay = getSessionsByDay();

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Header with days */}
        <div className="flex gap-0 border-b">
          <div className="w-20 flex-shrink-0 border-r bg-muted/50 font-semibold text-xs p-2 text-center">
            Time
          </div>
          {weekDays.map((day) => {
            const isToday =
              day.date === today.getDate() &&
              today.getMonth() === displayMonth &&
              today.getFullYear() === displayYear;
            return (
              <div
                key={day.isoDate}
                className={cn(
                  'flex-1 min-w-[140px] border-r p-3 text-center',
                  isToday ? 'bg-amber-50/60' : 'bg-background',
                  !day.isCurrentMonth && 'bg-muted/30'
                )}
              >
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {day.dayName.substring(0, 3)}
                </div>
                <div className={cn(
                  'text-lg font-bold mt-1',
                  isToday ? 'text-amber-900' : 'text-foreground'
                )}>
                  {day.date}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        {timeSlots.map((timeSlot) => {
          const timeInMinutes = parseTimeToMinutes(timeSlot);
          const nextTimeInMinutes = timeInMinutes + 60;

          return (
            <div key={timeSlot} className="flex gap-0 border-b">
              <div className="w-20 flex-shrink-0 border-r bg-muted/50 p-2 text-center text-xs font-medium">
                {timeSlot}
              </div>
              {weekDays.map((day) => {
                const daySessionList = sessionsByDay.get(day.isoDate) || [];
                const sessionsInSlot = daySessionList.filter(session => {
                  const sessionStart = parseTimeToMinutes(session.start_time);
                  const sessionEnd = sessionStart + (session.duration_minutes || 60);
                  return sessionStart < nextTimeInMinutes && sessionEnd > timeInMinutes;
                });

                const isToday =
                  day.date === today.getDate() &&
                  today.getMonth() === displayMonth &&
                  today.getFullYear() === displayYear;

                return (
                  <div
                    key={`${day.isoDate}-${timeSlot}`}
                    className={cn(
                      'flex-1 min-w-[140px] border-r p-2 relative h-20',
                      isToday ? 'bg-amber-50/30' : 'bg-background',
                      !day.isCurrentMonth && 'bg-muted/30'
                    )}
                  >
                    <div className="space-y-1 h-full">
                      {/* Recurring Schedule */}
                      {schedule
                        .filter(item => {
                          const isPlanned = item.day === day.dayName && item.time === timeSlot;
                          if (!isPlanned) return false;
                          // Avoid showing planned if a real session exists for this class in this slot
                          const hasSession = sessionsInSlot.some(s => 
                            Number(s.class_id) === Number(item.class_id)
                          );
                          return !hasSession;
                        })
                        .map((item, idx) => (
                          <div 
                            key={`recurring-${day.isoDate}-${timeSlot}-${idx}`}
                            className="rounded-md border border-amber-200 bg-amber-50/50 px-2 py-1 text-[0.6rem] font-semibold leading-tight text-amber-900 mb-1"
                          >
                            <div className="font-bold">Regular Class</div>
                            <div>{item.room_number}</div>
                          </div>
                        ))}


                      {sessionsInSlot.map((session) => {
                        const classItem = classes.find(c => Number(c.class_id || c.id) === Number(session.class_id));
                        if (!classItem) return null;

                        return (
                          <div
                            key={`${session.session_id}`}
                            className={cn(
                              'rounded-md p-1 text-[0.65rem] font-semibold cursor-pointer hover:shadow-md transition-shadow border',
                              isSuperuser
                                ? 'bg-sky-100 text-sky-900 border-sky-300'
                                : 'bg-primary/10 text-primary border-primary/30',
                            )}
                            onClick={() => onOpenSessionModal(classItem, session.session_id, day.isoDate)}
                            title={`${classItem.class_name} - ${session.start_time}`}
                          >
                            <div className="font-bold truncate">{classItem.class_name}</div>
                            <div className="text-[0.6rem] opacity-80">{session.start_time}</div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
