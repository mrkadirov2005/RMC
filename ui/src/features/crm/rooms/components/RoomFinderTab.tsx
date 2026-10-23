// "Which rooms are free?": choose the days a group meets and the time, and see the rooms that are
// free on all those days, then those free on some of them with what is in the way.
import { useState } from 'react';
import { CheckCircle2, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { useLanguage } from '@/i18n/LanguageContext';
import { roomAPI } from '../api';
import { WEEK_DAYS, capitalDay, roomLabel, type WeekDay } from '../weeklyModel';

type FreeRoom = {
  room_id: number;
  name: string;
  nickname: string | null;
  capacity: number | null;
  features: string[];
  free_days: WeekDay[];
  busy: Array<{ day: WeekDay; reason: 'closed' | 'lesson'; lesson: { start: string; end: string; class_name: string; teacher_name: string | null } | null }>;
  free_on_all: boolean;
};
type FreeResult = { days: WeekDay[]; start: string; end: string; rooms: FreeRoom[]; summary: { free_on_all: number; free_on_some: number } };

const PRESETS: Array<{ id: string; days: WeekDay[] }> = [
  { id: 'mwf', days: ['monday', 'wednesday', 'friday'] },
  { id: 'tts', days: ['tuesday', 'thursday', 'saturday'] },
];

type Props = {
  /** Put a group in a room that was found: the room, the days and the time. */
  onAssign: (room: string, days: WeekDay[], start: string, end: string) => void;
};

export const RoomFinderTab = ({ onAssign }: Props) => {
  const { t } = useLanguage();
  const [days, setDays] = useState<WeekDay[]>(['monday', 'wednesday', 'friday']);
  const [start, setStart] = useState('15:00');
  const [end, setEnd] = useState('16:30');
  const [seats, setSeats] = useState('');
  const [result, setResult] = useState<FreeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (day: WeekDay) => setDays((current) => WEEK_DAYS.filter((item) => (item === day ? !current.includes(day) : current.includes(item))));
  const canSearch = days.length > 0 && start && end && end > start && !loading;

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSearch) return;
    setLoading(true);
    setError('');
    try {
      const response = await roomAPI.getFree({ days: days.join(','), start, end, ...(seats ? { seats: Number(seats) } : {}) });
      setResult(getApiPayload<FreeResult>(response));
    } catch (requestError) {
      setResult(null);
      setError(getErrorMessage(requestError) || t("Couldn't search for rooms"));
    } finally {
      setLoading(false);
    }
  };

  const dayName = (day: WeekDay) => t(capitalDay(day));
  const why = (busy: FreeRoom['busy'][number]) => busy.reason === 'closed'
    ? t('closed at this time')
    : `${busy.lesson?.class_name} ${busy.lesson?.start}–${busy.lesson?.end}${busy.lesson?.teacher_name ? ` (${busy.lesson.teacher_name})` : ''}`;
  const full = result?.rooms.filter((room) => room.free_on_all) || [];
  const partial = result?.rooms.filter((room) => !room.free_on_all) || [];

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="font-bold">{t('Find a free room')}</h2>
        <p className="text-xs text-muted-foreground">{t('Choose the days a group meets and the time. Lessons repeat every week.')}</p>
      </div>

      <form onSubmit={search} className="space-y-3 rounded-lg border bg-muted/20 p-3" data-testid="room-finder-form">
        <div className="space-y-1.5">
          <Label>{t('Days')}</Label>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('Days')}>
            {WEEK_DAYS.map((day) => (
              <button key={day} type="button" aria-pressed={days.includes(day)} onClick={() => toggle(day)}
                className={cn('rounded-md border px-2.5 py-1 text-sm font-medium', days.includes(day) ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
                {dayName(day)}
              </button>
            ))}
            <span className="mx-1 text-muted-foreground">|</span>
            {PRESETS.map((preset) => (
              <button key={preset.id} type="button" onClick={() => setDays(preset.days)} className="rounded-md border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
                {preset.days.map((day) => dayName(day).slice(0, 2)).join('–')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="finder-start">{t('Start')}</Label>
            <Input id="finder-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} className="h-9 w-[130px]" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="finder-end">{t('End')}</Label>
            <Input id="finder-end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="h-9 w-[130px]" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="finder-seats">{t('Students in the group')}</Label>
            <Input id="finder-seats" type="number" min="1" value={seats} onChange={(event) => setSeats(event.target.value)} placeholder={t('Optional')} className="h-9 w-[150px]" />
          </div>
          <Button type="submit" disabled={!canSearch}>
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
            {t('Find rooms')}
          </Button>
        </div>
        {end <= start && <p className="text-xs text-destructive">{t('The end must be after the start.')}</p>}
      </form>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {result && (
        <div className="space-y-4" data-testid="room-finder-result">
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> {t('Free on all chosen days ({count})', { count: full.length })}
            </h3>
            {full.length === 0 ? <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{t('No room is free on all of these days at this time.')}</p> : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {full.map((room) => <RoomCard key={room.room_id} room={room} tone="free" onAssign={() => onAssign(room.name, result.days, result.start, result.end)} />)}
              </ul>
            )}
          </section>
          {partial.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold">{t('Free on some of the days ({count})', { count: partial.length })}</h3>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {partial.map((room) => (
                  <RoomCard key={room.room_id} room={room} tone="partial"
                    detail={room.busy.map((busy) => `${dayName(busy.day)}: ${why(busy)}`)}
                    onAssign={() => onAssign(room.name, room.free_days, result.start, result.end)} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const RoomCard = ({ room, tone, detail, onAssign }: { room: FreeRoom; tone: 'free' | 'partial'; detail?: string[]; onAssign: () => void }) => {
  const { t } = useLanguage();
  return (
    <li className={cn('space-y-2 rounded-lg border p-3', tone === 'free' ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'bg-card')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold">{roomLabel(room)}</div>
          <div className="text-xs text-muted-foreground">{room.capacity ? t('{count} seats', { count: room.capacity }) : t('Seats not set')}</div>
        </div>
        <Button type="button" size="sm" variant={tone === 'free' ? 'default' : 'outline'} onClick={onAssign}>
          {tone === 'free' ? t('Assign a group') : t('Assign on the free days')}
        </Button>
      </div>
      {room.features.length > 0 && <div className="flex flex-wrap gap-1">{room.features.map((item) => <span key={item} className="rounded-full border bg-background/70 px-2 py-0.5 text-xs">{item}</span>)}</div>}
      {detail && <ul className="space-y-0.5 text-xs text-rose-700 dark:text-rose-400">{detail.map((line) => <li key={line}>{line}</li>)}</ul>}
    </li>
  );
};
