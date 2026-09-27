import type { CalendarEvent } from '../calendarWorkspace';
import { Fragment, type DragEvent } from 'react';
import { buildTimeGridRows, groupRoomBands, patternForEvent, weekdayPatterns } from '../roomTimetableModel';
import { useLanguage } from '@/i18n/LanguageContext';

const timeMinutes = (value: string) => {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
};

const timeFromMinutes = (value: number) =>
  `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

export const RoomTimetableSheet = ({ events, roomNames, onSelect, onMove, canMove }: { events: CalendarEvent[]; roomNames: string[]; onSelect: (event: CalendarEvent) => void; onMove: (event: CalendarEvent, room: string, pattern: string, start: string, end: string) => void; canMove: boolean }) => {
  const { t } = useLanguage();
  const rooms = [...roomNames, ...events.map(event => event.room_name || '')].filter(Boolean);
  const bands = groupRoomBands(rooms);

  if (bands.length === 0) return <div className="py-16 text-center text-sm text-muted-foreground">No room schedules match this week and the selected filters.</div>;

  return <div className="overflow-auto" data-testid="room-timetable-sheet">
    <div className="min-w-[1050px] space-y-4 p-2">
      {weekdayPatterns.map(pattern => {
        const patternEvents = events.filter(event => patternForEvent(event)?.id === pattern.id);
        return <section key={pattern.id} aria-label={`${pattern.label} room timetable`} className="space-y-3">
          {bands.map((band, bandIndex) => {
            const bandEvents = patternEvents.filter(event => band.includes(event.room_name || ''));
            const rows = buildTimeGridRows(bandEvents, band);
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
                {rows.length === 0 && <tr><td colSpan={band.length * 2} className="border border-slate-400 px-3 py-5 text-center text-muted-foreground">{t('No lessons scheduled.')}</td></tr>}
                {rows.map(row => <tr key={row.index}>
                    {band.map(room => {
                      const roomEvents = row.byRoom.get(room) || [];
                      const event = roomEvents[0];
                      const dropOnTime = (dragEvent: DragEvent<HTMLTableCellElement>) => {
                        dragEvent.preventDefault();
                        if (event) return;
                        const dragged = events.find(item => item.event_id === dragEvent.dataTransfer.getData('text/calendar-event'));
                        if (!dragged) return;
                        const duration = Math.max(1, timeMinutes(dragged.end_time) - timeMinutes(dragged.start_time));
                        onMove(dragged, room, pattern.id, row.start, timeFromMinutes(timeMinutes(row.start) + duration));
                      };
                      return <Fragment key={room}>
                        <td className="border border-slate-400 bg-emerald-100 px-1 py-1 text-center font-bold tabular-nums text-slate-950 dark:bg-emerald-900 dark:text-emerald-50">
                          {event
                            ? `${event.start_time.slice(0, 5)}–${event.end_time.slice(0, 5)}`
                            : row.start}
                        </td>
                        <td onDragOver={(dragEvent) => { if (!event && canMove) dragEvent.preventDefault(); }} onDrop={dropOnTime} className={`border border-slate-400 p-0 text-center ${event ? 'bg-white dark:bg-card' : 'bg-slate-50 dark:bg-muted/20'} ${!event && canMove ? 'transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30' : ''}`}>
                          {roomEvents.length > 0 ? <div className="flex min-w-0 gap-0.5">
                            {roomEvents.map(item => {
                              const movable = canMove && item.status !== 'conducted' && item.status !== 'in_progress';
                              return <button key={item.event_id} type="button" draggable={movable} onDragStart={(dragEvent) => { dragEvent.dataTransfer.effectAllowed = 'move'; dragEvent.dataTransfer.setData('text/calendar-event', item.event_id); }} data-testid={`calendar-event-${item.event_id}`} onClick={() => onSelect(item)} title={item.conflict ? 'Scheduling conflict: fix the time or move this class to another room' : movable ? 'Drag to a free room slot to move this lesson' : undefined} className={`min-w-0 flex-1 px-1.5 py-1 text-left font-semibold hover:bg-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:hover:bg-yellow-950/40 ${item.conflict ? 'rounded border border-red-500 bg-red-100 text-red-950 dark:bg-red-950/70 dark:text-red-100' : ''} ${item.status === 'conducted' ? 'text-emerald-700 dark:text-emerald-300' : ''} ${movable ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                                <span className="block truncate">{item.class_name}{item.teacher_name ? ` (${item.teacher_name})` : ''}</span>
                              </button>;
                            })}
                          </div> : <span className="block px-1 py-1 font-medium text-muted-foreground">—</span>}
                        </td>
                      </Fragment>;
                    })}
                  </tr>)}
              </tbody>
            </table>;
          })}
        </section>;
      })}
    </div>
  </div>;
};
