import { CalendarEventButton } from './CalendarEventButton';
import { clockLabels, DAY_MINUTES, eventPosition, HOUR_HEIGHT, timeToMinutes } from '../timeGridModel';
import { localDateKey, type CalendarEvent } from '../calendarWorkspace';

type DayColumn = { date: Date; label?: string };

export const CalendarTimeGrid = ({ days, events, onSelect, label }: {
  days: DayColumn[];
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  label: string;
}) => {
  const todayKey = localDateKey(new Date());
  const now = new Date();
  const nowTop = (timeToMinutes(`${now.getHours()}:${now.getMinutes()}`) / 60) * HOUR_HEIGHT;

  return (
    <div className="max-h-[70vh] overflow-auto" data-testid="calendar-time-grid">
      <div className="min-w-[760px]" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(120px, 1fr))` }}>
        <div className="sticky top-0 z-30 grid border-b bg-card" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(120px, 1fr))` }}>
          <div className="sticky left-0 z-40 border-r bg-card" />
          {days.map(({ date, label: dayLabel }) => {
            const key = localDateKey(date);
            return <div key={key} className={`border-r px-2 py-2 text-center ${key === todayKey ? 'bg-primary text-primary-foreground' : 'bg-slate-50 dark:bg-muted/40'}`}><div className="text-[11px] font-semibold uppercase">{dayLabel || date.toLocaleDateString(undefined, { weekday: 'short' })}</div><div className="text-base font-bold">{date.getDate()}</div></div>;
          })}
        </div>
        <div role="grid" aria-label={label} className="grid" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(120px, 1fr))` }}>
          <div className="sticky left-0 z-20 border-r bg-card" style={{ height: DAY_MINUTES / 60 * HOUR_HEIGHT }}>
            {clockLabels.map((time, hour) => <time key={time} className="absolute right-2 -translate-y-1/2 text-[11px] font-medium tabular-nums text-muted-foreground" style={{ top: hour * HOUR_HEIGHT }}>{time}</time>)}
          </div>
          {days.map(({ date }) => {
            const key = localDateKey(date);
            const dayEvents = events.filter(event => event.date === key);
            return <div role="gridcell" aria-label={date.toLocaleDateString()} key={key} className="relative border-r bg-white dark:bg-card" style={{ height: DAY_MINUTES / 60 * HOUR_HEIGHT }}>
              {clockLabels.slice(0, -1).map((time, hour) => <div key={time} className="absolute inset-x-0 border-t border-slate-200 dark:border-border" style={{ top: hour * HOUR_HEIGHT }} />)}
              {key === todayKey && <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-rose-500" style={{ top: nowTop }}><span className="absolute -top-1.5 left-0 h-3 w-3 -translate-x-1/2 rounded-full bg-rose-500" /></div>}
              {dayEvents.map(event => { const position = eventPosition(event.start_time, event.end_time); return <div key={event.event_id} className="absolute inset-x-1 z-20 overflow-hidden" style={position}><CalendarEventButton event={event} compact={position.height < 48} onSelect={onSelect} /></div>; })}
            </div>;
          })}
        </div>
      </div>
    </div>
  );
};
