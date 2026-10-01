import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { localDateKey, type CalendarView } from '../calendarWorkspace';
import { useLanguage } from '@/i18n/LanguageContext';

export const CalendarWorkspaceToolbar = ({ anchor, view, onView, onMove, onToday, onDate }: { anchor: Date; view: CalendarView; onView: (view: CalendarView) => void; onMove: (amount: number) => void; onToday: () => void; onDate: (date: Date) => void }) => {
  const { t } = useLanguage();
  return (
  <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2" role="toolbar" aria-label={t('Calendar navigation')}>
    <div className="flex flex-wrap items-center gap-1">
      <Button data-testid="calendar-today" size="sm" variant="outline" onClick={onToday}><CalendarDays className="mr-1 h-4 w-4" />{t('Today')}</Button>
      <Button size="icon" variant="outline" onClick={() => onMove(-1)} aria-label={t('Previous period')}><ChevronLeft className="h-4 w-4" /></Button>
      <Button size="icon" variant="outline" onClick={() => onMove(1)} aria-label={t('Next period')}><ChevronRight className="h-4 w-4" /></Button>
      <Input data-testid="calendar-date-picker" aria-label={t('Go to date')} type="date" value={localDateKey(anchor)} onChange={event => { const value = new Date(`${event.target.value}T12:00:00`); if (!Number.isNaN(value.getTime())) onDate(value); }} className="h-9 w-[142px]" />
      <strong className="ml-1 text-sm">{anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric', day: view === 'day' ? 'numeric' : undefined })}</strong>
    </div>
    <div className="flex rounded-md border p-0.5" aria-label={t('Calendar view')}>
      {(['day', 'week', 'month', 'agenda'] as CalendarView[]).map(item => <button key={item} data-testid={`calendar-view-${item}`} onClick={() => onView(item)} aria-pressed={view === item} className={`rounded px-3 py-1.5 text-xs font-semibold capitalize ${view === item ? 'bg-slate-900 text-white dark:bg-primary' : 'text-muted-foreground hover:bg-muted'}`}>{item}</button>)}
    </div>
  </div>
);
};
