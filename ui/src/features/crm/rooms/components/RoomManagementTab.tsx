import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RoomAssignment } from '../roomModel';
import { RoomTable, roomRowClass } from './RoomTable';

type RoomGroup = { roomNumber: string; assignments: RoomAssignment[]; assignmentCount: number; classCount: number };

export const RoomManagementTab = ({ rooms, selected, onSelect, onAssign, onEdit, onDeleteAssignment, onDeleteRoom }: {
  rooms: RoomGroup[]; selected: string; onSelect: (room: string) => void; onAssign: () => void; onEdit: (row: RoomAssignment) => void; onDeleteAssignment: (id: number) => void; onDeleteRoom: () => void;
}) => {
  const room = rooms.find((item) => item.roomNumber === selected) || rooms[0];
  return <div className="space-y-4 p-4">
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-bold">Choose a room</h2><p className="text-xs text-muted-foreground">Manage classes, times, capacity, and room actions.</p></div>
      <select value={room?.roomNumber || ''} onChange={(event) => onSelect(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm sm:w-64" aria-label="Current room">
        {rooms.map((item) => <option key={item.roomNumber} value={item.roomNumber}>{item.roomNumber}</option>)}
      </select>
    </div>
    {room ? <CardSection room={room} onAssign={onAssign} onEdit={onEdit} onDeleteAssignment={onDeleteAssignment} onDeleteRoom={onDeleteRoom} /> : <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Create a room to begin managing classes.</div>}
  </div>;
};

const CardSection = ({ room, onAssign, onEdit, onDeleteAssignment, onDeleteRoom }: { room: RoomGroup; onAssign: () => void; onEdit: (row: RoomAssignment) => void; onDeleteAssignment: (id: number) => void; onDeleteRoom: () => void }) => <section className="rounded-lg border">
  <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3"><div><h3 className="text-lg font-bold">{room.roomNumber}</h3><p className="text-xs text-muted-foreground">{room.classCount} classes · {room.assignmentCount} scheduled slots</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={onAssign}><Plus className="mr-1 h-4 w-4" />Assign class</Button><Button size="sm" variant="destructive" onClick={onDeleteRoom}><Trash2 className="mr-1 h-4 w-4" />Delete room</Button></div></div>
  <RoomTable label={`Classes and calendar for ${room.roomNumber}`} headers={['Class', 'Calendar time', 'Actions']}>{room.assignments.map((assignment) => <tr key={assignment.room_id} className={roomRowClass}><td className="px-3 py-3 font-semibold">{assignment.class_name || `Group #${assignment.class_id}`}</td><td className="px-3 py-3"><span className="inline-flex items-center gap-1 font-mono text-xs"><CalendarDays className="h-3.5 w-3.5" />{assignment.day} · {String(assignment.time || '').slice(0, 5)}–{String(assignment.end_time || '').slice(0, 5)}</span></td><td className="px-3 py-3"><Button size="icon" variant="ghost" aria-label={`Edit ${assignment.class_name || 'room assignment'}`} onClick={() => onEdit(assignment)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" aria-label={`Delete ${assignment.class_name || 'room assignment'}`} onClick={() => onDeleteAssignment(assignment.room_id)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</RoomTable>
</section>;
