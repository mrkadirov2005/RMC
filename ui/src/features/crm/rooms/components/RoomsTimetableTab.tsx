// The week's timetable like the center's sheet: one grid per day pattern (Mon-Wed-Fri, Tue-Thu-Sat,
// Sunday), rooms down the side and half hours across. A lesson fills its cells, free time is green.
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  TIMETABLE_BLOCKS, STEP_MINUTES, blockLessons, capitalDay, gridRange, layoutRoomBlock, roomLabel, teachersOf, toClock,
  type BlockLesson, type TimetableCell, type Weekly, type WeekDay,
} from '../weeklyModel';

// A colour per group, the same group always the same colour.
const TINTS = [
  'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-900/40 dark:text-sky-50 dark:border-sky-700',
  'bg-violet-100 text-violet-950 border-violet-300 dark:bg-violet-900/40 dark:text-violet-50 dark:border-violet-700',
  'bg-orange-100 text-orange-950 border-orange-300 dark:bg-orange-900/40 dark:text-orange-50 dark:border-orange-700',
  'bg-pink-100 text-pink-950 border-pink-300 dark:bg-pink-900/40 dark:text-pink-50 dark:border-pink-700',
  'bg-teal-100 text-teal-950 border-teal-300 dark:bg-teal-900/40 dark:text-teal-50 dark:border-teal-700',
  'bg-yellow-100 text-yellow-950 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-50 dark:border-yellow-700',
];
const tintOf = (lesson: BlockLesson) => TINTS[Math.abs(Number(lesson.class_id ?? lesson.class_name.length)) % TINTS.length];

type Props = { weekly: Weekly | null };

export const RoomsTimetableTab = ({ weekly }: Props) => {
  const { t } = useLanguage();
  const [teacher, setTeacher] = useState('all');
  const teachers = useMemo(() => teachersOf(weekly?.rooms || []), [weekly]);
  if (!weekly) return null;

  const teacherId = teacher === 'all' ? null : Number(teacher);
  const range = gridRange(weekly.rooms);
  const hours = Array.from({ length: Math.ceil(range.slots / 2) }, (_, index) => range.from + index * 2 * STEP_MINUTES);
  const shortDay = (day: WeekDay) => t(capitalDay(day)).slice(0, 2);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">{t('Weekly timetable')}</h2>
          <p className="text-xs text-muted-foreground">{t('Green is free on every day of the block. A lesson on only some of the days shows those days.')}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('Teacher')}</span>
          <select value={teacher} onChange={(event) => setTeacher(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label={t('Teacher')}>
            <option value="all">{t('All teachers')}</option>
            {teachers.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
          </select>
        </label>
      </div>

      {TIMETABLE_BLOCKS.map((block) => {
        const rooms = weekly.rooms
          .map((room) => ({ room, lessons: blockLessons(room, block.days, teacherId) }))
          .filter((item) => teacherId == null || item.lessons.length > 0);
        const title = block.days.map((day) => t(capitalDay(day))).join(' · ');
        return (
          <section key={block.id} className="space-y-2" aria-label={title} data-testid={`timetable-${block.id}`}>
            <h3 className="text-sm font-bold">{title}</h3>
            {rooms.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{t('No lessons for this teacher on these days.')}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full border-collapse text-xs" style={{ minWidth: `${160 + range.slots * 44}px` }}>
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 w-40 border-b border-r bg-card px-2 py-1 text-left font-semibold">{t('Room')}</th>
                      {hours.map((start) => (
                        <th key={start} colSpan={2} className="border-b border-l px-1 py-1 text-left font-medium text-muted-foreground tabular-nums">{toClock(start)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(({ room, lessons }) => {
                      const lanes = layoutRoomBlock(lessons, room, range);
                      return lanes.map((cells, laneIndex) => (
                        <tr key={`${room.room_id}-${laneIndex}`} className="border-b last:border-b-0">
                          {laneIndex === 0 && (
                            <th rowSpan={lanes.length} scope="row" className="sticky left-0 z-10 border-r bg-card px-2 py-1 text-left align-top font-semibold">
                              <div>{roomLabel(room)}</div>
                              <div className="text-[11px] font-normal text-muted-foreground">{room.capacity ? t('{count} seats', { count: room.capacity }) : t('Seats not set')}</div>
                            </th>
                          )}
                          {cells.map((cell) => (
                            <Cell key={`${cell.kind}-${cell.from}`} cell={cell} lanes={lanes.length} blockDays={block.days} shortDay={shortDay}
                              capacity={room.capacity} showFree={teacherId == null} />
                          ))}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

const Cell = ({ cell, lanes, blockDays, shortDay, capacity, showFree }: {
  cell: TimetableCell; lanes: number; blockDays: readonly WeekDay[]; shortDay: (day: WeekDay) => string; capacity: number | null; showFree: boolean;
}) => {
  const { t } = useLanguage();
  if (cell.kind === 'lesson') {
    const { lesson } = cell;
    const over = capacity != null && lesson.students > capacity;
    const partial = lesson.days.length < blockDays.length;
    const info = [`${lesson.start}–${lesson.end}`, lesson.class_name, lesson.teacher_name, `${lesson.students}${capacity != null ? `/${capacity}` : ''}`].filter(Boolean).join(' · ');
    return (
      <td colSpan={cell.span} title={info} className={cn('border px-1.5 py-1 align-top', tintOf(lesson), over && 'ring-2 ring-inset ring-rose-500')}>
        <div className="font-semibold leading-tight">{lesson.class_name}</div>
        {cell.span >= 2 && lesson.teacher_name && <div className="leading-tight opacity-80">{lesson.teacher_name}</div>}
        <div className="leading-tight opacity-80 tabular-nums">
          {lesson.students}{capacity != null ? `/${capacity}` : ''}
          {partial && <span className="ml-1 rounded bg-black/10 px-1 dark:bg-white/20">{lesson.days.map(shortDay).join(' ')}</span>}
        </div>
      </td>
    );
  }
  if (cell.kind === 'free') {
    return (
      <td colSpan={cell.span} rowSpan={lanes} className={cn('border text-center align-middle', showFree ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-muted/20')}>
        {showFree && cell.span >= 2 ? t('Free') : ''}
      </td>
    );
  }
  if (cell.kind === 'closed') {
    return <td colSpan={cell.span} rowSpan={lanes} className="border bg-muted/60" aria-label={t('Closed')} />;
  }
  return <td colSpan={cell.span} className="border bg-muted/20" />;
};
