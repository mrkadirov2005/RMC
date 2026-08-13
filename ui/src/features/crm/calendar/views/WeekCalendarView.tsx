import type { CalendarEvent } from '../calendarWorkspace';
import { RoomTimetableSheet } from '../components/RoomTimetableSheet';

export const WeekCalendarView = ({ events, rooms, onSelect, onMove, canMove }: { anchor: Date; events: CalendarEvent[]; rooms: string[]; onSelect: (event: CalendarEvent) => void; onMove: (event: CalendarEvent, room: string, pattern: string) => void; canMove: boolean }) =>
  <RoomTimetableSheet events={events} roomNames={rooms} onSelect={onSelect} onMove={onMove} canMove={canMove} />;
