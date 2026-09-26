import { useMemo, useState } from 'react';
import { BarChart3, CalendarRange, LineChart as LineChartIcon, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart } from '@/shared/components/BarChart';
import { LineChart } from '@/shared/components/LineChart';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  buildStudentTimelinePoints,
  getStudentTimelineBounds,
  type StudentTimelineGranularity,
  type StudentTimelineRecord,
} from '../studentTimelineModel';

interface Props {
  students: StudentTimelineRecord[];
}

export const StudentTimelineView = ({ students }: Props) => {
  const { t } = useLanguage();
  const [selectedStart, setSelectedStart] = useState('');
  const [selectedEnd, setSelectedEnd] = useState('');
  const [granularity, setGranularity] = useState<StudentTimelineGranularity>('monthly');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const bounds = useMemo(() => getStudentTimelineBounds(students), [students]);
  const start = selectedStart && selectedStart >= bounds.min && selectedStart <= bounds.max ? selectedStart : bounds.min;
  const end = selectedEnd && selectedEnd <= bounds.max && selectedEnd >= start ? selectedEnd : bounds.max;
  const points = useMemo(
    () => buildStudentTimelinePoints(students, start, end, granularity),
    [students, start, end, granularity],
  );

  const updateStart = (value: string) => {
    setSelectedStart(value);
    if (value > end) setSelectedEnd(value);
  };

  const updateEnd = (value: string) => {
    setSelectedEnd(value);
    if (value < start) setSelectedStart(value);
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950 dark:text-foreground">{t('Student timeline')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('Cumulative students by registration date.')}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          <Users className="h-4 w-4" />
          {points.at(-1)?.value.toLocaleString() ?? 0} {t('students')}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-slate-50/70 p-3 dark:bg-muted/20">
        <div className="flex items-center gap-2 self-center text-xs font-bold uppercase text-muted-foreground">
          <CalendarRange className="h-4 w-4" />
          {t('Date range')}
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">{t('From')}</Label>
          <Input
            aria-label={t('From date')}
            type="date"
            value={start}
            min={bounds.min || undefined}
            max={end || bounds.max || undefined}
            disabled={!bounds.min}
            onChange={(event) => updateStart(event.target.value)}
            className="h-9 w-[160px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">{t('To')}</Label>
          <Input
            aria-label={t('To date')}
            type="date"
            value={end}
            min={start || bounds.min || undefined}
            max={bounds.max || undefined}
            disabled={!bounds.max}
            onChange={(event) => updateEnd(event.target.value)}
            className="h-9 w-[160px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">{t('Interval')}</Label>
          <Select value={granularity} onValueChange={(value) => setGranularity(value as StudentTimelineGranularity)}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">{t('Daily')}</SelectItem>
              <SelectItem value="weekly">{t('Weekly')}</SelectItem>
              <SelectItem value="monthly">{t('Monthly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant={chartType === 'line' ? 'default' : 'outline'}
            aria-label={t('Line chart')}
            title={t('Line chart')}
            onClick={() => setChartType('line')}
          >
            <LineChartIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={chartType === 'bar' ? 'default' : 'outline'}
            aria-label={t('Bar chart')}
            title={t('Bar chart')}
            onClick={() => setChartType('bar')}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('No student registration dates available for this scope.')}
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-lg border bg-slate-50/60 p-3 dark:bg-muted/10">
          {chartType === 'line' ? (
            <LineChart data={points} height={240} color="#2563eb" />
          ) : (
            <BarChart data={points.map((point) => ({ ...point, color: '#2563eb' }))} height={210} barSize={24} />
          )}
        </div>
      )}
    </div>
  );
};
