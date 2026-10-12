// Days with no lessons (holidays) for the whole branch or one group: no scores are expected.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { classAPI, lessonControlAPI } from '../api';
import { day } from '../lessonControlFormat';

type DayOff = { day_off_id: number; off_date: string; class_id: number | null; class_name?: string | null; note?: string | null };
const WHOLE_BRANCH = 'all';

export function DaysOffPanel({ month }: { month: string }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<DayOff[]>([]);
  const [groups, setGroups] = useState<Array<{ class_id: number; class_name: string }>>([]);
  const [form, setForm] = useState({ off_date: '', class_id: WHOLE_BRANCH, note: '' });

  const load = useCallback(async () => {
    try {
      setRows(getApiPayload<DayOff[]>(await lessonControlAPI.daysOff(month)) || []);
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not load the list');
    }
  }, [month]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { classAPI.getAll().then((response) => setGroups(unwrapApiRows(response))).catch(() => setGroups([])); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.off_date) return;
    try {
      await lessonControlAPI.addDayOff({ off_date: form.off_date, class_id: form.class_id === WHOLE_BRANCH ? null : Number(form.class_id), note: form.note });
      showToast.success('Saved');
      setForm({ off_date: '', class_id: WHOLE_BRANCH, note: '' });
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not save');
    }
  };

  const remove = async (row: DayOff) => {
    if (!window.confirm(t('Remove the day off on {date}?', { date: day(row.off_date) }))) return;
    try {
      await lessonControlAPI.removeDayOff(row.day_off_id);
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not delete');
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[160px_220px_1fr_auto] sm:items-end">
        <div className="space-y-1"><Label htmlFor="off-date">{t('Date')}</Label><Input id="off-date" type="date" required value={form.off_date} onChange={(event) => setForm({ ...form, off_date: event.target.value })} /></div>
        <div className="space-y-1">
          <Label htmlFor="off-group">{t('For')}</Label>
          <Select value={form.class_id} onValueChange={(value) => setForm({ ...form, class_id: value })}>
            <SelectTrigger id="off-group"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={WHOLE_BRANCH}>{t('The whole branch')}</SelectItem>
              {groups.map((group) => <SelectItem key={group.class_id} value={String(group.class_id)}>{group.class_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label htmlFor="off-note">{t('Note')}</Label><Input id="off-note" maxLength={500} value={form.note} placeholder={t('e.g. public holiday')} onChange={(event) => setForm({ ...form, note: event.target.value })} /></div>
        <Button type="submit">{t('Mark day off')}</Button>
      </form>
      {rows.length === 0 ? <p className="p-4 text-center text-sm text-muted-foreground">{t('No days off this month.')}</p> : (
        <ul className="divide-y rounded-lg border text-sm">
          {rows.map((row) => (
            <li key={row.day_off_id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span><span className="font-semibold">{day(row.off_date)}</span> · {row.class_name || t('The whole branch')}{row.note ? ` · ${row.note}` : ''}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={t('Delete')} onClick={() => remove(row)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
