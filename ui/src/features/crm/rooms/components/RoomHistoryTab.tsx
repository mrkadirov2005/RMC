import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { auditLogsAPI } from '@/shared/api/api';
import type { RoomAssignment } from '../roomModel';

type RoomGroup = { roomNumber: string; assignments: RoomAssignment[] };
type LogRow = { audit_log_id?: number; action?: string; entity_type?: string; created_at?: string; user_type?: string; details?: any };

export const RoomHistoryTab = ({ rooms, selected }: { rooms: RoomGroup[]; selected: string }) => {
  const room = rooms.find((item) => item.roomNumber === selected) || rooms[0];
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await auditLogsAPI.list({ entity_type: 'room', limit: 200 });
        const data = response?.data?.data ?? response?.data ?? [];
        const roomName = String(room?.roomNumber || '').trim().toLowerCase();
        if (active) setRows((Array.isArray(data) ? data : []).filter((row: LogRow) => !roomName || String(row.details?.room_name || row.details?.name || '').trim().toLowerCase() === roomName));
      } catch { if (active) setRows([]); } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [selected, room?.roomNumber]);
  return <div className="p-4"><div className="mb-3"><h2 className="font-bold">Room change history</h2><p className="text-xs text-muted-foreground">CRUD and scheduling changes recorded for {room?.roomNumber || 'this room'}.</p></div>{loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : rows.length ? <div className="space-y-2">{rows.map((row, index) => <div key={row.audit_log_id || index} className="rounded-lg border p-3"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold capitalize">{String(row.action || 'change').replace(/_/g, ' ')}</span><span className="text-xs text-muted-foreground">{row.created_at ? new Date(row.created_at).toLocaleString() : 'Unknown time'}</span></div><p className="mt-1 text-xs text-muted-foreground">{row.user_type || 'user'} · {row.details?.room_name || row.details?.name || 'Room configuration changed'}</p></div>)}</div> : <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No room history is available yet.</div>}</div>;
};
