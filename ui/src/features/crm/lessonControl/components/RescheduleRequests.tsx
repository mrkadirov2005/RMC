// Teachers' requests to move a lesson; approving one moves the scoring deadline to the new date.
import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { lessonControlAPI } from '../api';
import { REQUEST_LABELS, day, type Reschedule } from '../lessonControlFormat';

export function RescheduleRequests() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Reschedule[]>([]);

  const load = useCallback(async () => {
    try {
      setRows(getApiPayload<Reschedule[]>(await lessonControlAPI.reschedules()) || []);
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not load the list');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const decide = async (row: Reschedule, approve: boolean) => {
    try {
      await lessonControlAPI.decide(row.reschedule_id, approve);
      showToast.success(approve ? 'Approved' : 'Rejected');
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not save');
    }
  };

  if (rows.length === 0) return <p className="p-6 text-center text-sm text-muted-foreground">{t('No requests to move a lesson.')}</p>;
  return (
    <ul className="divide-y rounded-lg border text-sm">
      {rows.map((row) => (
        <li key={row.reschedule_id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2" data-testid="reschedule-row">
          <div>
            <div className="font-semibold">{row.class_name} · {row.teacher_name || '—'}</div>
            <div>{day(row.original_date)} → {day(row.new_date)}{row.new_time ? ` ${row.new_time}` : ''}</div>
            {row.reason && <div className="text-xs text-muted-foreground">{row.reason}</div>}
          </div>
          {row.status === 'pending' ? (
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => decide(row, true)}><Check className="mr-1 h-4 w-4" />{t('Approve')}</Button>
              <Button size="sm" variant="outline" onClick={() => decide(row, false)}><X className="mr-1 h-4 w-4" />{t('Reject')}</Button>
            </div>
          ) : (
            <span className={`text-xs font-semibold ${row.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'}`}>{t(REQUEST_LABELS[row.status])}{row.decided_by_name ? ` · ${row.decided_by_name}` : ''}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
