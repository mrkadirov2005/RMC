import { addDays, startOfWeek, type CalendarEvent } from '../calendarWorkspace';
import { CalendarTimeGrid } from '../components/CalendarTimeGrid';

export const WeekCalendarView = ({ anchor, events, onSelect }: { anchor: Date; events: CalendarEvent[]; onSelect: (event: CalendarEvent) => void }) => {
  const days = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchor), index));
  return <CalendarTimeGrid days={days.map(date => ({ date }))} events={events} onSelect={onSelect} label="Weekly lesson calendar" />;
};
