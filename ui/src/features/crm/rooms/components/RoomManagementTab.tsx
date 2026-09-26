import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RoomAssignment } from '../roomModel';

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

const CardSection = ({ room, onAssign, onEdit, onDeleteAssignment, onDeleteRoom }: { room: RoomGroup; onAssign: () => void; onEdit: (row: RoomAssignment) => void; onDeleteAssignment: (id: number) => void; onDeleteRoom: () => void }) => <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3"><div><h3 className="text-lg font-bold">{room.roomNumber}</h3><p className="text-xs text-muted-foreground">{room.classCount} classes · {room.assignmentCount} scheduled slots</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={onAssign}><Plus className="mr-1 h-4 w-4" />Assign class</Button><Button size="sm" variant="destructive" onClick={onDeleteRoom}><Trash2 className="mr-1 h-4 w-4" />Delete room</Button></div></div>
  <div className="overflow-x-auto"><Table className="min-w-[680px]" aria-label={`Classes and calendar for ${room.roomNumber}`}><TableHeader className="bg-slate-50/90 dark:bg-transparent"><TableRow><TableHead className="w-12 px-2">#</TableHead><TableHead>Class</TableHead><TableHead>Calendar time</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{room.assignments.map((assignment, index) => <TableRow key={assignment.room_id} className={`hover:bg-sky-50/60 dark:hover:bg-muted/50 ${index % 2 === 1 ? 'bg-slate-50/70 dark:bg-muted/20' : 'bg-white dark:bg-card'}`}><TableCell className="px-2 py-2 text-xs font-bold tabular-nums text-muted-foreground">{index + 1}</TableCell><TableCell className="py-2 font-bold text-slate-950 dark:text-card-foreground">{assignment.class_name || `Group #${assignment.class_id}`}</TableCell><TableCell className="py-2"><span className="inline-flex items-center gap-1 font-mono text-xs text-slate-700 dark:text-slate-200"><CalendarDays className="h-3.5 w-3.5" />{assignment.day} · {String(assignment.time || '').slice(0, 5)}–{String(assignment.end_time || '').slice(0, 5)}</span></TableCell><TableCell className="py-2 text-right"><Button size="icon" variant="ghost" aria-label={`Edit ${assignment.class_name || 'room assignment'}`} onClick={() => onEdit(assignment)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" aria-label={`Delete ${assignment.class_name || 'room assignment'}`} onClick={() => onDeleteAssignment(assignment.room_id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>
</Card>;
