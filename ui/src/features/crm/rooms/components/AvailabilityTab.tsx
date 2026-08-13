import { Button } from '@/components/ui/button';
import type { RoomAvailabilityRow } from '../types';
import { RoomTable, roomRowClass } from './RoomTable';

export const AvailabilityTab = ({ rows, onManage }: { rows: RoomAvailabilityRow[]; onManage: (row: RoomAvailabilityRow) => void }) => <div className="p-3">
  <RoomTable label="Room availability" headers={['Room', 'Availability', 'Current or next lesson', 'Free until', 'Action']}>
    {rows.map((row) => <tr key={row.roomNumber} className={roomRowClass} data-testid={`availability-row-${row.roomNumber}`}><td className="px-3 py-2 font-bold">{row.roomNumber}</td><td className="px-3 py-2"><span className={row.available ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-blue-700 dark:text-blue-300'}>{row.available ? 'Available' : 'Occupied'}</span></td><td className="px-3 py-2">{row.nextLesson}</td><td className="px-3 py-2">{row.freeUntil}</td><td className="px-3 py-2"><Button size="sm" variant="outline" onClick={() => onManage(row)} aria-label={`Manage slots for ${row.roomNumber}`} data-testid={`manage-room-${row.roomNumber}`}>Manage slots</Button></td></tr>)}
  </RoomTable>
</div>;
