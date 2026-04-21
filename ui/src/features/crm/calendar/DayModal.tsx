import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ClassItem, SessionItem } from './types';
import { SessionListItem } from './components/SessionListItem';
import { PlannedClassItem } from './components/PlannedClassItem';



interface DayModalProps {
  open: boolean;
  selectedDay: string;
  selectedDayEvents: Array<{ cls: ClassItem; session?: SessionItem }>;
  attendanceByKey: Map<string, { present: number; absent: number }>;
  attendanceBySession: Map<number, { present: number; absent: number }>;
  isSuperuser: boolean;
  isStudent: boolean;
  canViewDetails: boolean;
  onOpenSessionModal: (cls: ClassItem, sid: number, date: string) => void;
  onDeleteSession: (classId: number, sessionId: number) => void;
  onOpenDetails: (cls: ClassItem, isoDate: string) => void;
  onOpenChange: (open: boolean) => void;
  onStartLesson?: (classId: number, date: string, time: string) => void;
  classes?: ClassItem[];
  schedule?: any[];
}

export const DayModal = ({
  open,
  selectedDay,
  selectedDayEvents,
  attendanceByKey,
  attendanceBySession,
  isSuperuser,
  isStudent,
  canViewDetails,
  onOpenSessionModal,
  onDeleteSession,
  onOpenDetails,
  onOpenChange,
  onStartLesson,
  classes = [],
  schedule = [],
}: DayModalProps) => {
  // Get planned classes for this day that don't have sessions yet
  const getPlannedClasses = () => {
    if (!selectedDay) return [];
    const dateObj = new Date(selectedDay);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Find schedule items for this day
    const daySchedule = schedule.filter(s => s.day === dayName);
    
    // Filter out those that already have a session in selectedDayEvents
    return daySchedule.filter(s => {
      const classId = Number(s.class_id);
      return !selectedDayEvents.some(e => Number(e.cls.class_id || e.cls.id) === classId && e.session?.start_time === s.time);
    });
  };

  const plannedClasses = getPlannedClasses();


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sessions for {selectedDay}</DialogTitle>
        </DialogHeader>
        {selectedDayEvents.length === 0 && plannedClasses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions or planned classes for this day.</p>
        ) : (
          <div className="space-y-4">
            {selectedDayEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Scheduled Sessions</h4>
                {selectedDayEvents.map(({ cls, session }, index) => (
                  <SessionListItem
                    key={`session-${cls.class_id || cls.id}-${session?.session_id || 'no-session'}-${selectedDay}-${index}`}
                    cls={cls}
                    session={session}
                    selectedDay={selectedDay}
                    attendanceBySession={attendanceBySession}
                    attendanceByKey={attendanceByKey}
                    isSuperuser={isSuperuser}
                    isStudent={isStudent}
                    canViewDetails={canViewDetails}
                    onOpenChange={onOpenChange}
                    onOpenSessionModal={onOpenSessionModal}
                    onDeleteSession={onDeleteSession}
                    onOpenDetails={onOpenDetails}
                    index={index}
                  />
                ))}

              </div>
            )}

            {plannedClasses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider px-1">Planned Classes</h4>
                {plannedClasses.map((item, index) => (
                  <PlannedClassItem
                    key={`planned-${item.class_id}-${item.time}-${index}`}
                    item={item}
                    selectedDay={selectedDay}
                    onStartLesson={onStartLesson}
                    onOpenDetails={onOpenDetails}
                    onOpenChange={onOpenChange}
                    isStudent={isStudent}
                    canViewDetails={canViewDetails}
                    classes={classes}
                    index={index}
                  />
                ))}

              </div>
            )}
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};
