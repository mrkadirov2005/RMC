// Kassa hisoboti: the admin picks a day and sees what came in by cash, card and bank account,
// what was spent and what is left to hand over; expenses are recorded in the second tab.
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { useLanguage } from '@/i18n/LanguageContext';
import { cashAPI } from './api';
import { centerToday, shiftDay, type DailyCashReport as Report } from './cashFormat';
import { DailyCashReport } from './components/DailyCashReport';
import { ExpensesPanel } from './components/ExpensesPanel';

const CashReportPage = () => {
  const { t } = useLanguage();
  const [date, setDate] = useState(centerToday);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReport(getApiPayload<Report>(await cashAPI.getDaily(date)));
    } catch (err) {
      setReport(null);
      setError(getErrorMessage(err) || 'Could not load the daily report');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">{t('Cash report')}</h1>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label={t('Previous day')} onClick={() => setDate((day) => shiftDay(day, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Input type="date" aria-label={t('Report date')} value={date} max={centerToday()} onChange={(event) => event.target.value && setDate(event.target.value)} className="w-40" />
          <Button variant="outline" size="icon" aria-label={t('Next day')} disabled={date >= centerToday()} onClick={() => setDate((day) => shiftDay(day, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(centerToday())}>{t('Today')}</Button>
        </div>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">{t('Daily report')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('Expenses')}</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="pt-3">
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{t(error)}</p>
          ) : report ? (
            <DailyCashReport report={report} />
          ) : null}
        </TabsContent>
        <TabsContent value="expenses" className="pt-3">
          <ExpensesPanel date={date} onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CashReportPage;
