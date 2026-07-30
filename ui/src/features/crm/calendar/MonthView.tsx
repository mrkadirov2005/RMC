// View component for the calendar screen in the crm feature.

import { CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassItem, CalendarDay, SessionItem } from './types';
import { weekDays } from '@/features/crm/classes/queries';
import { getCalendarGroupColorTheme } from './utils';

interface MonthViewProps {
  weeks: CalendarDay[][];
  eventsByDate: Map<string, Array<{ cls: ClassItem; session?: SessionItem }>>;
  attendanceByKey: Map<string, { present: number; absent: number }>;
  attendanceBySession: Map<number, { present: number; absent: number }>;
  studentAttendanceByDate: Map<string, string>;
  studentAttendanceBySession: Map<number, string>;
  today: Date;
  displayMonth: number;
  displayYear: number;
  isSuperuser: boolean;
  isStudent: boolean;
  canViewDetails: boolean;
  onOpenDay: (isoDate: string) => void;
  onDeleteSession: (classId: number, sessionId: number) => void;
  schedule?: any[];
}

const isWithinScheduleRange = (item: any, isoDate: string) => {
  const startDate = item.start_date ? String(item.start_date).split('T')[0] : '';
  const endDate = item.end_date ? String(item.end_date).split('T')[0] : '';
  if (startDate && isoDate < startDate) return false;
  if (endDate && isoDate > endDate) return false;
  return true;
};

// Renders the month view view.
export const MonthView: React.FC<MonthViewProps> = ({
  weeks,
  eventsByDate,
  attendanceByKey,
  attendanceBySession,
  studentAttendanceByDate,
  studentAttendanceBySession,
  today,
  displayMonth,
  displayYear,
  isSuperuser: _isSuperuser,
  isStudent,
  canViewDetails,
  onOpenDay,
  onDeleteSession,
  schedule = [],
}) => {

  return (
    <>
      <div className="mb-2 grid grid-cols-7 gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2 dark:border-border dark:bg-muted/30">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {day.substring(0, 3)}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map((day, dayIndex) => {
              const events = eventsByDate.get(day.isoDate) || [];
              const plannedForDay = day.isCurrentMonth
                ? schedule.filter((item) => item.day === day.dayName && isWithinScheduleRange(item, day.isoDate))
                : [];
              const hasClassDay = events.length > 0 || plannedForDay.length > 0;
              const isToday =
                day.isCurrentMonth &&
                day.date === today.getDate() &&
                today.getMonth() === displayMonth &&
                today.getFullYear() === displayYear;

              return (
                <div
                  key={dayIndex}
                  className={cn(
                    'min-h-[160px] rounded-lg border border-slate-200 bg-white p-3 flex flex-col gap-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-border dark:bg-card dark:shadow-none dark:hover:translate-y-0',
                    hasClassDay && day.isCurrentMonth && 'border-cyan-300 bg-cyan-50/50 ring-1 ring-cyan-200/80 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:ring-cyan-500/20',
                    !day.isCurrentMonth && 'bg-slate-50/70 text-muted-foreground dark:bg-muted/30',
                    isToday && 'ring-2 ring-amber-400/80 bg-gradient-to-br from-amber-50 to-white dark:bg-amber-950/20',
                    'cursor-pointer'
                  )}
                  onClick={() => onOpenDay(day.isoDate)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold', isToday ? 'bg-amber-400 text-amber-950' : hasClassDay && day.isCurrentMonth ? 'bg-cyan-600 text-white' : 'text-slate-700 dark:text-card-foreground')}>
                      {day.date}
                    </div>
                    {hasClassDay && day.isCurrentMonth ? (
                      <span className="rounded-full border border-cyan-200 bg-white/80 px-2 py-0.5 text-[0.6rem] font-black uppercase text-cyan-800 shadow-sm dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200">
                        Class day
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {/* Recurring Schedule */}
                    {plannedForDay
                      .filter(item => {
                        if (!isWithinScheduleRange(item, day.isoDate)) return false;
                        // Avoid showing planned if a real session exists for this class on this day
                        const hasSession = events.some(e => 
                          Number(e.cls.class_id || e.cls.id) === Number(item.class_id)
                        );
                        return !hasSession;
                      })
                      .map((item, idx) => (
                        <div 
                          key={`recurring-${day.isoDate}-${idx}`}
                          className="rounded-md border border-amber-200 bg-amber-50/80 px-2 py-1 text-[0.6rem] font-medium leading-tight text-amber-900 shadow-sm dark:bg-amber-500/10 dark:text-amber-300"
                        >
                          <div className="font-bold">Regular Class</div>
                          <div>{item.time}{item.end_time ? ` - ${String(item.end_time).substring(0, 5)}` : ''} - {item.room_number}</div>
                        </div>
                      ))}


                    {events.length === 0 && plannedForDay.length === 0 ? (
                      <span className="text-[0.7rem] text-muted-foreground">No classes</span>
                    ) : (

                      events.map(({ cls, session }, index) => {
                        const classId = Number(cls.class_id || cls.id);
                        const attendanceKey = `${classId}|${day.isoDate}`;
                        const attendanceCounts = session?.session_id
                          ? attendanceBySession.get(session.session_id)
                          : attendanceByKey.get(attendanceKey);
                        const studentStatus = session?.session_id
                          ? studentAttendanceBySession.get(session.session_id)
                          : studentAttendanceByDate.get(day.isoDate);
                        return (
                          <div
                            key={`${cls.class_id || cls.id}-${session?.session_id || 'no-session'}-${day.isoDate}-${index}`}
                            className={cn('rounded-md border px-2 py-1 text-[0.65rem] font-semibold leading-tight relative shadow-sm', getCalendarGroupColorTheme(classId).light, getCalendarGroupColorTheme(classId).dark, canViewDetails ? 'hover:shadow-sm' : 'cursor-default')}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={cn('h-2 w-2 shrink-0 rounded-full', getCalendarGroupColorTheme(classId).dot)} />
                              <span>{cls.class_name}</span>
                            </div>
                            <div className="text-[0.6rem] font-medium opacity-80">
                              {session?.start_time}
                            </div>
                            {!isStudent && session?.session_id && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDeleteSession(classId, session.session_id);
                                }}
                                className="absolute top-1 right-1 text-[0.6rem] text-rose-600 hover:text-rose-700"
                                title="Delete session"
                              >
                                <CalendarX className="h-3 w-3" />
                              </button>
                            )}
                            {attendanceCounts && !isStudent && (
                              <div className="text-[0.6rem] font-medium opacity-80">
                                P {attendanceCounts.present} / A {attendanceCounts.absent}
                              </div>
                            )}
                            {isStudent && studentStatus && (
                              <div className="text-[0.6rem] font-medium opacity-80">
                                {studentStatus}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
};
