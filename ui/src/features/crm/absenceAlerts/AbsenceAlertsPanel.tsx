// Red alert list of students who missed their group's latest lessons in a row (unexcused). The
// teacher sees their own groups and tells the admin; the admin (or owner) closes each alert with
// what happened, and "Sick" also freezes the student.

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { unwrapApiRows } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { absenceAlertAPI } from './api';

type AbsenceOutcome = 'sick' | 'not_interested' | 'excused' | 'left';

export interface AbsenceAlert {
  student_id: number;
  class_id: number;
  streak: number;
  absent_dates: string[];
  last_absent_date: string;
  teacher_reason: string | null;
  student_name: string;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  class_name: string | null;
  teacher_name: string | null;
}

const OUTCOMES: Array<{ value: AbsenceOutcome; label: string; detail: string }> = [
  { value: 'sick', label: 'Sick (freeze)', detail: 'The student is ill; their account is frozen.' },
  { value: 'not_interested', label: "Didn't like the lessons", detail: "Won't come anymore." },
  { value: 'excused', label: 'Excused', detail: 'A valid reason was given.' },
  { value: 'left', label: 'Left', detail: "Left the center and won't come." },
];

const COLLAPSED_COUNT = 5;

const formatDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;

export function AbsenceAlertsPanel({ canResolve = false, className }: { canResolve?: boolean; className?: string }) {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<AbsenceAlert[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState<AbsenceAlert | null>(null);
  const [outcome, setOutcome] = useState<AbsenceOutcome | ''>('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setAlerts(unwrapApiRows<AbsenceAlert>(await absenceAlertAPI.getAll()));
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    absenceAlertAPI
      .getAll()
      .then((response) => {
        if (!cancelled) setAlerts(unwrapApiRows<AbsenceAlert>(response));
      })
      .catch(() => {
        if (!cancelled) setAlerts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openResolve = (alert: AbsenceAlert) => {
    setResolving(alert);
    setOutcome('');
    setNote(alert.teacher_reason || '');
  };

  const submit = async () => {
    if (!resolving || !outcome) return;
    setSaving(true);
    try {
      await absenceAlertAPI.resolve({ student_id: resolving.student_id, class_id: resolving.class_id, outcome, note: note.trim() || undefined });
      showToast.success(outcome === 'sick' ? t('Alert closed and the student was frozen') : t('Alert closed'));
      setResolving(null);
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || t("Couldn't close the alert"));
    } finally {
      setSaving(false);
    }
  };

  // Nothing to show while loading or when every student is attending.
  if (!alerts || alerts.length === 0) return null;
  const visible = expanded ? alerts : alerts.slice(0, COLLAPSED_COUNT);

  return (
    <section className={cn('rounded-xl border border-rose-300 bg-rose-50/70 p-4 shadow-sm dark:border-rose-900 dark:bg-rose-950/30', className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-black text-rose-900 dark:text-rose-200">{t('Attendance alerts ({count})', { count: alerts.length })}</h2>
            <p className="text-xs text-rose-800/80 dark:text-rose-300/80">
              {canResolve
                ? t('Students who missed lessons in a row. Record what happened to close each alert.')
                : t('Students who missed lessons in a row. Tell the admin the reason so they can close it.')}
            </p>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-rose-200/70 overflow-hidden rounded-lg border border-rose-200 bg-white dark:divide-rose-900/60 dark:border-rose-900 dark:bg-slate-950/40">
        {visible.map((alert) => (
          <li key={`${alert.class_id}:${alert.student_id}`} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{alert.student_name}</span>
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[0.6875rem] font-black text-white">
                  {t('{count} lessons in a row', { count: alert.streak })}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {[alert.class_name, alert.teacher_name].filter(Boolean).join(' · ')}
                {' · '}
                {alert.absent_dates.slice().reverse().map(formatDay).join(', ')}
              </div>
              {alert.teacher_reason && (
                <div className="text-xs"><span className="font-semibold">{t('Teacher’s reason')}:</span> {alert.teacher_reason}</div>
              )}
              {canResolve && (alert.parent_phone || alert.phone) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {[alert.parent_phone && `${alert.parent_name || t('Parent')}: ${alert.parent_phone}`, alert.phone].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            {canResolve && (
              <Button size="sm" variant="outline" className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-100" onClick={() => openResolve(alert)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                {t('Resolve')}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {alerts.length > COLLAPSED_COUNT && (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline dark:text-rose-300">
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? t('Show less') : t('Show all {count}', { count: alerts.length })}
        </button>
      )}

      <Dialog open={resolving !== null} onOpenChange={(open) => !open && setResolving(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Close attendance alert')}</DialogTitle>
            <DialogDescription>
              {resolving ? `${resolving.student_name} · ${resolving.class_name || ''}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {OUTCOMES.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition',
                  outcome === option.value ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40' : 'hover:bg-muted/50'
                )}
              >
                <input
                  type="radio"
                  name="absence-outcome"
                  value={option.value}
                  checked={outcome === option.value}
                  onChange={() => setOutcome(option.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold">{t(option.label)}</span>
                  <span className="block text-xs text-muted-foreground">{t(option.detail)}</span>
                </span>
              </label>
            ))}
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('Note (optional)')} aria-label={t('Note (optional)')} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(null)} disabled={saving}>{t('Cancel')}</Button>
            <Button onClick={submit} disabled={!outcome || saving} className="bg-rose-600 text-white hover:bg-rose-700">
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t('Close alert')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
