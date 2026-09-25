import { Clock3, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusTone, type CalendarEvent } from '../calendarWorkspace';

export const CalendarEventButton = ({ event, compact = false, onSelect }: { event: CalendarEvent; compact?: boolean; onSelect: (event: CalendarEvent) => void }) => {
  const studentCount = event.student_count || 0;
  const capacityTone = event.capacity && event.capacity > 0
    ? studentCount > event.capacity ? 'bg-red-100 text-red-900 border-red-300'
      : studentCount === event.capacity ? 'bg-amber-100 text-amber-900 border-amber-300'
        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
    : statusTone(event.status || 'planned');
  const tone = event.conflict
    ? 'bg-red-100 text-red-950 border-red-500 ring-1 ring-red-400 dark:bg-red-950/70 dark:text-red-100 dark:border-red-400'
    : capacityTone;
  return (
  <button type="button" title={event.conflict ? 'Scheduling conflict: fix the time or move this class to another room' : undefined} onClick={() => onSelect(event)} data-testid={`calendar-event-${event.event_id}`} aria-label={`${event.class_name}, ${event.start_time?.slice(0, 5)} to ${event.end_time?.slice(0, 5)}${event.conflict ? ', scheduling conflict: fix the time' : ''}, ${String(event.status || 'planned').replace('_', ' ')}`} className={cn('w-full rounded-md border border-transparent px-2 py-1.5 text-left transition hover:border-current/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', tone)}>
    <span className="block truncate text-xs font-semibold">{event.class_name}</span>
    {!compact && <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] opacity-80"><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{event.start_time?.slice(0, 5)}–{event.end_time?.slice(0, 5)}</span>{event.room_name && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{event.room_name}</span>}</span>}
  </button>
  );
};
