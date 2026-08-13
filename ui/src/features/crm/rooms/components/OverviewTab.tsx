import { AlertTriangle, Building2, CheckCircle2, Clock3 } from 'lucide-react';
import type { RoomAvailabilityRow, RoomScheduleRow } from '../types';
import { RoomTable, roomRowClass } from './RoomTable';

export const OverviewTab = ({ totalRooms, availability, schedule }: { totalRooms: number; availability: RoomAvailabilityRow[]; schedule: RoomScheduleRow[] }) => {
  const free = availability.filter((row) => row.available).length;
  const metrics = [
    ['Total rooms', totalRooms, Building2, 'text-indigo-600'], ['Available', free, CheckCircle2, 'text-emerald-600'],
    ['Occupied', Math.max(0, availability.length - free), Clock3, 'text-blue-600'], ['Warnings', 0, AlertTriangle, 'text-amber-600'],
  ] as const;
  return <div className="space-y-3 p-3">
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{metrics.map(([label, value, Icon, tone]) => <div key={label} className="flex items-center gap-2 rounded-lg border bg-card p-3"><Icon className={`h-4 w-4 ${tone}`} /><div><p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p><p className="text-lg font-bold">{value}</p></div></div>)}</div>
    <div className="grid gap-3 xl:grid-cols-2">
      <section><h2 className="mb-2 text-sm font-bold">Availability for selected time</h2><RoomTable label="Current room availability" headers={['Room', 'Status', 'Next lesson', 'Free until']}>{availability.slice(0, 8).map((row) => <tr key={row.roomNumber} className={roomRowClass}><td className="px-3 py-2 font-semibold">{row.roomNumber}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 font-semibold ${row.available ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200'}`}>{row.available ? 'Available' : 'Occupied'}</span></td><td className="px-3 py-2">{row.nextLesson}</td><td className="px-3 py-2">{row.freeUntil}</td></tr>)}</RoomTable></section>
      <section><h2 className="mb-2 text-sm font-bold">Recurring schedule</h2><RoomTable label="Room schedule overview" headers={['Time', 'Room', 'Group', 'Teacher']}>{schedule.slice(0, 8).map((row) => <tr key={row.room_id} className={roomRowClass}><td className="px-3 py-2 font-mono">{row.day} {String(row.time || '').slice(0, 5)}</td><td className="px-3 py-2 font-semibold">{row.room_number}</td><td className="px-3 py-2">{row.class_name}</td><td className="px-3 py-2">{row.teacher_name || 'Unassigned'}</td></tr>)}</RoomTable></section>
    </div>
  </div>;
};
