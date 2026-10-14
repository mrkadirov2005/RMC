// Amber list of students who did their homework halfway or worse ("Half", "Weak", "None") in two
// or more lessons this month. The teacher sees their own groups as a reminder; the owner sees every
// group and can ask the teacher why the student is not studying.

import { useEffect, useState } from 'react';
import { ChevronDown, Phone, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiPayload } from '@/shared/api/response';
import { useLanguage } from '@/i18n/LanguageContext';
import { absenceAlertAPI } from './api';

export interface WeakStudent {
  student_id: number;
  student_name: string;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  class_id: number;
  class_name: string | null;
  teacher_name: string | null;
  lessons: Array<{ date: string; homework_score: number }>;
}

const COLLAPSED_COUNT = 5;

const formatDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;

export function WeakStudentsPanel({ showContacts = false, className }: { showContacts?: boolean; className?: string }) {
  const { t } = useLanguage();
  const [students, setStudents] = useState<WeakStudent[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    absenceAlertAPI.getWeakStudents()
      .then((response) => { if (alive) setStudents(getApiPayload<{ students: WeakStudent[] }>(response)?.students || []); })
      .catch(() => { if (alive) setStudents([]); });
    return () => { alive = false; };
  }, []);

  if (!students) return null;
  const visible = expanded ? students : students.slice(0, COLLAPSED_COUNT);

  return (
    <section className={cn('rounded-xl border border-amber-300 bg-amber-50/70 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/30', className)} data-testid="weak-students">
      <div className="mb-3 flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
          <TrendingDown className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-black text-amber-950 dark:text-amber-200">{t('Weak students ({count})', { count: students.length })}</h2>
          <p className="text-xs text-amber-900/80 dark:text-amber-300/80">{t('Homework done halfway or worse in 2 or more lessons this month.')}</p>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-white p-4 text-sm text-muted-foreground dark:border-amber-900 dark:bg-slate-950/40">
          {t('No weak students this month.')}
        </p>
      ) : (
        <ul className="divide-y divide-amber-200/70 overflow-hidden rounded-lg border border-amber-200 bg-white dark:divide-amber-900/60 dark:border-amber-900 dark:bg-slate-950/40">
          {visible.map((student) => (
            <li key={`${student.class_id}:${student.student_id}`} className="space-y-0.5 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{student.student_name}</span>
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[0.6875rem] font-black text-white">
                  {t('{count} lessons', { count: student.lessons.length })}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {[student.class_name, student.teacher_name].filter(Boolean).join(' · ')}
                {' · '}
                {student.lessons.map((lesson) => `${formatDay(lesson.date)} (${lesson.homework_score})`).join(', ')}
              </div>
              {showContacts && (student.parent_phone || student.phone) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {[student.parent_phone && `${student.parent_name || t('Parent')}: ${student.parent_phone}`, student.phone].filter(Boolean).join(' · ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {students.length > COLLAPSED_COUNT && (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-800 hover:underline dark:text-amber-300">
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? t('Show less') : t('Show all {count}', { count: students.length })}
        </button>
      )}
    </section>
  );
}
