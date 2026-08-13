import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { statusTone, type CalendarEvent } from '../calendarWorkspace';

export const CalendarEventDrawer = ({ event, canManage, canDelete, onClose, onStart, onOpen, onDelete }: { event: CalendarEvent | null; canManage: boolean; canDelete: boolean; onClose: () => void; onStart: (event: CalendarEvent) => void; onOpen: (event: CalendarEvent) => void; onDelete: (event: CalendarEvent) => void }) => (
  <Dialog open={Boolean(event)} onOpenChange={open => !open && onClose()}>
    <DialogContent data-testid="calendar-event-drawer" className="sm:max-w-lg">
      <DialogHeader><DialogTitle>{event?.class_name}</DialogTitle></DialogHeader>
      {event && <div className="space-y-3 text-sm"><Badge className={statusTone(event.status)}>{event.status.replace('_', ' ')}</Badge><dl className="grid grid-cols-[110px_1fr] gap-2 rounded-lg border p-3"><dt className="text-muted-foreground">Date & time</dt><dd>{event.date} · {event.start_time?.slice(0, 5)}–{event.end_time?.slice(0, 5)}</dd><dt className="text-muted-foreground">Teacher</dt><dd>{event.teacher_name || 'Unassigned'}</dd><dt className="text-muted-foreground">Subject</dt><dd>{event.subject_name || 'Unassigned'}</dd><dt className="text-muted-foreground">Room</dt><dd>{event.room_name || 'Unassigned'}</dd>{event.attendance && <><dt className="text-muted-foreground">Attendance</dt><dd>{event.attendance.present} present · {event.attendance.absent} absent · {event.attendance.unmarked} unmarked</dd></>}</dl>{canManage && <div className="flex justify-end gap-2">{event.source === 'recurring' ? <Button onClick={() => onStart(event)}>Start lesson</Button> : <><Button onClick={() => onOpen(event)}>Open lesson</Button>{canDelete && <Button variant="destructive" onClick={() => onDelete(event)}>Delete session</Button>}</>}</div>}</div>}
    </DialogContent>
  </Dialog>
);
