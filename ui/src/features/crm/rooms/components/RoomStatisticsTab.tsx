import { AlertTriangle, BarChart3, Building2, Clock3, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RoomAssignment } from '../roomModel';

type RoomGroup = { roomNumber: string; assignments: RoomAssignment[]; assignmentCount: number; classCount: number };

const minutes = (value?: string | null) => {
  const [hours, mins] = String(value || '00:00').slice(0, 5).split(':').map(Number);
  return hours * 60 + mins;
};

export const RoomStatisticsTab = ({ rooms, classes, students }: { rooms: RoomGroup[]; classes: any[]; students: any[] }) => {
  const studentCounts = new Map<number, number>();
  students.forEach((student) => {
    if (String(student.status || '').toLowerCase() !== 'active' || student.deleted_at) return;
    const classId = Number(student.class_id || 0);
    if (classId) studentCounts.set(classId, (studentCounts.get(classId) || 0) + 1);
  });
  const classById = new Map(classes.map((item) => [Number(item.class_id || item.id), item]));
  const overloaded = rooms.filter((room) => room.assignments.some((assignment) => {
    const group = classById.get(Number(assignment.class_id));
    const count = studentCounts.get(Number(assignment.class_id)) || Number(group?.student_count || 0);
    return count > Number(assignment.capacity || group?.capacity || 0) && Number(assignment.capacity || group?.capacity || 0) > 0;
  }));
  const collapsed = rooms.filter((room) => room.assignments.some((assignment, index, all) =>
    all.some((other, otherIndex) => otherIndex !== index && minutes(assignment.time) < minutes(other.end_time) && minutes(assignment.end_time) > minutes(other.time)),
  ));
  const scheduled = rooms.filter((room) => room.assignmentCount > 0).length;
  const cards = [
    ['Total rooms', rooms.length, Building2, 'text-indigo-600'],
    ['Coverage', rooms.length ? `${Math.round((scheduled / rooms.length) * 100)}%` : '0%', BarChart3, 'text-emerald-600'],
    ['Students exceeding capacity', overloaded.length, Users, 'text-red-600'],
    ['Time collisions', collapsed.length, Clock3, 'text-amber-600'],
  ] as const;
  const chartRows = rooms.map((room) => ({
    name: room.roomNumber,
    value: Math.min(100, room.assignmentCount * 12),
    detail: `${room.classCount} classes · ${room.assignmentCount} slots`,
  })).sort((a, b) => b.value - a.value);

  return <div className="space-y-4 p-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, Icon, tone]) => <Card key={label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><Icon className={`h-6 w-6 ${tone}`} /></CardContent></Card>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-base">Room coverage</CardTitle></CardHeader><CardContent className="space-y-3">
        {chartRows.length ? chartRows.map((row) => <div key={row.name}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{row.name}</span><span className="text-muted-foreground">{row.detail}</span></div><div className="h-3 rounded-full bg-muted"><div className="h-3 rounded-full bg-indigo-600" style={{ width: `${Math.max(4, row.value)}%` }} /></div></div>) : <p className="text-sm text-muted-foreground">No rooms have been created yet.</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Warnings</CardTitle></CardHeader><CardContent className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="h-4 w-4" />{overloaded.length ? `${overloaded.length} room${overloaded.length === 1 ? '' : 's'} exceed student capacity.` : 'No student capacity warnings.'}</div>
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><Clock3 className="h-4 w-4" />{collapsed.length ? `${collapsed.length} room${collapsed.length === 1 ? '' : 's'} contain overlapping time slots.` : 'No time collisions detected.'}</div>
      </CardContent></Card>
    </div>
  </div>;
};
