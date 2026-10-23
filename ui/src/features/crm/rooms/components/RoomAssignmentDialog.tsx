import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatGroupLabel } from '@/shared/groupLabel';
import { useLanguage } from '@/i18n/LanguageContext';
import { ROOM_DAYS } from '../weeklyModel';

/** `days` is the days a new lesson repeats on (Mon-Wed-Fri); an existing lesson has the one `day`. */
export type RoomFormData = { room_number: string; nickname: string; capacity: string; class_id: string; day: string; days: string[]; time: string; end_time: string };
const PRESETS = [
  ['Monday', 'Wednesday', 'Friday'],
  ['Tuesday', 'Thursday', 'Saturday'],
];
type Props = { open: boolean; editing: boolean; mode: 'room' | 'assignment'; submitting: boolean; form: RoomFormData; teacherId: string; teachers: any[]; classes: any[]; onForm: (form: RoomFormData) => void; onTeacher: (id: string) => void; onClose: () => void; onSubmit: (event: React.FormEvent) => void };

export const RoomAssignmentDialog = ({ open, editing, mode, submitting, form, teacherId, teachers, classes, onForm, onTeacher, onClose, onSubmit }: Props) => {
  const { t } = useLanguage();
  const pickDays = (days: string[]) => onForm({ ...form, days, day: days[0] || form.day });
  const toggleDay = (day: string) => {
    const next = ROOM_DAYS.filter((item) => (item === day ? !form.days.includes(day) : form.days.includes(item)));
    if (next.length > 0) pickDays(next);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t('Edit room assignment') : mode === 'room' ? t('Create room') : t('Assign class to room')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" data-testid="room-assignment-form">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="room_number">{t('Room number *')}</Label>
              <Input id="room_number" required value={form.room_number} disabled={mode === 'assignment' && !editing} placeholder={t('e.g. Room 5')} onChange={(e) => onForm({ ...form, room_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">{t('Room capacity')}</Label>
              <Input id="capacity" type="number" min="1" value={form.capacity} onChange={(e) => onForm({ ...form, capacity: e.target.value })} placeholder={t('Optional')} />
            </div>
          </div>
          {mode === 'room' && (
            <div className="space-y-2">
              <Label htmlFor="room_nickname">{t('Extra name (in brackets)')}</Label>
              <Input id="room_nickname" maxLength={100} value={form.nickname} onChange={(e) => onForm({ ...form, nickname: e.target.value })} placeholder={t('e.g. Big hall')} />
            </div>
          )}
          {mode === 'assignment' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="teacher_id">{t('Teacher *')}</Label>
                <Select value={teacherId} onValueChange={(value) => { onTeacher(value); onForm({ ...form, class_id: '' }); }}>
                  <SelectTrigger id="teacher_id"><SelectValue placeholder={t('Choose a teacher')} /></SelectTrigger>
                  <SelectContent>{teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class_id">{t('Group *')}</Label>
                <Select value={form.class_id} onValueChange={(value) => onForm({ ...form, class_id: value })} disabled={!teacherId}>
                  <SelectTrigger id="class_id"><SelectValue placeholder={t('Choose a group')} /></SelectTrigger>
                  <SelectContent>{classes.map((group) => <SelectItem key={group.class_id || group.id} value={String(group.class_id || group.id)}>{formatGroupLabel(group)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {editing ? (
                <div className="space-y-2">
                  <Label>{t('Day')}</Label>
                  <Select value={form.day} onValueChange={(value) => onForm({ ...form, day: value, days: [value] })}>
                    <SelectTrigger aria-label={t('Assignment day')}><SelectValue /></SelectTrigger>
                    <SelectContent>{ROOM_DAYS.map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{t('Days')}</Label>
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('Days')}>
                    {ROOM_DAYS.map((day) => (
                      <button key={day} type="button" aria-pressed={form.days.includes(day)} onClick={() => toggleDay(day)}
                        className={cn('rounded-md border px-2.5 py-1 text-sm font-medium', form.days.includes(day) ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
                        {t(day)}
                      </button>
                    ))}
                    <span className="mx-1 text-muted-foreground">|</span>
                    {PRESETS.map((preset) => (
                      <button key={preset.join()} type="button" onClick={() => pickDays(preset)} className="rounded-md border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
                        {preset.map((day) => t(day).slice(0, 2)).join('–')}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('The lesson repeats on every chosen day, at the same time.')}</p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="time">{t('Start')}</Label>
                  <Input id="time" type="time" required value={form.time} onChange={(e) => onForm({ ...form, time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">{t('End')}</Label>
                  <Input id="end_time" type="time" required value={form.end_time} onChange={(e) => onForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
            <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('Save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
