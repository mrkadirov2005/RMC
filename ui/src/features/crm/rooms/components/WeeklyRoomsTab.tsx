// Rooms over the week: when each room is free, how many more students it can take, and which
// groups are larger than their room. Answers "a B1 student wants Tuesday afternoons: where?".
import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { useLanguage } from '@/i18n/LanguageContext';
import { roomAPI } from '../api';

type Window = { start: string; end: string };
type Lesson = { start: string; end: string; class_name: string; students: number; free_seats: number | null };
type Day = { day: string; lessons: Lesson[]; free: Window[] };
type WeeklyRoom = {
  room_id: number; name: string; capacity: number | null; opens: string; closes: string; days: Day[];
  lessons_per_week: number; free_seats_per_week: number | null; free_hours_per_week: number;
  over_capacity: Array<{ class_name: string; students: number; capacity: number }>;
};
type Weekly = { rooms: WeeklyRoom[]; summary: { rooms: number; free_seats_per_week: number; over_capacity_groups: number; rooms_without_capacity: number } };

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayLabel = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);

export const WeeklyRoomsTab = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<Weekly | null>(null);
  const [error, setError] = useState('');
  const [day, setDay] = useState('all');

  useEffect(() => {
    roomAPI.getWeekly()
      .then((response) => setData(getApiPayload<Weekly>(response)))
      .catch((err) => setError(getErrorMessage(err) || 'Could not load the rooms'));
  }, []);

  if (error) return <p className="p-6 text-sm text-destructive">{t(error)}</p>;
  if (!data) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const crowded = data.rooms.flatMap((room) => room.over_capacity.map((group) => ({ ...group, room: room.name })));
  const freeText = (windows: Window[]) => windows.map((window) => `${window.start}–${window.end}`).join(', ') || t('Busy all day');

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{t('Rooms')}</div><div className="text-2xl font-black">{data.summary.rooms}</div></div>
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{t('Free seats in lessons this week')}</div><div className="text-2xl font-black text-emerald-600">{data.summary.free_seats_per_week}</div></div>
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{t('Groups larger than their room')}</div><div className={`text-2xl font-black ${data.summary.over_capacity_groups ? 'text-rose-600' : ''}`}>{data.summary.over_capacity_groups}</div></div>
      </div>

      {crowded.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200" role="alert">
          <div className="mb-1 flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" />{t('More students than seats')}</div>
          <ul className="list-inside list-disc">
            {crowded.map((group, index) => (
              <li key={`${group.room}-${group.class_name}-${index}`}>{t('{group} in room {room}: {students} students, {capacity} seats', { group: group.class_name, room: group.room, students: group.students, capacity: group.capacity })}</li>
            ))}
          </ul>
        </div>
      )}
      {data.summary.rooms_without_capacity > 0 && (
        <p className="text-xs text-muted-foreground">{t('{count} rooms have no capacity set, so their free seats are not counted.', { count: data.summary.rooms_without_capacity })}</p>
      )}

      <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label={t('Day')}>
        {['all', ...DAYS].map((value) => (
          <button key={value} type="button" role="radio" aria-checked={day === value} onClick={() => setDay(value)}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${day === value ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
            {value === 'all' ? t('Whole week') : t(dayLabel(value))}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Room')}</TableHead>
              <TableHead className="text-right">{t('Seats')}</TableHead>
              {day === 'all' ? (
                <>
                  <TableHead className="text-right">{t('Lessons a week')}</TableHead>
                  <TableHead className="text-right">{t('Free seats a week')}</TableHead>
                  <TableHead className="text-right">{t('Free hours a week')}</TableHead>
                </>
              ) : (
                <>
                  <TableHead>{t('Lessons')}</TableHead>
                  <TableHead>{t('Free')}</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rooms.map((room) => {
              const today = room.days.find((item) => item.day === day);
              return (
                <TableRow key={room.room_id}>
                  <TableCell className="font-semibold">{room.name}<div className="text-xs font-normal text-muted-foreground">{room.opens}–{room.closes}</div></TableCell>
                  <TableCell className="text-right">{room.capacity ?? '—'}</TableCell>
                  {day === 'all' ? (
                    <>
                      <TableCell className="text-right">{room.lessons_per_week}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">{room.free_seats_per_week ?? '—'}</TableCell>
                      <TableCell className="text-right">{room.free_hours_per_week}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-xs">
                        {today?.lessons.length ? today.lessons.map((lesson) => (
                          <div key={`${lesson.start}-${lesson.class_name}`} className={lesson.free_seats != null && lesson.free_seats < 0 ? 'font-semibold text-rose-600' : ''}>
                            {lesson.start}–{lesson.end} {lesson.class_name} ({lesson.students}{room.capacity != null ? `/${room.capacity}` : ''})
                          </div>
                        )) : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{freeText(today?.free || [])}</TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
