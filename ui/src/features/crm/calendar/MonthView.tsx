import { CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassItem, CalendarDay, SessionItem } from './types';
import { weekDays } from '@/features/crm/classes/queries';

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
  isSuperuser,
  isStudent,
  canViewDetails,
  onOpenDay,
  onDeleteSession,
  schedule = [],
}) => {

  return (
    <>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground"
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
              const isToday =
                day.isCurrentMonth &&
                day.date === today.getDate() &&
                today.getMonth() === displayMonth &&
                today.getFullYear() === displayYear;

              return (
                <div
                  key={dayIndex}
                  className={cn(
                    'min-h-[160px] rounded-lg border p-3 flex flex-col gap-2 bg-background',
                    !day.isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                    isToday && 'ring-2 ring-amber-400/80 bg-amber-50/60',
                    'cursor-pointer'
                  )}
                  onClick={() => onOpenDay(day.isoDate)}
                >
                  <div className="text-sm font-semibold">{day.date}</div>
                  <div className="flex flex-col gap-2 flex-1">
                    {/* Recurring Schedule */}
                    {day.isCurrentMonth && schedule
                      .filter(item => {
                        const isPlannedForDay = item.day === day.dayName;
                        if (!isPlannedForDay) return false;
                        // Avoid showing planned if a real session exists for this class on this day
                        const hasSession = events.some(e => 
                          Number(e.cls.class_id || e.cls.id) === Number(item.class_id)
                        );
                        return !hasSession;
                      })
                      .map((item, idx) => (
                        <div 
                          key={`recurring-${day.isoDate}-${idx}`}
                          className="rounded-md border border-amber-200 bg-amber-50/50 px-2 py-1 text-[0.6rem] font-medium leading-tight text-amber-900"
                        >
                          <div className="font-bold">Regular Class</div>
                          <div>{item.time} - {item.room_number}</div>
                        </div>
                      ))}


                    {events.length === 0 && schedule.filter(item => item.day === day.dayName).length === 0 ? (
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
                            className={cn(
                              'rounded-md border px-2 py-1 text-[0.65rem] font-semibold leading-tight relative',
                              isSuperuser
                                ? 'bg-sky-100 text-sky-900 border-sky-300'
                                : 'bg-primary/10 text-primary border-primary/30',
                              canViewDetails ? 'hover:shadow-sm' : 'cursor-default'
                            )}
                          >
                            <div>{cls.class_name}</div>
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
