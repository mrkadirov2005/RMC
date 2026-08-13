import { useMemo, useState } from 'react';
import type { RoomScheduleRow } from '../types';
import { RoomTable, roomRowClass } from './RoomTable';

export const ScheduleBreakdownTab = ({ mode, rows }: { mode: 'teacher' | 'subject'; rows: RoomScheduleRow[] }) => {
  const groups = useMemo(() => {
    const map = new Map<string, RoomScheduleRow[]>();
    rows.forEach((row) => { const key = mode === 'teacher' ? row.teacher_name || 'Unassigned teacher' : row.subject_name || 'Unassigned subject'; map.set(key, [...(map.get(key) || []), row]); });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [mode, rows]);
  const [selected, setSelected] = useState('');
  const active = groups.find(([key]) => key === selected) || groups[0];
  return <div className="grid gap-3 p-3 lg:grid-cols-[220px_1fr]">
    <aside className="overflow-hidden rounded-lg border" aria-label={mode === 'teacher' ? 'Teachers' : 'Subjects'}>{groups.map(([key, values]) => <button key={key} type="button" onClick={() => setSelected(key)} className={`flex w-full justify-between px-3 py-2 text-left text-xs odd:bg-background even:bg-slate-50 dark:even:bg-muted/25 ${active?.[0] === key ? 'font-bold text-primary ring-1 ring-inset ring-primary/30' : ''}`}><span className="truncate">{key}</span><span className="text-muted-foreground">{values.length}</span></button>)}</aside>
    <section><h2 className="mb-2 text-sm font-bold">{active?.[0] || `No ${mode} schedules`}</h2><RoomTable label={`${mode} room schedule`} headers={['Day & time', 'Room', mode === 'teacher' ? 'Group' : 'Teacher', 'Students']}>
      {(active?.[1] || []).map((row) => <tr key={row.room_id} className={roomRowClass}><td className="px-3 py-2 font-mono">{row.day} {String(row.time || '').slice(0, 5)}–{String(row.end_time || '').slice(0, 5)}</td><td className="px-3 py-2 font-bold">{row.room_number}</td><td className="px-3 py-2">{mode === 'teacher' ? row.class_name : row.teacher_name || 'Unassigned'}</td><td className="px-3 py-2">{row.student_count || 0}</td></tr>)}
    </RoomTable></section>
  </div>;
};
