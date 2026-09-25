import type { CalendarEvent } from '../calendarWorkspace';
import { Fragment } from 'react';
import { buildTimeGridRows, groupRoomBands, patternForEvent, weekdayPatterns } from '../roomTimetableModel';
import { getCalendarTimetableSlots } from '../utils';

export const RoomTimetableSheet = ({ events, roomNames, onSelect, onMove, canMove }: { events: CalendarEvent[]; roomNames: string[]; onSelect: (event: CalendarEvent) => void; onMove: (event: CalendarEvent, room: string, pattern: string, start: string, end: string) => void; canMove: boolean }) => {
  const rooms = [...roomNames, ...events.map(event => event.room_name || '')].filter(Boolean);
  const bands = groupRoomBands(rooms);
  const slots = getCalendarTimetableSlots();

  if (bands.length === 0) return <div className="py-16 text-center text-sm text-muted-foreground">No room schedules match this week and the selected filters.</div>;

  return <div className="overflow-auto" data-testid="room-timetable-sheet">
    <div className="min-w-[1050px] space-y-4 p-2">
      {weekdayPatterns.map(pattern => {
        const patternEvents = events.filter(event => patternForEvent(event)?.id === pattern.id);
        return <section key={pattern.id} aria-label={`${pattern.label} room timetable`} className="space-y-3">
          {bands.map((band, bandIndex) => {
            const bandEvents = patternEvents.filter(event => band.includes(event.room_name || ''));
            const rows = buildTimeGridRows(bandEvents, band, slots);
            return <table key={`${pattern.id}-${bandIndex}`} className="w-full table-fixed border-collapse text-[11px]" aria-label={`${pattern.label}, rooms ${band.join(', ')}`}>
              <thead>
                <tr className="bg-yellow-300 text-slate-950 dark:bg-yellow-600 dark:text-white">
                  {band.map((room, index) => <Fragment key={room}>
                    <th className="w-[76px] border border-slate-500 px-1 py-1 font-black uppercase">{index === 0 ? 'Temurbek' : ''}</th>
                    <th className="border border-slate-500 px-2 py-1 text-center font-black">{pattern.label}</th>
                  </Fragment>)}
                </tr>
                <tr className="bg-yellow-200 text-slate-950 dark:bg-yellow-700 dark:text-white">
                  {band.map((room, index) => <Fragment key={room}>
                    <th className="border border-slate-500 px-1 py-1 font-black uppercase">{index === 0 ? 'School' : ''}</th>
                    <th className="border border-slate-500 px-2 py-1 text-center font-black">{room}</th>
                  </Fragment>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const isAfternoon = Number(row.start.slice(0, 2)) >= 12;
                  const previousIsAfternoon = rowIndex > 0 && Number(rows[rowIndex - 1].start.slice(0, 2)) >= 12;
                  return <tr key={row.index} className={isAfternoon && !previousIsAfternoon ? 'border-t-[8px] border-t-orange-400' : ''}>
                    {band.map(room => {
                      const roomEvents = row.byRoom.get(room) || [];
                      const event = roomEvents[0];
                      return <Fragment key={room}>
                        <td className="border border-slate-400 bg-emerald-100 px-1 py-1 text-center font-bold tabular-nums text-slate-950 dark:bg-emerald-900 dark:text-emerald-50">
                          {event
                            ? `${event.start_time.slice(0, 5)}–${event.end_time.slice(0, 5)}`
                            : `${row.start}–${row.end}`}
                        </td>
                        <td onDragOver={(dragEvent) => { if (!event && canMove) dragEvent.preventDefault(); }} onDrop={(dragEvent) => { dragEvent.preventDefault(); const dragged = events.find(item => item.event_id === dragEvent.dataTransfer.getData('text/calendar-event')); if (!event && dragged) onMove(dragged, room, pattern.id, row.start, row.end); }} className={`border border-slate-400 p-0 text-center ${event ? 'bg-white dark:bg-card' : 'bg-slate-50 dark:bg-muted/20'} ${!event && canMove ? 'transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30' : ''}`}>
                          {roomEvents.length > 0 ? <div className="flex min-w-0 gap-0.5">
                            {roomEvents.map(item => {
                              const movable = canMove && item.status !== 'conducted' && item.status !== 'in_progress';
                              return <button key={item.event_id} type="button" draggable={movable} onDragStart={(dragEvent) => { dragEvent.dataTransfer.effectAllowed = 'move'; dragEvent.dataTransfer.setData('text/calendar-event', item.event_id); }} data-testid={`calendar-event-${item.event_id}`} onClick={() => onSelect(item)} title={item.conflict ? 'Scheduling conflict: fix the time or move this class to another room' : movable ? 'Drag to a free room slot to move this lesson' : undefined} className={`min-w-0 flex-1 px-1.5 py-1 text-left font-semibold hover:bg-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:hover:bg-yellow-950/40 ${item.conflict ? 'rounded border border-red-500 bg-red-100 text-red-950 dark:bg-red-950/70 dark:text-red-100' : ''} ${item.status === 'conducted' ? 'text-emerald-700 dark:text-emerald-300' : ''} ${movable ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                                <span className="block truncate">{item.class_name}{item.teacher_name ? ` (${item.teacher_name})` : ''}</span>
                              </button>;
                            })}
                          </div> : <span className="block px-1 py-1 font-medium text-muted-foreground">Free</span>}
                        </td>
                      </Fragment>;
                    })}
                  </tr>;
                })}
              </tbody>
            </table>;
          })}
        </section>;
      })}
    </div>
  </div>;
};
