// Source file for the calendar area in the crm feature.

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClassItem, SessionItem } from '../types';

interface SessionListItemProps {
  cls: ClassItem;
  session?: SessionItem;
  selectedDay: string;
  attendanceBySession: Map<number, { present: number; absent: number }>;
  attendanceByKey: Map<string, { present: number; absent: number }>;
  isSuperuser: boolean;
  isStudent: boolean;
  canViewDetails: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSessionModal: (cls: ClassItem, sid: number, date: string) => void;
  onDeleteSession: (classId: number, sessionId: number) => void;
  onOpenDetails: (cls: ClassItem, isoDate: string) => void;
  index: number;
}

// Renders the session list item module.
export const SessionListItem = ({
  cls,
  session,
  selectedDay,
  attendanceBySession,
  attendanceByKey,
  isSuperuser,
  isStudent,
  canViewDetails,
  onOpenChange,
  onOpenSessionModal,
  onDeleteSession,
  onOpenDetails,
  index,
}: SessionListItemProps) => {
  const classId = Number(cls.class_id || cls.id);
  const attendanceKey = `${classId}|${selectedDay}`;
  const attendanceCounts = session?.session_id
    ? attendanceBySession.get(session.session_id)
    : attendanceByKey.get(attendanceKey);

  return (
    <div
      key={`session-${cls.class_id || cls.id}-${session?.session_id || 'no-session'}-${selectedDay}-${index}`}
      className={cn(
        'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
        isSuperuser
          ? 'bg-sky-50 text-sky-900 border-sky-200'
          : 'bg-background text-foreground border-border'
      )}
    >
      <div>
        <div className="font-semibold">{cls.class_name}</div>
        <div className="text-xs text-muted-foreground">{session?.start_time}</div>
        {!isStudent && attendanceCounts && (
          <div className="text-xs text-muted-foreground">
            P {attendanceCounts.present} / A {attendanceCounts.absent}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!isStudent && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (session?.session_id) {
                  onOpenChange(false);
                  onOpenSessionModal(cls, session.session_id, selectedDay);
                }
              }}
            >
              Attendance & Grading
            </Button>
          </>
        )}
        {!isStudent && session?.session_id && (
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-600 hover:text-rose-700"
            onClick={() => onDeleteSession(classId, session.session_id)}
          >
            Delete
          </Button>
        )}
        {canViewDetails && (
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onOpenDetails(cls, selectedDay);
            }}
          >
            Summary
          </Button>
        )}
      </div>
    </div>
  );
};
