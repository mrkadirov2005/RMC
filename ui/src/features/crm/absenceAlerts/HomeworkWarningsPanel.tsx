// Amber list of students with homework not done or done partly ("None", "Half", "Weak") in two or
// more lessons this month, searchable by name and filtered by group and homework status. The
// teacher sees their own groups as a reminder; the owner sees every group with parent contacts.

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Phone, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiPayload } from '@/shared/api/response';
import { useLanguage } from '@/i18n/LanguageContext';
import { absenceAlertAPI } from './api';
import { filterHomeworkWarnings, homeworkStatusLabel, homeworkWarningOptions, type HomeworkWarning } from './homeworkWarningsModel';

const COLLAPSED_COUNT = 5;

const formatDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;

const fieldClass = 'h-9 rounded-md border border-amber-200 bg-white px-2 text-sm text-slate-900 dark:border-amber-900 dark:bg-slate-950 dark:text-white';

export function HomeworkWarningsPanel({ showContacts = false, className }: { showContacts?: boolean; className?: string }) {
  const { t } = useLanguage();
  const [warnings, setWarnings] = useState<HomeworkWarning[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState<number | null>(null);
  const [status, setStatus] = useState('');

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
    <section className={cn('rounded-xl border border-amber-300 bg-amber-50/70 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/30', className)} data-testid="homework-warnings">
      <div className="mb-3 flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
          <TrendingDown className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-black text-amber-950 dark:text-amber-200">{t('Homework warnings ({count})', { count: filtered.length })}</h2>
          <p className="text-xs text-amber-900/80 dark:text-amber-300/80">{t('Homework not done or done partly in 2 or more lessons this month.')}</p>
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
        <p className="rounded-lg border border-amber-200 bg-white p-4 text-sm text-muted-foreground dark:border-amber-900 dark:bg-slate-950/40">
          {warnings.length === 0 ? t('No homework warnings this month.') : t('No homework warnings match these filters.')}
        </p>
      ) : (
        <ul className="divide-y divide-amber-200/70 overflow-hidden rounded-lg border border-amber-200 bg-white dark:divide-amber-900/60 dark:border-amber-900 dark:bg-slate-950/40">
          {visible.map((warning) => (
            <li key={`${warning.class_id}:${warning.student_id}`} className="space-y-1 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{warning.student_name}</span>
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[0.6875rem] font-black text-white">
                  {t('{count} lessons', { count: warning.lessons.length })}
                </span>
                <span className="text-xs text-muted-foreground">{[warning.class_name, warning.teacher_name].filter(Boolean).join(' · ')}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {warning.lessons.map((lesson) => (
                  <span key={lesson.date} className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs dark:border-amber-900 dark:bg-amber-950/40">
                    <span className="font-semibold">{formatDay(lesson.date)}</span> · {homeworkStatusLabel(lesson.homework_label)}
                  </span>
                ))}
              </div>
              {showContacts && (warning.parent_phone || warning.phone) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {[warning.parent_phone && `${warning.parent_name || t('Parent')}: ${warning.parent_phone}`, warning.phone].filter(Boolean).join(' · ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {filtered.length > COLLAPSED_COUNT && (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-800 hover:underline dark:text-amber-300">
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? t('Show less') : t('Show all {count}', { count: filtered.length })}
        </button>
      )}
    </section>
  );
}
