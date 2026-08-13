import { CalendarEventButton } from '../components/CalendarEventButton';
import { localDateKey, type CalendarEvent } from '../calendarWorkspace';

export const EmptyView = ({ label }: { label: string }) => <div className="grid min-h-[300px] place-items-center p-8 text-sm text-muted-foreground">{label}</div>;

export const DayCalendarView = ({ anchor, events, onSelect }: { anchor: Date; events: CalendarEvent[]; onSelect: (event: CalendarEvent) => void }) => {
  const rows = events.filter(event => event.date === localDateKey(anchor)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  return <section aria-label={`Lessons for ${anchor.toLocaleDateString()}`} className="min-h-[420px]">{rows.length === 0 ? <EmptyView label="No lessons scheduled for this day." /> : <div className="divide-y" role="list">{rows.map(event => <div key={event.event_id} role="listitem" className="grid grid-cols-[72px_1fr] gap-3 p-3 odd:bg-white even:bg-slate-50/80 dark:odd:bg-card dark:even:bg-muted/20"><time className="pt-1 text-sm font-semibold tabular-nums">{event.start_time.slice(0, 5)}</time><CalendarEventButton event={event} onSelect={onSelect} /></div>)}</div>}</section>;
};
