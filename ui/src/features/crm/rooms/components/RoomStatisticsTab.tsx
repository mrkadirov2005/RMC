import { useState } from 'react';
import { AlertTriangle, BarChart3, Building2, Clock3, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import type { RoomAssignment } from '../roomModel';

type RoomGroup = { roomNumber: string; assignments: RoomAssignment[]; assignmentCount: number; classCount: number };

const minutes = (value?: string | null) => {
  const [hours, mins] = String(value || '00:00').slice(0, 5).split(':').map(Number);
  return hours * 60 + mins;
};

export const RoomStatisticsTab = ({ rooms, classes, students }: { rooms: RoomGroup[]; classes: any[]; students: any[] }) => {
  const { t } = useLanguage();
  const [warningType, setWarningType] = useState<'capacity' | 'time' | null>(null);
  const studentCounts = new Map<number, number>();
  students.forEach((student) => {
    if (String(student.status || '').toLowerCase() !== 'active' || student.deleted_at) return;
    const classId = Number(student.class_id || 0);
    if (classId) studentCounts.set(classId, (studentCounts.get(classId) || 0) + 1);
  });
  const classById = new Map(classes.map((item) => [Number(item.class_id || item.id), item]));
  const overloaded = rooms.flatMap((room) => room.assignments.flatMap((assignment) => {
    const group = classById.get(Number(assignment.class_id));
    const count = studentCounts.get(Number(assignment.class_id)) || Number(group?.student_count || 0);
    const capacity = Number(assignment.capacity || group?.capacity || 0);
    return count > capacity && capacity > 0 ? [{ room, assignment, count, capacity, exceeding: count - capacity }] : [];
  }));
  const collapsed = rooms.flatMap((room) => {
    const pairs: Array<{ room: RoomGroup; first: typeof room.assignments[number]; second: typeof room.assignments[number] }> = [];
    room.assignments.forEach((assignment, index) => room.assignments.slice(index + 1).forEach((other) => {
      if (minutes(assignment.time) < minutes(other.end_time) && minutes(assignment.end_time) > minutes(other.time)) {
        pairs.push({ room, first: assignment, second: other });
      }
    }));
    return pairs;
  });
  const scheduled = rooms.filter((room) => room.assignmentCount > 0).length;
  const cards = [
    [t('Total rooms'), rooms.length, Building2, 'text-indigo-600'],
    [t('Coverage'), rooms.length ? `${Math.round((scheduled / rooms.length) * 100)}%` : '0%', BarChart3, 'text-emerald-600'],
    [t('Students exceeding capacity'), new Set(overloaded.map((item) => item.room.roomNumber)).size, Users, 'text-red-600'],
    [t('Time collisions'), new Set(collapsed.map((item) => item.room.roomNumber)).size, Clock3, 'text-amber-600'],
  ] as const;
  const chartRows = rooms.map((room) => ({
    name: room.roomNumber,
    value: Math.min(100, room.assignmentCount * 12),
    detail: `${room.classCount} ${t('classes')} · ${room.assignmentCount} ${t('slots')}`,
  })).sort((a, b) => b.value - a.value);

  return <div className="space-y-4 p-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, Icon, tone]) => <Card key={label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><Icon className={`h-6 w-6 ${tone}`} /></CardContent></Card>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-base">{t('Room coverage')}</CardTitle></CardHeader><CardContent className="space-y-3">
        {chartRows.length ? chartRows.map((row) => <div key={row.name}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{row.name}</span><span className="text-muted-foreground">{row.detail}</span></div><div className="h-3 rounded-full bg-muted"><div className="h-3 rounded-full bg-indigo-600" style={{ width: `${Math.max(4, row.value)}%` }} /></div></div>) : <p className="text-sm text-muted-foreground">{t('No rooms have been created yet.')}</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">{t('Warnings')}</CardTitle></CardHeader><CardContent className="space-y-2">
        <button type="button" onClick={() => overloaded.length && setWarningType('capacity')} className="flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-800 hover:bg-red-100 disabled:cursor-default"><AlertTriangle className="h-4 w-4" />{overloaded.length ? `${new Set(overloaded.map((item) => item.room.roomNumber)).size} ${t(new Set(overloaded.map((item) => item.room.roomNumber)).size === 1 ? 'room exceeds student capacity' : 'rooms exceed student capacity')}.` : t('No student capacity warnings.')}</button>
        <button type="button" onClick={() => collapsed.length && setWarningType('time')} className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-800 hover:bg-amber-100 disabled:cursor-default"><Clock3 className="h-4 w-4" />{collapsed.length ? `${new Set(collapsed.map((item) => item.room.roomNumber)).size} ${t(new Set(collapsed.map((item) => item.room.roomNumber)).size === 1 ? 'room contains overlapping time slots' : 'rooms contain overlapping time slots')}.` : t('No time collisions detected.')}</button>
      </CardContent></Card>
    </div>
    {warningType && <Card><CardHeader><CardTitle className="text-base">{t(warningType === 'capacity' ? 'Student capacity details' : 'Time collision details')}</CardTitle></CardHeader><CardContent className="space-y-2">
      {warningType === 'capacity' ? overloaded.map(({ room, assignment, count, capacity, exceeding }) => <div key={`${room.roomNumber}-${assignment.room_id}`} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"><p className="font-bold">{room.roomNumber} · {assignment.class_name || `${t('Group')} #${assignment.class_id}`}</p><p>{count} {t('students assigned, capacity')} {capacity}: <strong>{exceeding} {t('exceeding')}</strong>.</p></div>) : collapsed.map(({ room, first, second }, index) => <div key={`${room.roomNumber}-${first.room_id}-${second.room_id}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-bold">{room.roomNumber}</p><p>{first.class_name || `${t('Group')} #${first.class_id}`} ({String(first.time || '').slice(0, 5)}–{String(first.end_time || '').slice(0, 5)}) {t('overlaps')} {second.class_name || `${t('Group')} #${second.class_id}`} ({String(second.time || '').slice(0, 5)}–{String(second.end_time || '').slice(0, 5)}).</p></div>)}
    </CardContent></Card>}
  </div>;
};
