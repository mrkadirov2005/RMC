// Hisobotlar -> Bitiruvchilar: graduates' certificates, university admissions and thank-you notes
// for a year, against the year before, by month, by teacher, and the most common results. Only
// statistics: graduates never count among the active students.

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { archiveAPI } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';
import { useLanguage } from '@/i18n/LanguageContext';

type Counts = { certificate: number; admission: number; thanks: number; total: number };
type Stats = {
  year: number;
  totals: { this_year: Counts; last_year: Counts };
  months: Array<{ month: number; this_year: Counts; last_year: Counts }>;
  by_teacher: Array<{ teacher_id: number; teacher_name: string } & Counts>;
  top_titles: Array<{ title: string; kind: string; count: number }>;
};

const KINDS: Array<{ key: keyof Omit<Counts, 'total'>; label: string }> = [
  { key: 'certificate', label: 'Certificates' },
  { key: 'admission', label: 'University admissions' },
  { key: 'thanks', label: 'Thank-you notes' },
];

const change = (now: number, before: number) => (now === before ? '±0' : now > before ? `+${now - before}` : `${now - before}`);

export const GraduateStatsPanel = () => {
  const { t } = useLanguage();
  const [year, setYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    archiveAPI.getGraduateStats(year)
      .then((res) => { if (!cancelled) setStats(getApiPayload<Stats>(res)); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year]);

  const maxMonth = Math.max(1, ...(stats?.months || []).map((row) => Math.max(row.this_year.total, row.last_year.total)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-black">{t('Graduates')}</h2>
        <select aria-label={t('Year')} className="h-9 rounded-md border bg-background px-2 text-sm" value={year} onChange={(event) => setYear(Number(event.target.value))}>
          {Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        <p className="w-full text-xs text-muted-foreground">{t('Graduates are not counted among active students; this is statistics only.')}</p>
      </div>

      {!stats ? (
        !loading && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t('No data for this year.')}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {KINDS.map((kind) => (
              <div key={kind.key} className="rounded-lg border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground">{t(kind.label)}</p>
                <p className="text-2xl font-black tabular-nums">{stats.totals.this_year[kind.key]}</p>
                <p className="text-xs text-muted-foreground">{stats.year - 1}: {stats.totals.last_year[kind.key]} ({change(stats.totals.this_year[kind.key], stats.totals.last_year[kind.key])})</p>
              </div>
            ))}
          </div>

          <section className="space-y-2 rounded-lg border bg-card p-4">
            <h3 className="font-bold">{t('By month')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">{t('Month')}</th>
                    {KINDS.map((kind) => <th key={kind.key} className="py-1 pr-3 text-right">{t(kind.label)}</th>)}
                    <th className="py-1 pr-3 text-right">{stats.year}</th>
                    <th className="py-1 pr-3 text-right">{stats.year - 1}</th>
                    <th className="py-1 w-1/3" />
                  </tr>
                </thead>
                <tbody>
                  {stats.months.map((row) => (
                    <tr key={row.month} className="border-t">
                      <td className="py-1.5 pr-3">{new Date(stats.year, row.month - 1, 1).toLocaleString(undefined, { month: 'long' })}</td>
                      {KINDS.map((kind) => <td key={kind.key} className="py-1.5 pr-3 text-right tabular-nums">{row.this_year[kind.key]}</td>)}
                      <td className="py-1.5 pr-3 text-right font-bold tabular-nums">{row.this_year.total}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{row.last_year.total}</td>
                      <td className="py-1.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(row.this_year.total / maxMonth) * 100}%` }} />
                          <div className="h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" style={{ width: `${(row.last_year.total / maxMonth) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-2 rounded-lg border bg-card p-4">
              <h3 className="font-bold">{t('By teacher')}</h3>
              {stats.by_teacher.length === 0 ? <p className="text-sm text-muted-foreground">{t('Nothing this year yet.')}</p> : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr><th className="py-1">{t('Teacher')}</th>{KINDS.map((kind) => <th key={kind.key} className="py-1 text-right">{t(kind.label)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {stats.by_teacher.map((row) => (
                      <tr key={row.teacher_id} className="border-t">
                        <td className="py-1.5 font-semibold">{row.teacher_name}</td>
                        {KINDS.map((kind) => <td key={kind.key} className="py-1.5 text-right tabular-nums">{row[kind.key]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className="space-y-2 rounded-lg border bg-card p-4">
              <h3 className="font-bold">{t('Most common results')}</h3>
              {stats.top_titles.length === 0 ? <p className="text-sm text-muted-foreground">{t('Nothing this year yet.')}</p> : (
                <ul className="divide-y text-sm">
                  {stats.top_titles.map((row) => (
                    <li key={`${row.kind}-${row.title}`} className="flex justify-between gap-2 py-1.5">
                      <span>{row.title}</span><b className="tabular-nums">{row.count}</b>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};
