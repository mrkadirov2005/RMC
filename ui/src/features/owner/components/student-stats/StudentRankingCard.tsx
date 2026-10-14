// Reports -> O'quvchilar: every student ranked by this month's lesson points, for the whole center,
// one group or one level. The Telegram bot shows students only the top five; the owner sees all.
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useStudentRankings } from '../../hooks/useStudentRankings';
import { rankStudents, rankingFilters, type RankingScope } from '../../studentRankingModel';

const SCOPES: Array<{ value: RankingScope; label: string }> = [
  { value: 'center', label: 'Whole center' },
  { value: 'group', label: 'By group' },
  { value: 'level', label: 'By level' },
];

export function StudentRankingCard() {
  const { t } = useLanguage();
  const [month, setMonth] = useState('');
  const [scope, setScope] = useState<RankingScope>('center');
  const [filter, setFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const { rows, month: loadedMonth, loading, error } = useStudentRankings(month);

  const filters = useMemo(() => rankingFilters(rows), [rows]);
  const options = scope === 'group' ? filters.groups : scope === 'level' ? filters.levels.map((level) => ({ id: level, name: `${t('Level')} ${level}` })) : [];
  const activeFilter = options.some((option) => option.id === filter) ? filter : options[0]?.id ?? null;
  const ranked = useMemo(() => rankStudents(rows, scope, activeFilter), [rows, scope, activeFilter]);
  const query = search.trim().toLowerCase();
  const visible = query ? ranked.filter((item) => item.name.toLowerCase().includes(query)) : ranked;

  return (
    <section id="student-ranking" className="rounded-lg border bg-card p-4 shadow-sm" data-testid="student-ranking">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{t('Student ranking by points')}</h2>
          <p className="text-xs text-muted-foreground">{t('Sum of lesson points for the month, the same as the Telegram bot.')}</p>
        </div>
        <input type="month" aria-label={t('Month')} value={month || loadedMonth} onChange={(event) => setMonth(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="radiogroup" aria-label={t('Ranking')}>
          {SCOPES.map((item) => (
            <button key={item.value} type="button" role="radio" aria-checked={scope === item.value} onClick={() => { setScope(item.value); setFilter(null); }}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${scope === item.value ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              {t(item.label)}
            </button>
          ))}
        </div>
        {scope !== 'center' && (
          <select aria-label={scope === 'group' ? t('Group') : t('Level')} value={activeFilter ?? ''} onChange={(event) => setFilter(Number(event.target.value))} className="h-9 rounded-md border bg-background px-2 text-sm">
            {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        )}
        <input type="search" aria-label={t('Search')} placeholder={t('Search')} value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm sm:max-w-xs" />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-rose-600">{t(error)}</p>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('No lesson points this month.')}</p>
      ) : (
        <div className="max-h-[32rem] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">№</th>
                <th className="px-3 py-2 text-left">{t('Student')}</th>
                <th className="px-3 py-2 text-left">{t('Group')}</th>
                <th className="px-3 py-2 text-right">{t('Lessons')}</th>
                <th className="px-3 py-2 text-right">{t('Points')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.studentId} className="border-t">
                  <td className="px-3 py-2 font-semibold tabular-nums text-muted-foreground">{item.place}</td>
                  <td className="px-3 py-2 font-semibold">{item.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.groups.join(', ')}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.lessons}</td>
                  <td className="px-3 py-2 text-right font-black tabular-nums">{item.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
