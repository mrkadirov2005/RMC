// Retention the owner's way, for the month chosen above:
// - Retention view: students who left in five groups (trial, new group, long-term, graduated,
//   transferred), and teachers ranked by the share of their students lost (only the first three
//   groups count; graduates and transfers never count against a teacher).
// - Intake view: new students against those who left the center (transfers on neither side), new
//   students per teacher, and whether they came for a teacher or for the center.
// Filters: teacher, subject, level.

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient, subjectAPI, teacherAPI } from '@/shared/api/api';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { useLanguage } from '@/i18n/LanguageContext';
import { buildSubjectCatalog } from '../subjects/subjectCatalog';
import { levelsAPI } from '../subjects/levels';

type Category = 'trial' | 'new_group' | 'long_term' | 'graduated' | 'transfer';
type Leaver = {
  student_id: number; first_name: string | null; last_name: string | null; class_name: string | null; teacher_name: string | null;
  subject_name: string | null; level_name: string | null; left_on: string | null; lessons_attended: number; reason_name: string | null; reason_note: string | null;
};
type Breakdown = {
  month: string;
  categories: Array<{ key: Category; count: number; counts_as_lost: boolean; students: Leaver[] }>;
  summary: { lost: number; graduated: number; transfers: number; left: number };
  teacher_ranking: Array<{ teacher_id: number; teacher_name: string; students: number; lost: number; lost_percent: number; place: number; by_category: Record<string, number> }>;
  admissions: {
    new_students: number; left_center: number; balance: number; came_for_teacher: number; came_for_center: number;
    by_teacher: Array<{ teacher_id: number; teacher_name: string; admitted: number; came_for_teacher: number }>;
    students: Array<{ student_id: number; first_name: string | null; last_name: string | null; joined_on: string | null; class_name: string | null; teacher_name: string | null; referred_by_teacher_name: string | null; source_name: string | null }>;
  };
};

const CATEGORY_LABEL: Record<Category, string> = {
  trial: 'Left after a trial lesson',
  new_group: 'Left a new group',
  long_term: 'Long-term student left',
  graduated: 'Graduated',
  transfer: 'Transferred',
};
const CATEGORY_HINT: Record<Category, string> = {
  trial: 'Came to 1–2 lessons and left.',
  new_group: 'Left a group less than a month old.',
  long_term: 'Had been studying for a while and left.',
  graduated: 'Finished the course. Not counted as lost.',
  transfer: 'Moved to another group. For information only, not counted as lost.',
};

const nameOf = (row: { first_name: string | null; last_name: string | null; student_id: number }) =>
  [row.first_name, row.last_name].filter(Boolean).join(' ') || `#${row.student_id}`;

const SELECT = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

export const RetentionBreakdown = ({ month, centerId, view }: { month: string; centerId: number | null; view: 'retention' | 'intake' }) => {
  const { t } = useLanguage();
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [levelId, setLevelId] = useState('');
  const [teachers, setTeachers] = useState<Array<{ id: number; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>([]);
  const [levels, setLevels] = useState<Array<{ id: number; name: string }>>([]);
  const [data, setData] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [openCategory, setOpenCategory] = useState<Category>('trial');

  useEffect(() => {
    teacherAPI.getAll().then((res) => setTeachers(unwrapApiRows<any>(res)
      .map((row) => ({ id: Number(row.teacher_id || row.id), name: [row.first_name, row.last_name].filter(Boolean).join(' ') }))
      .filter((row) => row.id > 0).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => setTeachers([]));
    subjectAPI.getAll().then((res) => setSubjects(buildSubjectCatalog(unwrapApiRows<any>(res))
      .map((row: any) => ({ id: Number(row.subject_id), name: String(row.subject_name || '').trim() }))
      .filter((row) => row.id > 0 && row.name).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => setSubjects([]));
  }, [centerId]);

  // The chosen subject's levels.
  const subjectId = subjects.find((row) => row.name === subject)?.id;
  useEffect(() => {
    setLevelId('');
    if (!subjectId) { setLevels([]); return; }
    levelsAPI.forSubject(subjectId)
      .then((res) => setLevels((getApiPayload<any>(res)?.levels || []).map((level: any) => ({ id: Number(level.level_id), name: String(level.level_name) }))))
      .catch(() => setLevels([]));
  }, [subjectId]);

  useEffect(() => {
    if (!centerId) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get<Breakdown>('/reports/retention-breakdown', {
      params: { month, center_id: centerId, teacher_id: teacherId || undefined, subject: subject || undefined, level_id: levelId || undefined },
    })
      .then((res) => { if (!cancelled) setData(getApiPayload<Breakdown>(res)); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [centerId, month, teacherId, subject, levelId]);

  const shownCategory = useMemo(() => data?.categories.find((category) => category.key === openCategory), [data, openCategory]);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">{t(view === 'intake' ? 'Admissions against students lost' : 'Why students left')}</h2>
          <p className="text-xs text-slate-500">{t(view === 'intake' ? 'Transfers are not counted on either side.' : 'Only the first three groups count as students lost.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label={t('Teacher')} className={SELECT} value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
            <option value="">{t('All teachers')}</option>
            {teachers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <select aria-label={t('Subject')} className={SELECT} value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option value="">{t('All subjects')}</option>
            {subjects.map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}
          </select>
          <select aria-label={t('Level')} className={SELECT} value={levelId} onChange={(event) => setLevelId(event.target.value)} disabled={!levels.length}>
            <option value="">{t('All levels')}</option>
            {levels.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          {loading && <Loader2 className="h-5 w-5 animate-spin self-center text-slate-400" />}
        </div>
      </div>

      {!data ? (
        <p className="py-6 text-center text-sm text-slate-500">{loading ? t('Loading...') : t('No data for this month.')}</p>
      ) : view === 'retention' ? (
        <>
          <div className="grid gap-2 sm:grid-cols-5">
            {data.categories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setOpenCategory(category.key)}
                aria-pressed={openCategory === category.key}
                className={cn('rounded-lg border p-3 text-left transition',
                  openCategory === category.key ? 'border-rose-500 ring-1 ring-rose-500' : 'hover:bg-slate-50 dark:hover:bg-white/5',
                  !category.counts_as_lost && 'bg-slate-50 dark:bg-white/[0.02]')}
              >
                <p className="text-xs font-semibold text-slate-500">{t(CATEGORY_LABEL[category.key])}</p>
                <p className={cn('text-2xl font-black tabular-nums', category.counts_as_lost ? 'text-rose-600' : 'text-slate-600 dark:text-slate-300')}>{category.count}</p>
              </button>
            ))}
          </div>
          <p className="text-sm">
            <b className="tabular-nums text-rose-600">{data.summary.lost}</b> {t('students lost')} · {data.summary.graduated} {t('graduated')} · {data.summary.transfers} {t('transferred')}
          </p>

          {shownCategory && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">{t(CATEGORY_HINT[shownCategory.key])}</p>
              {shownCategory.students.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">{t('Nobody in this group this month.')}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-white/5">
                      <tr><th className="px-3 py-2">{t('Student')}</th><th className="px-3 py-2">{t('Group')}</th><th className="px-3 py-2">{t('Teacher')}</th><th className="px-3 py-2">{t('Lessons attended')}</th><th className="px-3 py-2">{t('Left on')}</th><th className="px-3 py-2">{t('Reason')}</th></tr>
                    </thead>
                    <tbody>
                      {shownCategory.students.map((row) => (
                        <tr key={row.student_id} className="border-t">
                          <td className="px-3 py-2 font-semibold">{nameOf(row)}</td>
                          <td className="px-3 py-2">{[row.class_name, row.level_name].filter(Boolean).join(' · ') || '—'}</td>
                          <td className="px-3 py-2">{row.teacher_name || '—'}</td>
                          <td className="px-3 py-2 tabular-nums">{row.lessons_attended}</td>
                          <td className="px-3 py-2 tabular-nums">{row.left_on || '—'}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{[row.reason_name, row.reason_note].filter(Boolean).join(' — ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-bold">{t('Teachers by students lost')}</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-white/5">
                  <tr>
                    <th className="px-3 py-2">{t('Place')}</th><th className="px-3 py-2">{t('Teacher')}</th>
                    <th className="px-3 py-2 text-right">{t('Lost %')}</th><th className="px-3 py-2 text-right">{t('Lost')}</th><th className="px-3 py-2 text-right">{t('Students')}</th>
                    <th className="px-3 py-2 text-right">{t('Trial')}</th><th className="px-3 py-2 text-right">{t('New group')}</th><th className="px-3 py-2 text-right">{t('Long-term')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teacher_ranking.map((row) => (
                    <tr key={row.teacher_id} className="border-t">
                      <td className="px-3 py-2 tabular-nums">{row.place}</td>
                      <td className="px-3 py-2 font-semibold">{row.teacher_name}</td>
                      <td className={cn('px-3 py-2 text-right font-black tabular-nums', row.lost_percent > 0 ? 'text-rose-600' : 'text-emerald-600')}>{row.lost_percent}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.lost}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.students}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.by_category.trial || 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.by_category.new_group || 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.by_category.long_term || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border p-3"><p className="text-xs font-semibold text-slate-500">{t('New students')}</p><p className="text-2xl font-black tabular-nums text-emerald-600">{data.admissions.new_students}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs font-semibold text-slate-500">{t('Left the center')}</p><p className="text-2xl font-black tabular-nums text-rose-600">{data.admissions.left_center}</p></div>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-semibold text-slate-500">{t('This month')}</p>
              <p className={cn('text-2xl font-black tabular-nums', data.admissions.balance >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{data.admissions.balance > 0 ? '+' : ''}{data.admissions.balance}</p>
            </div>
          </div>
          <p className="text-sm">
            {t('Came for a teacher')}: <b className="tabular-nums">{data.admissions.came_for_teacher}</b> · {t('Came for the center')}: <b className="tabular-nums">{data.admissions.came_for_center}</b>
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-bold">{t('New students by teacher')}</h3>
              <ul className="divide-y rounded-lg border text-sm">
                {data.admissions.by_teacher.length === 0 ? <li className="p-3 text-slate-500">{t('No new students this month.')}</li> : data.admissions.by_teacher.map((row) => (
                  <li key={row.teacher_id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="font-semibold">{row.teacher_name}</span>
                    <span className="tabular-nums">{row.admitted} <span className="text-xs text-slate-500">({row.came_for_teacher} {t('came for this teacher')})</span></span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold">{t('Came for a specific teacher')}</h3>
              <ul className="divide-y rounded-lg border text-sm">
                {data.admissions.students.filter((row) => row.referred_by_teacher_name).length === 0
                  ? <li className="p-3 text-slate-500">{t('Nobody this month.')}</li>
                  : data.admissions.students.filter((row) => row.referred_by_teacher_name).map((row) => (
                    <li key={row.student_id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span>{nameOf(row)}</span>
                      <span className="text-xs text-slate-500">{t('for')} <b>{row.referred_by_teacher_name}</b></span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
