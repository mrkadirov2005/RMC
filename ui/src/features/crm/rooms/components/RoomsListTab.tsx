// The numbered list of rooms: what each seats and how full its lessons are, how much of its
// opening hours is booked, its equipment and whether it is in use.
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import type { PhysicalRoom } from '../hooks/useRoomsOverview';
import { roomLabel, type Weekly, type WeeklyRoom } from '../weeklyModel';

const byNumber = (a: PhysicalRoom, b: PhysicalRoom) => a.name.localeCompare(b.name, undefined, { numeric: true });

const STATUS_STYLES: Record<string, string> = {
  maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  inactive: 'bg-muted text-muted-foreground',
};
const STATUS_LABELS: Record<string, string> = { active: 'In use', maintenance: 'Under repair', inactive: 'Not in use' };

/** A bar showing how much is taken; over 100% turns red. */
const Bar = ({ percent, label }: { percent: number; label: string }) => (
  <div className="flex items-center gap-2" role="img" aria-label={label}>
    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full', percent > 100 ? 'bg-rose-500' : percent >= 85 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  </div>
);

type Props = { rooms: PhysicalRoom[]; weekly: Weekly | null; onAdd: () => void; onEdit: (room: PhysicalRoom) => void };

export const RoomsListTab = ({ rooms, weekly, onAdd, onEdit }: Props) => {
  const { t } = useLanguage();
  const stats = new Map<number, WeeklyRoom>((weekly?.rooms || []).map((room) => [Number(room.room_id), room]));
  const sorted = [...rooms].sort(byNumber);

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">{t('Rooms')}</h2>
          <p className="text-xs text-muted-foreground">{t('{count} rooms. Seats filled is the average over the room\'s lessons; hours booked counts the days with lessons.', { count: sorted.length })}</p>
        </div>
        <Button type="button" size="sm" onClick={onAdd}><Plus className="mr-1.5 h-4 w-4" /> {t('Add room')}</Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{t('No rooms yet. Create the first room to start scheduling.')}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table aria-label={t('Rooms')}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>{t('Room')}</TableHead>
                <TableHead className="text-right">{t('Seats')}</TableHead>
                <TableHead>{t('Seats filled')}</TableHead>
                <TableHead>{t('Hours booked')}</TableHead>
                <TableHead>{t('Equipment')}</TableHead>
                <TableHead className="text-right">{t('Lessons a week')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((room, index) => {
                const week = stats.get(Number(room.room_id));
                const fill = week?.seat_fill_percent ?? null;
                const label = roomLabel(room);
                return (
                  <TableRow key={room.room_id} data-testid={`room-row-${room.name}`}>
                    <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                    <TableCell className="font-semibold">{label}</TableCell>
                    <TableCell className="text-right tabular-nums">{room.capacity ?? '—'}</TableCell>
                    <TableCell>
                      {fill == null ? (
                        <span className="text-xs text-muted-foreground">{room.capacity == null ? t('Set the seats') : t('No lessons')}</span>
                      ) : (
                        <div className="space-y-0.5">
                          <Bar percent={fill} label={t('{percent}% of seats filled', { percent: fill })} />
                          <div className="text-xs tabular-nums">
                            <span className={cn('font-semibold', fill > 100 && 'text-rose-600')}>{t('{percent}% full', { percent: fill })}</span>
                            <span className="text-muted-foreground"> · {t('{percent}% empty', { percent: Math.max(0, 100 - fill) })}</span>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {week ? (
                        <div className="space-y-0.5">
                          <Bar percent={week.booked_percent} label={t('{percent}% of hours booked', { percent: week.booked_percent })} />
                          <div className="text-xs tabular-nums">{week.booked_percent}%</div>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="max-w-[16rem]">
                      {room.features?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {room.features.map((item) => <span key={item} className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs">{item}</span>)}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{week?.lessons_per_week ?? 0}</TableCell>
                    <TableCell>
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', STATUS_STYLES[room.status] || 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200')}>
                        {t(STATUS_LABELS[room.status] || room.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" className="h-8 px-2" aria-label={t('Edit room {room}', { room: label })} onClick={() => onEdit(room)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
