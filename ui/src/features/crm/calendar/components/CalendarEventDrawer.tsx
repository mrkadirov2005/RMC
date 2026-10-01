import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { statusTone, type CalendarEvent } from '../calendarWorkspace';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  event: CalendarEvent | null;
  canManage: boolean;
  canDelete: boolean;
  onClose: () => void;
  onStart: (event: CalendarEvent) => void;
  onOpen: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onUpdateTime: (event: CalendarEvent, startTime: string, endTime: string) => Promise<void> | void;
}

export const CalendarEventDrawer = ({ event, canManage, canDelete, onClose, onStart, onOpen, onDelete, onUpdateTime }: Props) => {
  const { t } = useLanguage();
  const [editingTime, setEditingTime] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [savingTime, setSavingTime] = useState(false);

  useEffect(() => {
    setEditingTime(false);
    setStartTime(event?.start_time?.slice(0, 5) || '');
    setEndTime(event?.end_time?.slice(0, 5) || '');
  }, [event?.event_id]);

  const saveTime = async () => {
    if (!event || !startTime || !endTime || endTime <= startTime) return;
    setSavingTime(true);
    try {
      await onUpdateTime(event, startTime, endTime);
      setEditingTime(false);
    } finally {
      setSavingTime(false);
    }
  };

  return (
    <Dialog open={Boolean(event)} onOpenChange={open => !open && onClose()}>
      <DialogContent data-testid="calendar-event-drawer" className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{event?.class_name}</DialogTitle></DialogHeader>
        {event && (
          <div className="space-y-3 text-sm">
            <Badge className={statusTone(event.status || 'planned')}>{String(event.status || 'planned').replace('_', ' ')}</Badge>
            <dl className="grid grid-cols-[110px_1fr] items-center gap-2 rounded-lg border p-3">
              <dt className="text-muted-foreground">{t('Date & time')}</dt>
              {editingTime ? (
                <dd className="flex flex-wrap items-center gap-1.5">
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-8 w-[110px]" />
                  <span className="text-muted-foreground">–</span>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-8 w-[110px]" />
                  <Button size="sm" className="h-8" disabled={savingTime || !startTime || !endTime || endTime <= startTime} onClick={saveTime}>
                    {savingTime ? t('Saving...') : t('Save')}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" disabled={savingTime} onClick={() => { setEditingTime(false); setStartTime(event.start_time?.slice(0, 5) || ''); setEndTime(event.end_time?.slice(0, 5) || ''); }}>
                    {t('Cancel')}
                  </Button>
                </dd>
              ) : (
                <dd className="flex items-center gap-2">
                  <span>{event.date} · {event.start_time?.slice(0, 5)}–{event.end_time?.slice(0, 5)}</span>
                  {canManage && event.status !== 'conducted' && (
                    <button type="button" onClick={() => setEditingTime(true)} className="text-muted-foreground hover:text-foreground" aria-label={t('Edit lesson time')}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </dd>
              )}
              <dt className="text-muted-foreground">{t('Teacher')}</dt><dd>{event.teacher_name || 'Unassigned'}</dd>
              <dt className="text-muted-foreground">{t('Subject')}</dt><dd>{event.subject_name || 'Unassigned'}</dd>
              <dt className="text-muted-foreground">{t('Room')}</dt><dd>{event.room_name || 'Unassigned'}</dd>
              {event.attendance && <><dt className="text-muted-foreground">{t('Attendance')}</dt><dd>{event.attendance.present} {t('present ·')} {event.attendance.absent} {t('absent ·')} {event.attendance.unmarked} unmarked</dd></>}
            </dl>
            {canManage && (
              <div className="flex justify-end gap-2">
                {event.source === 'recurring' ? <Button onClick={() => onStart(event)}>{t('Start lesson')}</Button> : (
                  <>
                    <Button onClick={() => onOpen(event)}>{t('Open lesson')}</Button>
                    {canDelete && <Button variant="destructive" onClick={() => onDelete(event)}>{t('Delete session')}</Button>}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
