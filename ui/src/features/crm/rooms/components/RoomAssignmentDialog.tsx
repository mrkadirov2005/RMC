import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatGroupLabel } from '@/shared/groupLabel';

export type RoomFormData = { room_number: string; class_id: string; day: string; time: string; end_time: string };
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
type Props = { open: boolean; editing: boolean; mode: 'room' | 'assignment'; submitting: boolean; form: RoomFormData; teacherId: string; teachers: any[]; classes: any[]; onForm: (form: RoomFormData) => void; onTeacher: (id: string) => void; onClose: () => void; onSubmit: (event: React.FormEvent) => void };

export const RoomAssignmentDialog = ({ open, editing, mode, submitting, form, teacherId, teachers, classes, onForm, onTeacher, onClose, onSubmit }: Props) => <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit room assignment' : mode === 'room' ? 'Create room' : 'Assign class to room'}</DialogTitle></DialogHeader><form onSubmit={onSubmit} className="space-y-4" data-testid="room-assignment-form">
  <div className="space-y-2"><Label htmlFor="room_number">Room number *</Label><Input id="room_number" required value={form.room_number} disabled={mode === 'assignment' && !editing} onChange={(e) => onForm({ ...form, room_number: e.target.value })} /></div>
  {mode === 'assignment' && <><div className="space-y-2"><Label htmlFor="teacher_id">Teacher *</Label><Select value={teacherId} onValueChange={(value) => { onTeacher(value); onForm({ ...form, class_id: '' }); }}><SelectTrigger id="teacher_id"><SelectValue placeholder="Choose a teacher" /></SelectTrigger><SelectContent>{teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.label}</SelectItem>)}</SelectContent></Select></div>
  <div className="space-y-2"><Label htmlFor="class_id">Group *</Label><Select value={form.class_id} onValueChange={(value) => onForm({ ...form, class_id: value })} disabled={!teacherId}><SelectTrigger id="class_id"><SelectValue placeholder="Choose a group" /></SelectTrigger><SelectContent>{classes.map((group) => <SelectItem key={group.class_id || group.id} value={String(group.class_id || group.id)}>{formatGroupLabel(group)}</SelectItem>)}</SelectContent></Select></div>
  <div className="grid gap-3 sm:grid-cols-3"><div className="space-y-2"><Label>Day</Label><Select value={form.day} onValueChange={(value) => onForm({ ...form, day: value })}><SelectTrigger aria-label="Assignment day"><SelectValue /></SelectTrigger><SelectContent>{days.map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="time">Start</Label><Input id="time" type="time" required value={form.time} onChange={(e) => onForm({ ...form, time: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="end_time">End</Label><Input id="end_time" type="time" required value={form.end_time} onChange={(e) => onForm({ ...form, end_time: e.target.value })} /></div></div></>}
  <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
</form></DialogContent></Dialog>;
