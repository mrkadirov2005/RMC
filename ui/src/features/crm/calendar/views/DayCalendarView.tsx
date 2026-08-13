import { CalendarTimeGrid } from '../components/CalendarTimeGrid';
import { localDateKey, type CalendarEvent } from '../calendarWorkspace';

export const EmptyView = ({ label }: { label: string }) => <div className="grid min-h-[300px] place-items-center p-8 text-sm text-muted-foreground">{label}</div>;

export const DayCalendarView = ({ anchor, events, onSelect }: { anchor: Date; events: CalendarEvent[]; onSelect: (event: CalendarEvent) => void }) => {
  const rows = events.filter(event => event.date === localDateKey(anchor));
  return <section aria-label={`Lessons for ${anchor.toLocaleDateString()}`} className="min-h-[420px]"><CalendarTimeGrid days={[{ date: anchor, label: anchor.toLocaleDateString(undefined, { weekday: 'long' }) }]} events={rows} onSelect={onSelect} label={`Lessons for ${anchor.toLocaleDateString()}`} /></section>;
};
