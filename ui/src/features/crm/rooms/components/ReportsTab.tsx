import type { RoomUtilizationRow } from '../types';
import { RoomTable, roomRowClass } from './RoomTable';

export const ReportsTab = ({ rows }: { rows: RoomUtilizationRow[] }) => <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
  <section><h2 className="mb-2 text-sm font-bold">Room utilization</h2><div className="space-y-2 rounded-lg border p-3">{rows.map((row) => <div key={row.roomNumber} className="grid grid-cols-[100px_1fr_44px] items-center gap-2 text-xs"><span className="truncate font-semibold">{row.roomNumber}</span><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.min(100, row.utilization)}%` }} /></div><span className="text-right font-bold">{row.utilization}%</span></div>)}</div></section>
  <section><h2 className="mb-2 text-sm font-bold">Usage details</h2><RoomTable label="Room utilization report" headers={['Room', 'Booked hours', 'Utilization']}>{rows.map((row) => <tr key={row.roomNumber} className={roomRowClass}><td className="px-3 py-2 font-bold">{row.roomNumber}</td><td className="px-3 py-2">{(row.bookedMinutes / 60).toFixed(1)}</td><td className="px-3 py-2">{row.utilization}%</td></tr>)}</RoomTable></section>
</div>;
