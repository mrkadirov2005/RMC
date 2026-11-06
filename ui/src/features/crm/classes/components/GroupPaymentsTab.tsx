import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAppSelector } from '@/features/crm/hooks';
import { priceHistoryAPI, type PriceHistory } from '@/features/crm/payments/priceHistory';
import { ChangeGroupPriceDialog } from '@/features/crm/payments/components/ChangeGroupPriceDialog';

const formatMoney = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} UZS`;

const formatMonth = (monthKey: string) => {
  const date = new Date(`${monthKey}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? monthKey : date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

interface Props {
  classId: number;
  className?: string;
  /** The group's price now, from the group record (used until the history has loaded). */
  currentAmount: number;
  /** Reload the group after a change, so the page shows the new price. */
  onChanged?: () => void;
}

/**
 * The group page's Payments tab: the group's price, the "Change group payment" button (the
 * developer account only) and the price history. Each month is billed at the price in effect for
 * it, so a new price only counts from the month it starts.
 */
export const GroupPaymentsTab = ({ classId, className, currentAmount, onChanged }: Props) => {
  const { t } = useLanguage();
  const user = useAppSelector((state) => state.auth.user);
  const isDeveloper = user?.userType === 'superuser' && user?.is_developer === true;
  const [history, setHistory] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await priceHistoryAPI.get(classId);
      setHistory(response.data);
    } catch {
      setError(t('Could not load the price history.'));
    } finally {
      setLoading(false);
    }
  }, [classId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const price = history ? history.current_amount : currentAmount;
  const items = history?.items || [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-border dark:bg-muted/30">
        <div>
          <div className="text-[0.6875rem] font-semibold uppercase text-muted-foreground">{t('Monthly price')}</div>
          <div className="text-lg font-black text-slate-900 dark:text-foreground">{formatMoney(price || 0)}</div>
        </div>
        {isDeveloper && (
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {t('Change group payment')}
          </Button>
        )}
      </div>

      <div className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-border">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-foreground">
          <History className="h-4 w-4" />
          {t('Price history')}
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('Loading...')}
          </div>
        ) : error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('The price has not been changed yet. Every month is billed at {amount}.', { amount: formatMoney(price || 0) })}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('From month')}</TableHead>
                  <TableHead className="text-xs">{t('Price')}</TableHead>
                  <TableHead className="text-xs">{t('Previous price')}</TableHead>
                  <TableHead className="text-xs">{t('Changed by')}</TableHead>
                  <TableHead className="text-xs">{t('Note')}</TableHead>
                  <TableHead className="text-xs">{t('Saved')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((entry) => {
                  const initial = entry.source === 'initial';
                  return (
                    <TableRow key={entry.history_id}>
                      <TableCell className="text-xs font-semibold">
                        {initial ? t('Before the first change') : formatMonth(entry.effective_from)}
                      </TableCell>
                      <TableCell className="text-xs font-bold">{formatMoney(entry.amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.previous_amount == null ? '—' : formatMoney(entry.previous_amount)}
                      </TableCell>
                      <TableCell className="text-xs">{entry.changed_by_name || '—'}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs" title={entry.note || ''}>
                        {initial ? '—' : entry.note || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {initial ? '—' : new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {isDeveloper && (
        <ChangeGroupPriceDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          classId={classId}
          className={className}
          currentAmount={price || 0}
          onChanged={() => {
            void load();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
};
