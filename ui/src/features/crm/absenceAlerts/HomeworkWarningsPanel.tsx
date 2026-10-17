// Red list: students with homework not done or done partly ("None", "Half", "Weak") or a lesson
// score under 70%, in two or more lessons this month. Each row shows the count and opens the
// lessons behind it. The teacher sees their own groups; the owner sees every group with contacts.

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Phone, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiPayload } from '@/shared/api/response';
import { useLanguage } from '@/i18n/LanguageContext';
import { absenceAlertAPI } from './api';
import { filterHomeworkWarnings, homeworkStatusLabel, homeworkWarningOptions, type HomeworkWarning } from './homeworkWarningsModel';

const COLLAPSED_COUNT = 5;

const formatDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;

const fieldClass = 'h-9 rounded-md border border-red-200 bg-white px-2 text-sm text-slate-900 dark:border-red-900 dark:bg-slate-950 dark:text-white';

export function HomeworkWarningsPanel({ showContacts = false, className }: { showContacts?: boolean; className?: string }) {
  const { t } = useLanguage();
  const [warnings, setWarnings] = useState<HomeworkWarning[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    absenceAlertAPI.getHomeworkWarnings()
      .then((response) => { if (alive) setWarnings(getApiPayload<{ students: HomeworkWarning[] }>(response)?.students || []); })
      .catch(() => { if (alive) setWarnings([]); });
    return () => { alive = false; };
  }, []);

  const options = useMemo(() => homeworkWarningOptions(warnings || []), [warnings]);
  const filtered = useMemo(() => filterHomeworkWarnings(warnings || [], { search, classId, status }), [warnings, search, classId, status]);

  if (!warnings) return null;
  const visible = expanded ? filtered : filtered.slice(0, COLLAPSED_COUNT);

  return (
    <section className={cn('rounded-xl border border-red-300 bg-red-50/70 p-4 shadow-sm dark:border-red-900 dark:bg-red-950/30', className)} data-testid="homework-warnings">
      <div className="mb-3 flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
          <ShieldAlert className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-black text-red-950 dark:text-red-200">{t('Red list ({count})', { count: filtered.length })}</h2>
          <p className="text-xs text-red-900/80 dark:text-red-300/80">{t('Homework not done or done partly, or a lesson score under 70%, in 2 or more lessons this month.')}</p>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <input type="search" aria-label={t('Search')} placeholder={t('Search by student name')} value={search} onChange={(event) => setSearch(event.target.value)} className={fieldClass} />
          <select aria-label={t('Group')} value={classId ?? ''} onChange={(event) => setClassId(event.target.value ? Number(event.target.value) : null)} className={fieldClass}>
            <option value="">{t('All classes')}</option>
            {options.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <select aria-label={t('Homework status')} value={status} onChange={(event) => setStatus(event.target.value)} className={fieldClass}>
            <option value="">{t('All statuses')}</option>
            {options.statuses.map((label) => <option key={label} value={label}>{homeworkStatusLabel(label)}</option>)}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-red-200 bg-white p-4 text-sm text-muted-foreground dark:border-red-900 dark:bg-slate-950/40">
          {warnings.length === 0 ? t('No homework warnings this month.') : t('No homework warnings match these filters.')}
        </p>
      ) : (
        <ul className="divide-y divide-red-200/70 overflow-hidden rounded-lg border border-red-200 bg-white dark:divide-red-900/60 dark:border-red-900 dark:bg-slate-950/40">
          {visible.map((warning) => {
            const key = `${warning.class_id}:${warning.student_id}`;
            const open = openKey === key;
            return (
              <li key={key}>
                <button type="button" aria-expanded={open} onClick={() => setOpenKey(open ? null : key)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-red-50 dark:hover:bg-red-950/40">
                  <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-red-600 px-2 text-sm font-black text-white">{warning.lessons.length}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{warning.student_name}</span>
                    <span className="block text-xs text-muted-foreground">{[warning.class_name, warning.teacher_name].filter(Boolean).join(' · ')}</span>
                  </span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-red-700 transition-transform dark:text-red-300', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="space-y-1.5 px-3 pb-3">
                    {warning.lessons.map((lesson) => (
                      <div key={lesson.date} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs dark:border-red-900 dark:bg-red-950/40">
                        <span className="font-semibold">{formatDay(lesson.date)}</span>
                        <span className={cn(lesson.reasons.includes('homework') && 'font-bold text-red-700 dark:text-red-300')}>{t('Homework')}: {homeworkStatusLabel(lesson.homework_label)}</span>
                        <span className={cn(lesson.reasons.includes('low_score') && 'font-bold text-red-700 dark:text-red-300')}>{t('Score')}: {lesson.score_percent}%</span>
                      </div>
                    ))}
                    {showContacts && (warning.parent_phone || warning.phone) && (
                      <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {[warning.parent_phone && `${warning.parent_name || t('Parent')}: ${warning.parent_phone}`, warning.phone].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > COLLAPSED_COUNT && (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 flex items-center gap-1 text-xs font-bold text-red-800 hover:underline dark:text-red-300">
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? t('Show less') : t('Show all {count}', { count: filtered.length })}
        </button>
      )}
    </section>
  );
}
