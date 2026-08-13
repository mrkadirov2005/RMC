import { Input } from '@/components/ui/input';
import type { RoomWorkspaceFilters } from '../types';

type Props = { filters: RoomWorkspaceFilters; onChange: (filters: RoomWorkspaceFilters) => void; rooms: string[]; teachers: Array<{ id: string; label: string }>; subjects: Array<{ id: string; label: string }> };
export const RoomFilters = ({ filters, onChange, rooms, teachers, subjects }: Props) => {
  const set = (key: keyof RoomWorkspaceFilters, value: string) => onChange({ ...filters, [key]: value });
  const selectClass = 'h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground';
  return <div className="grid gap-2 border-b bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-6" aria-label="Room filters" data-testid="rooms-filters">
    <Input aria-label="Schedule date" type="date" value={filters.date} onChange={(e) => set('date', e.target.value)} className="h-9 text-xs" />
    <Input aria-label="Start time" type="time" value={filters.start} onChange={(e) => set('start', e.target.value)} className="h-9 text-xs" />
    <Input aria-label="End time" type="time" value={filters.end} onChange={(e) => set('end', e.target.value)} className="h-9 text-xs" />
    <select aria-label="Filter by room" className={selectClass} value={filters.room} onChange={(e) => set('room', e.target.value)}><option value="">All rooms</option>{rooms.map((room) => <option key={room}>{room}</option>)}</select>
    <select aria-label="Filter by teacher" className={selectClass} value={filters.teacherId} onChange={(e) => set('teacherId', e.target.value)}><option value="">All teachers</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select>
    <select aria-label="Filter by subject" className={selectClass} value={filters.subject} onChange={(e) => set('subject', e.target.value)}><option value="">All subjects</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.label}</option>)}</select>
  </div>;
};
