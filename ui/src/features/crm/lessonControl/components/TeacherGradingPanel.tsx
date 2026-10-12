// Teacher's Overall tab: lessons waiting for scores (two hours from the start), this month's
// discipline, and a request to move a lesson to another day.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlarmClock, CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { lessonControlAPI } from '../api';
import { REQUEST_LABELS, day, type DueLesson, type Reschedule, type Summary } from '../lessonControlFormat';

type ClassOption = { class_id?: number; id?: number; class_name?: string };
const EMPTY = { class_id: '', original_date: '', new_date: '', new_time: '', reason: '' };

export function TeacherGradingPanel({ classes }: { classes: ClassOption[] }) {
  const { t } = useLanguage();
  const [due, setDue] = useState<DueLesson[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [requests, setRequests] = useState<Reschedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dueResponse, disciplineResponse, requestsResponse] = await Promise.all([
        lessonControlAPI.myDue(), lessonControlAPI.discipline(), lessonControlAPI.reschedules(),
      ]);
      setDue(getApiPayload<DueLesson[]>(dueResponse) || []);
      setSummary(getApiPayload<{ teachers: Array<{ summary: Summary }> }>(disciplineResponse)?.teachers?.[0]?.summary || null);
      setRequests(getApiPayload<Reschedule[]>(requestsResponse) || []);
    } catch {
      // The panel is a helper; the rest of the tab works without it.
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.class_id || !form.original_date || !form.new_date) {
      showToast.error('Choose the group, the lesson date and the new date.');
      return;
    }
    setSaving(true);
    try {
      await lessonControlAPI.requestReschedule({ ...form, class_id: Number(form.class_id) });
      showToast.success('Request sent to the admin');
      setForm(EMPTY);
      setShowForm(false);
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not send the request');
    } finally {
      setSaving(false);
    }
  };

  const overdue = due.filter((lesson) => lesson.status === 'missing');
  const today = due.filter((lesson) => lesson.status === 'pending');

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4" data-testid="teacher-grading-panel">
      {(overdue.length > 0 || today.length > 0) && (
        <div className={`rounded-lg border p-3 text-sm ${overdue.length ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'}`} role="alert">
          <div className="mb-1 flex items-center gap-2 font-bold"><AlarmClock className="h-4 w-4" />{t('Put scores in on time')}</div>
          <ul className="space-y-0.5">
            {today.map((lesson) => <li key={`${lesson.class_id}-${lesson.date}`}>{t('{group}: score by {time} today', { group: lesson.class_name, time: lesson.deadline.slice(11) })}</li>)}
            {overdue.map((lesson) => <li key={`${lesson.class_id}-${lesson.date}`} className="font-semibold">{t('{group}, {date}: not scored (-5 KPI)', { group: lesson.class_name, date: day(lesson.date) })}</li>)}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-bold">{t('Scoring this month')}: </span>
          {summary ? (
            <span>
              {t('{onTime} on time, {late} late, {missing} not scored', { onTime: summary.on_time, late: summary.late, missing: summary.missing })}
              {summary.points != null && <span className={`ml-2 font-black ${summary.points < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{summary.points > 0 ? '+' : ''}{summary.points} KPI</span>}
            </span>
          ) : '—'}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowForm((visible) => !visible)}>
          <CalendarClock className="mr-1.5 h-4 w-4" />{t('Move a lesson')}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div className="space-y-1">
            <Label htmlFor="move-class">{t('Group')}</Label>
            <Select value={form.class_id} onValueChange={(value) => setForm({ ...form, class_id: value })}>
              <SelectTrigger id="move-class"><SelectValue placeholder={t('Select')} /></SelectTrigger>
              <SelectContent>
                {classes.map((cls) => {
                  const id = Number(cls.class_id || cls.id || 0);
                  return id ? <SelectItem key={id} value={String(id)}>{cls.class_name}</SelectItem> : null;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label htmlFor="move-from">{t('Lesson date')}</Label><Input id="move-from" type="date" value={form.original_date} onChange={(event) => setForm({ ...form, original_date: event.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="move-to">{t('New date')}</Label><Input id="move-to" type="date" value={form.new_date} onChange={(event) => setForm({ ...form, new_date: event.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="move-time">{t('New time')}</Label><Input id="move-time" type="time" value={form.new_time} onChange={(event) => setForm({ ...form, new_time: event.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="move-reason">{t('Reason')}</Label><Input id="move-reason" maxLength={1000} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></div>
          <div className="sm:col-span-2 lg:col-span-5"><Button type="submit" size="sm" disabled={saving}>{saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{t('Send to the admin')}</Button></div>
        </form>
      )}

      {requests.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {requests.slice(0, 5).map((request) => (
            <li key={request.reschedule_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span>{request.class_name}: {day(request.original_date)} → {day(request.new_date)}{request.new_time ? ` ${request.new_time}` : ''}</span>
              <span className={`text-xs font-semibold ${request.status === 'approved' ? 'text-emerald-600' : request.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'}`}>{t(REQUEST_LABELS[request.status])}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
