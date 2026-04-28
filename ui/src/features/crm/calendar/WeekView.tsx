// View component for the calendar screen in the crm feature.

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ClassItem, CalendarDay, SessionItem } from './types';
import {
  getConfiguredLessonDurationMinutes,
  getTimeSlots,
  parseTimeToMinutes,
  toLocalDateKey,
} from './utils';

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

type SelectedSlot = {
  day: CalendarDay;
  timeSlot: string;
  sessions: Array<{ cls: ClassItem; session: SessionItem }>;
};

type RenderedSession = {
  cls: ClassItem;
  session: SessionItem;
  startMinutes: number;
  endMinutes: number;
};

const SLOT_HEIGHT_REM = 5;
const SLOT_MINUTES = 60;

// Renders the week view view.
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
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  const fallbackDurationMinutes = getConfiguredLessonDurationMinutes();
  const timeSlots = getTimeSlots();

// Memoizes the day sessions by date derived value.
  const daySessionsByDate = useMemo(() => {
    const map = new Map<string, RenderedSession[]>();

    weekDays.forEach((day) => {
      const daySessions = sessions
        .filter((session) => toLocalDateKey(session.session_date) === day.isoDate)
        .map((session) => {
          const cls = classes.find((item) => Number(item.class_id || item.id) === Number(session.class_id));
          if (!cls) return null;

          const startMinutes = parseTimeToMinutes(session.start_time);
          const durationMinutes =
            Number(session.duration_minutes) > 0 ? Number(session.duration_minutes) : fallbackDurationMinutes;

          return {
            cls,
            session,
            startMinutes,
            endMinutes: startMinutes + durationMinutes,
          } as RenderedSession;
        })
        .filter((entry): entry is RenderedSession => Boolean(entry))
        .sort((a, b) => {
          if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
          if (a.endMinutes !== b.endMinutes) return a.endMinutes - b.endMinutes;
          return a.cls.class_name.localeCompare(b.cls.class_name);
        });

      map.set(day.isoDate, daySessions);
    });

    return map;
  }, [classes, fallbackDurationMinutes, sessions, weekDays]);

  const activeSlot = selectedSlot;
  const activeSlotDate = activeSlot?.day.isoDate ?? '';
  const activeSlotSessions = activeSlot?.sessions ?? [];

// Opens slot.
  const openSlot = (
    day: CalendarDay,
    timeSlot: string,
    sessionsAtSlot: Array<{ cls: ClassItem; session: SessionItem }>
  ) => {
    setSelectedSlot({ day, timeSlot, sessions: sessionsAtSlot });
  };

  return (
    <>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-0 border-b">
            <div className="w-20 flex-shrink-0 border-r bg-muted/50 p-2 text-center text-xs font-semibold">
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
                  <div className={cn('mt-1 text-lg font-bold', isToday ? 'text-amber-900' : 'text-foreground')}>
                    {day.date}
                  </div>
                </div>
              );
            })}
          </div>

          {timeSlots.map((timeSlot) => {
            const slotStartMinutes = parseTimeToMinutes(timeSlot);
            const slotEndMinutes = slotStartMinutes + SLOT_MINUTES;

            return (
              <div key={timeSlot} className="flex gap-0 border-b">
                <div className="w-20 flex-shrink-0 border-r bg-muted/50 p-2 text-center text-xs font-medium">
                  {timeSlot}
                </div>

                {weekDays.map((day) => {
                  const sessionsForDay = daySessionsByDate.get(day.isoDate) || [];

                  const activeSessions = sessionsForDay
                    .filter((entry) => entry.startMinutes < slotEndMinutes && entry.endMinutes > slotStartMinutes)
                    .map((entry) => ({ cls: entry.cls, session: entry.session }));

                  const startingSessions = sessionsForDay.filter(
                    (entry) => entry.startMinutes >= slotStartMinutes && entry.startMinutes < slotEndMinutes
                  );

                  const isToday =
                    day.date === today.getDate() &&
                    today.getMonth() === displayMonth &&
                    today.getFullYear() === displayYear;

                  const recurringItems = schedule.filter((item) => {
                    const isPlanned = item.day === day.dayName && item.time === timeSlot;
                    if (!isPlanned) return false;
                    const hasSession = activeSessions.some(
                      (s) => Number(s.cls.class_id || s.cls.id) === Number(item.class_id)
                    );
                    return !hasSession;
                  });

                  const hasSessions = activeSessions.length > 0;

                  return (
                    <div
                      key={`${day.isoDate}-${timeSlot}`}
                      className={cn(
                        'flex-1 min-w-[140px] border-r p-2 relative h-20 overflow-visible',
                        isToday ? 'bg-amber-50/30' : 'bg-background',
                        !day.isCurrentMonth && 'bg-muted/30',
                        hasSessions && 'cursor-pointer'
                      )}
                      onClick={() => {
                        if (hasSessions) {
                          openSlot(day, timeSlot, activeSessions);
                        }
                      }}
                    >
                      <div className="space-y-1 h-full overflow-visible">
                        {recurringItems.map((item, idx) => (
                          <div
                            key={`recurring-${day.isoDate}-${timeSlot}-${idx}`}
                            className="mb-1 rounded-md border border-amber-200 bg-amber-50/50 px-2 py-1 text-[0.6rem] font-semibold leading-tight text-amber-900"
                          >
                            <div className="font-bold">Regular Class</div>
                            <div>{item.room_number}</div>
                          </div>
                        ))}

                        {startingSessions.map(({ cls, session, startMinutes, endMinutes }) => {
                          const durationMinutes = Math.max(1, endMinutes - startMinutes);
                          const spanSlots = Math.max(1, Math.ceil(durationMinutes / SLOT_MINUTES));
                          const blockHeight = `calc(${spanSlots} * ${SLOT_HEIGHT_REM}rem - ${Math.max(0, spanSlots - 1)}px)`;

                          return (
                            <div
                              key={session.session_id}
                              className={cn(
                                'pointer-events-none relative z-20 rounded-md border p-1 text-[0.65rem] font-semibold shadow-sm',
                                isSuperuser
                                  ? 'border-sky-300 bg-sky-100 text-sky-900'
                                  : 'border-primary/30 bg-primary/10 text-primary'
                              )}
                              style={{ minHeight: blockHeight }}
                              title={`${cls.class_name} - ${session.start_time} to ${session.end_time}`}
                            >
                              <div className="truncate font-bold">{cls.class_name}</div>
                              <div className="text-[0.6rem] opacity-80">
                                {session.start_time} - {session.end_time}
                              </div>
                              <div className="mt-1 text-[0.58rem] font-medium opacity-70">
                                {spanSlots > 1 ? `${spanSlots} hours` : '1 hour'}
                              </div>
                            </div>
                          );
                        })}

                        {!hasSessions && recurringItems.length === 0 && <div className="h-full" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog
        open={Boolean(activeSlot)}
        onOpenChange={(open) => {
          if (!open) setSelectedSlot(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Planned lessons at {activeSlot?.timeSlot} on {activeSlot?.day.dayName}, {activeSlot?.day.date}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {activeSlotSessions.map(({ cls, session }) => (
              <div
                key={session.session_id}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3 text-sm',
                  isSuperuser ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-border bg-background'
                )}
              >
                <div>
                  <div className="font-semibold">{cls.class_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {session.start_time} - {session.end_time}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    onOpenSessionModal(cls, session.session_id, activeSlotDate);
                    setSelectedSlot(null);
                  }}
                >
                  Open
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
