// View component for the calendar screen in the crm feature.

import { Fragment, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ClassItem, CalendarDay, SessionItem } from './types';
import {
  getConfiguredLessonDurationMinutes,
  getTimeSlots,
  isWithinScheduleRange,
  normalizeRoomKey,
  normalizeWeekdayName,
  parseTimeToMinutes,
  toLocalDateKey,
} from './utils';

interface WeekViewProps {
  weekDays: CalendarDay[];
  sessions: SessionItem[];
  classes: ClassItem[];
  students: any[];
  teachers: any[];
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
  item: any;
  cls?: ClassItem;
};

type RenderedSession = {
  cls: ClassItem;
  session: SessionItem;
  startMinutes: number;
  endMinutes: number;
};

const SHEET_ROOM_WIDTH = 190;
const TIME_COLUMN_WIDTH = 82;
const SHEET_DAY_GROUPS = [
  { label: 'Dush chor juma', days: ['Monday', 'Wednesday', 'Friday'] },
  { label: 'Sesh pay shanba', days: ['Tuesday', 'Thursday', 'Saturday'] },
];
const FALLBACK_ROOM_BANDS = [
  ['1 xona', '2 xona', '3 xona', '4 xona', '5 xona'],
  ['6 xona', '7 xona', '8 xona', '9 xona', '10 xona'],
];
const ROOMS_PER_BAND = 5;
const SHEET_MIN_WIDTH = TIME_COLUMN_WIDTH + SHEET_ROOM_WIDTH * ROOMS_PER_BAND;
const CLASS_COLORS = [
  'bg-blue-600 text-white hover:bg-blue-700',
  'bg-emerald-600 text-white hover:bg-emerald-700',
  'bg-orange-500 text-white hover:bg-orange-600',
  'bg-fuchsia-600 text-white hover:bg-fuchsia-700',
  'bg-cyan-600 text-white hover:bg-cyan-700',
  'bg-rose-600 text-white hover:bg-rose-700',
  'bg-violet-600 text-white hover:bg-violet-700',
  'bg-lime-500 text-slate-950 hover:bg-lime-600',
  'bg-amber-500 text-slate-950 hover:bg-amber-600',
  'bg-teal-600 text-white hover:bg-teal-700',
  'bg-red-600 text-white hover:bg-red-700',
  'bg-sky-600 text-white hover:bg-sky-700',
  'bg-purple-600 text-white hover:bg-purple-700',
  'bg-green-600 text-white hover:bg-green-700',
  'bg-pink-600 text-white hover:bg-pink-700',
  'bg-indigo-600 text-white hover:bg-indigo-700',
];

const getPlannedEndMinutes = (item: any) => {
  const startMinutes = parseTimeToMinutes(String(item.time || '').substring(0, 5));
  if (!item.end_time) return startMinutes + SLOT_MINUTES;
  const endMinutes = parseTimeToMinutes(String(item.end_time).substring(0, 5));
  return endMinutes > startMinutes ? endMinutes : startMinutes + SLOT_MINUTES;
};

const SLOT_MINUTES = 30;
const getClassColor = (value: unknown) => {
  const raw = String(value || '0');
  const numeric = Number(raw);
  const hash = Number.isFinite(numeric)
    ? numeric
    : raw.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return CLASS_COLORS[Math.abs(hash) % CLASS_COLORS.length];
};

// Renders the week view view.
export const WeekView: React.FC<WeekViewProps> = ({
  weekDays,
  sessions,
  classes,
  students,
  teachers,
  today: _today,
  displayMonth: _displayMonth,
  displayYear: _displayYear,
  isSuperuser,
  onOpenSessionModal,
  schedule = [],
}) => {
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  const fallbackDurationMinutes = getConfiguredLessonDurationMinutes();
  const configuredTimeSlots = getTimeSlots();
  const roomBands = useMemo(() => {
    const roomNumbers = Array.from(new Set(
      schedule
        .map((item) => String(item.room_number || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    if (roomNumbers.length === 0) return FALLBACK_ROOM_BANDS;

    const bands: string[][] = [];
    for (let index = 0; index < roomNumbers.length; index += ROOMS_PER_BAND) {
      bands.push(roomNumbers.slice(index, index + ROOMS_PER_BAND));
    }
    return bands;
  }, [schedule]);

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

  const getGroupRows = (days: string[], bandRooms: string[]) => {
    const boundaries = new Set<number>();
    schedule
      .filter((item) => {
        const itemDayName = normalizeWeekdayName(item.day);
        const calendarDay = weekDays.find((day) => day.dayName === itemDayName);
        return days.includes(itemDayName)
          && bandRooms.some((room) => normalizeRoomKey(room) === normalizeRoomKey(item.room_number))
          && Boolean(calendarDay)
          && isWithinScheduleRange(item, calendarDay!.isoDate);
      })
      .forEach((item) => {
        boundaries.add(parseTimeToMinutes(String(item.time || '').substring(0, 5)));
        boundaries.add(getPlannedEndMinutes(item));
      });

    configuredTimeSlots.forEach((slot) => boundaries.add(parseTimeToMinutes(slot)));

    const sorted = Array.from(boundaries)
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);

    return sorted.slice(0, -1).map((start, index) => ({
      start,
      end: sorted[index + 1],
      label: `${formatMinutes(start)}-${formatMinutes(sorted[index + 1])}`,
    }));
  };

  const getScheduleForCell = (days: string[], room: string, start: number, end: number) =>
    schedule.find((item) => {
      const itemDayName = normalizeWeekdayName(item.day);
      const calendarDay = weekDays.find((day) => day.dayName === itemDayName);
      if (
        !days.includes(itemDayName)
        || normalizeRoomKey(item.room_number) !== normalizeRoomKey(room)
        || !calendarDay
        || !isWithinScheduleRange(item, calendarDay.isoDate)
      ) return false;
      const itemStart = parseTimeToMinutes(String(item.time || '').substring(0, 5));
      const itemEnd = getPlannedEndMinutes(item);
      return itemStart < end && itemEnd > start;
    });

  const getSessionsForCell = (day: CalendarDay, item: any, start: number, end: number) => {
    const daySessions = daySessionsByDate.get(day.isoDate) || [];
    return daySessions
      .filter((entry) => {
        const classMatches = Number(entry.cls.class_id || entry.cls.id) === Number(item?.class_id);
        return classMatches && entry.startMinutes < end && entry.endMinutes > start;
      })
      .map((entry) => ({ cls: entry.cls, session: entry.session }));
  };

  const formatMinutes = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

  const getTeacherName = (teacherId?: number | string | null) => {
    const id = Number(teacherId);
    const teacher = teachers.find((item) => Number(item.teacher_id || item.id) === id);
    return [teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ') || 'No teacher assigned';
  };

  const getStudentCount = (classId?: number | string | null) => {
    const id = Number(classId);
    return students.filter((student) => Number(student.class_id) === id && !student.deleted_at).length;
  };

  const activeSlot = selectedSlot;
  const activeSlotDate = activeSlot?.day.isoDate ?? '';
  const activeSlotSessions = activeSlot?.sessions ?? [];
  const activeClass = activeSlot?.cls;
  const activeSession = activeSlotSessions[0]?.session;
  const activeTeacherName = getTeacherName(activeClass?.teacher_id || activeSlot?.item?.teacher_id);
  const activeClassId = activeClass?.class_id || activeClass?.id || activeSlot?.item?.class_id;

// Opens slot.
  const openSlot = (
    day: CalendarDay,
    timeSlot: string,
    sessionsAtSlot: Array<{ cls: ClassItem; session: SessionItem }>,
    item: any,
    cls?: ClassItem
  ) => {
    setSelectedSlot({ day, timeSlot, sessions: sessionsAtSlot, item, cls });
  };

  return (
    <>
      <div className="w-full overflow-hidden rounded-lg border-2 border-slate-500 bg-white shadow-sm dark:border-border dark:bg-card">
        <div className="overflow-x-auto">
          <div className="w-full" style={{ minWidth: SHEET_MIN_WIDTH }}>
            {SHEET_DAY_GROUPS.map((group) => (
              <div key={group.label} className="border-b-4 border-yellow-300 last:border-b-0">
                {roomBands.map((bandRooms, bandIndex) => {
                  const rows = getGroupRows(group.days, bandRooms);
                  const template = `${TIME_COLUMN_WIDTH}px repeat(${bandRooms.length}, minmax(${SHEET_ROOM_WIDTH}px, 1fr))`;
                  return (
                    <Fragment key={`${group.label}-${bandIndex}`}>
                      {bandIndex > 0 && (
                        <div className="grid" style={{ gridTemplateColumns: template }}>
                          <div className="min-h-7 border-b border-r border-slate-500 bg-yellow-300" />
                          {bandRooms.map((room) => (
                            <div
                              key={`${group.label}-${room}-separator`}
                              className="min-h-7 border-b border-r border-slate-500 bg-yellow-300"
                            />
                          ))}
                        </div>
                      )}

                      <div
                        className="grid"
                        style={{ gridTemplateColumns: template }}
                      >
                        <div className="border-b border-r border-slate-500 bg-yellow-300 px-1 py-1 text-center text-[11px] font-black leading-tight text-slate-950">
                          <div>TEMURBEK</div>
                          <div>SCHOOL</div>
                        </div>
                        {bandRooms.map((room) => (
                          <div key={`${group.label}-${room}-day`} className="border-b border-r border-slate-500 bg-yellow-300 px-1.5 py-1 text-center text-[12px] font-black text-slate-950">
                            {group.label}
                          </div>
                        ))}

                        <div className="border-b border-r border-slate-500 bg-yellow-300 px-1 py-1 text-center text-[11px] font-black text-slate-950" />
                        {bandRooms.map((room) => (
                          <div key={`${group.label}-${room}-room`} className="border-b border-r border-slate-500 bg-yellow-300 px-1.5 py-1 text-center text-[12px] font-black text-slate-950">
                            {room}
                          </div>
                        ))}

                        {rows.map((row) => {
                          const isBreak = row.start >= parseTimeToMinutes('13:00') && row.start < parseTimeToMinutes('13:30');
                          return (
                            <Fragment key={`${group.label}-${bandIndex}-${row.label}`}>
                              <div className={cn('border-b border-r border-slate-500 px-1 py-0.5 text-center text-[11px] font-black text-slate-950', isBreak ? 'bg-orange-500' : 'bg-emerald-300')}>
                                {row.label}
                              </div>
                              {bandRooms.map((room) => {
                                const item = getScheduleForCell(group.days, room, row.start, row.end);
                                const itemDayName = normalizeWeekdayName(item?.day);
                                const day = weekDays.find((weekDay) => weekDay.dayName === itemDayName)
                                  || weekDays.find((weekDay) => group.days.includes(weekDay.dayName))
                                  || weekDays[0];
                                const cellSessions = getSessionsForCell(day, item, row.start, row.end);
                                const cls = classes.find((classItem) => Number(classItem.class_id || classItem.id) === Number(item?.class_id));
                                const teacherName = getTeacherName(cls?.teacher_id || item?.teacher_id);
                                const className = cls?.class_name || item?.class_name;
                                const color = getClassColor(item?.class_id || item?.class_code || room);
                                return (
                                  <button
                                    key={`${group.label}-${room}-${row.label}`}
                                    type="button"
                                    disabled={!item}
                                    title={item ? `${className} - ${teacherName}` : undefined}
                                    onClick={() => {
                                      if (item) openSlot(day, row.label, cellSessions, item, cls);
                                    }}
                                    className={cn(
                                      'min-h-7 border-b border-r border-slate-500 px-1 py-0.5 text-center text-[11px] font-black leading-tight transition-colors',
                                      isBreak && !item && 'bg-orange-500',
                                      !isBreak && !item && 'bg-white text-slate-950 hover:bg-slate-50',
                                      item && color,
                                      item && 'cursor-pointer',
                                      cellSessions.length > 0 && 'ring-2 ring-inset ring-cyan-500'
                                    )}
                                  >
                                    {item ? (
                                      <span className="flex min-w-0 flex-col items-center gap-0.5">
                                        <span className="line-clamp-1 max-w-full">{className}</span>
                                        <span className="line-clamp-1 max-w-full text-[9px] font-extrabold opacity-90">
                                          {teacherName}
                                        </span>
                                      </span>
                                    ) : (
                                      <span>bo'sh</span>
                                    )}
                                  </button>
                                );
                              })}
                            </Fragment>
                          );
                        })}
                        <div className="border-r border-slate-500 bg-emerald-300 py-1" />
                        {bandRooms.map((room) => (
                          <div key={`${group.label}-${room}-footer`} className="min-h-8 border-r border-slate-500 bg-white" />
                        ))}
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            ))}
          </div>
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
              {activeClass?.class_name || activeSlot?.item?.class_name || 'Class'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-border dark:bg-muted/30">
                <p className="text-xs font-bold uppercase text-muted-foreground">Teacher</p>
                <p className="mt-1 font-black text-slate-950 dark:text-card-foreground">{activeTeacherName}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-border dark:bg-muted/30">
                <p className="text-xs font-bold uppercase text-muted-foreground">Students</p>
                <p className="mt-1 font-black text-slate-950 dark:text-card-foreground">
                  {getStudentCount(activeClassId)}
                  {activeClass?.capacity ? ` / ${activeClass.capacity}` : ''}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-border dark:bg-muted/30">
                <p className="text-xs font-bold uppercase text-muted-foreground">Room and time</p>
                <p className="mt-1 font-black text-slate-950 dark:text-card-foreground">
                  {activeSlot?.item?.room_number} · {activeSlot?.item?.time} - {activeSlot?.item?.end_time}
                </p>
              </div>
              <div className={cn('rounded-lg border p-3 text-sm', activeSession ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950')}>
                <p className="text-xs font-bold uppercase opacity-70">Lesson status</p>
                <p className="mt-1 font-black">{activeSession ? 'Conducted' : 'Not conducted yet'}</p>
              </div>
            </div>

            {activeSession && activeClass ? (
              <div className={cn('flex items-center justify-between rounded-lg border p-3 text-sm', isSuperuser ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-border bg-background')}>
                <div>
                  <div className="font-semibold">Attendance session</div>
                  <div className="text-xs text-muted-foreground">
                    {activeSession.start_time} - {activeSession.end_time}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenSessionModal(activeClass, activeSession.session_id, activeSlotDate);
                    setSelectedSlot(null);
                  }}
                >
                  Open attendance
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
                No attendance session has been created for this lesson yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
