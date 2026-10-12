import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { useGroupRoomFits } from '../roomCapacity';

/** Dashboard notice: groups with more students than their room has seats. Hidden when there are none. */
export const CapacityAlertsPanel = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const crowded = Array.from(useGroupRoomFits().values())
    .filter((fit) => fit.freeSeats < 0)
    .sort((a, b) => a.freeSeats - b.freeSeats);
  if (crowded.length === 0) return null;

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black text-rose-800 dark:text-rose-200">
          <AlertTriangle className="h-4 w-4" />
          {t('{count} groups have more students than their room fits', { count: crowded.length })}
        </h2>
        <Button size="sm" variant="outline" onClick={() => navigate('/rooms')}>{t('Open rooms')}</Button>
      </div>
      <ul className="space-y-1 text-sm text-rose-900 dark:text-rose-100">
        {crowded.slice(0, 6).map((fit) => (
          <li key={fit.classId}>
            <span className="font-semibold">{fit.className}</span> · {fit.room}: {t('{students} students, {capacity} seats', { students: fit.students, capacity: fit.capacity })}
            <span className="font-bold"> (+{-fit.freeSeats})</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
