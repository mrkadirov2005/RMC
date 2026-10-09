// Reports → O'quvchilar: how many students there were on the 10th, 20th and 30th of each month
// (the count on that day, not an average), as a line over the months.
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LineChart } from '@/shared/components/LineChart';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { useLanguage } from '@/i18n/LanguageContext';
import { reportAPI } from '../../api';

type TrendPoint = { day: string; students: number };

const PERIODS = [6, 12, 24];
const pointLabel = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(2, 4)}`;

export function StudentTrendCard() {
  const { t } = useLanguage();
  const [months, setMonths] = useState(12);
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    reportAPI.studentTrend(months)
      .then((response) => { if (alive) setPoints(getApiPayload<TrendPoint[]>(response) || []); })
      .catch((err) => { if (alive) setError(getErrorMessage(err) || 'Could not load the student count trend'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [months]);

  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  const change = last && previous ? last.students - previous.students : null;

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm" data-testid="student-trend">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{t('Number of students')}</h2>
          <p className="text-xs text-muted-foreground">{t('The count on the 10th, 20th and 30th of each month.')}</p>
        </div>
        <div className="flex items-center gap-3">
          {last && (
            <div className="text-right">
              <div className="text-2xl font-black tabular-nums">{last.students}</div>
              {change !== null && (
                <div className={`text-xs font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {change >= 0 ? '+' : ''}{change} {t('since the previous point')}
                </div>
              )}
            </div>
          )}
          <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="radiogroup" aria-label={t('Period')}>
            {PERIODS.map((value) => (
              <button key={value} type="button" role="radio" aria-checked={months === value} onClick={() => setMonths(value)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${months === value ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                {t('{count} months', { count: value })}
              </button>
            ))}
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex h-[220px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">{t(error)}</p>
      ) : (
        <LineChart data={points.map((point) => ({ label: pointLabel(point.day), value: point.students }))} height={220} />
      )}
    </section>
  );
}
