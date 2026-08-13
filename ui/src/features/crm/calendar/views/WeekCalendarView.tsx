import type { CalendarEvent } from '../calendarWorkspace';
import { RoomTimetableSheet } from '../components/RoomTimetableSheet';

export const WeekCalendarView = ({ events, onSelect }: { anchor: Date; events: CalendarEvent[]; onSelect: (event: CalendarEvent) => void }) =>
  <RoomTimetableSheet events={events} onSelect={onSelect} />;
