import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { History, Layers3, Loader2, Pencil } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/features/crm/hooks';
import { priceHistoryAPI, type PriceHistory } from '@/features/crm/payments/priceHistory';
import { ChangeGroupPriceDialog } from '@/features/crm/payments/components/ChangeGroupPriceDialog';
import { PriceHistoryTable } from '@/features/crm/payments/components/PriceHistoryTable';
import { formatMoney, formatMonth } from '@/features/crm/payments/priceHistory';

interface Props {
  classId: number;
  className?: string;
  /** The group's price now, from the group record (used until the history has loaded). */
  currentAmount: number;
  /** Reload the group after a change, so the page shows the new price. */
  onChanged?: () => void;
}

/**
 * The group page's Payments tab: the group's price and its history. A group in a level takes the
 * level's price (changed in Subjects → the subject → its level); a group in no level has its own
 * price and the "Change group payment" button (the developer account only). Each month is billed
 * at the price in effect for it, so a new price only counts from the month it starts.
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
  const level = history?.level || null;
  const items = history?.items || [];
  const moves = history?.level_moves || [];

  const section = (title: string, children: ReactNode, icon: ReactNode = <History className="h-4 w-4" />) => (
    <div className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-border">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-border dark:bg-muted/30">
        <div>
          <div className="text-[0.6875rem] font-semibold uppercase text-muted-foreground">{t('Monthly price')}</div>
          <div className="text-lg font-black text-slate-900 dark:text-foreground">{formatMoney(price || 0)}</div>
          {level && (
            <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <Layers3 className="h-3.5 w-3.5" />
              {t('From level {level}', { level: [level.subject_name, level.level_name].filter(Boolean).join(' · ') })}
            </div>
          )}
        </div>
        {isDeveloper && !level && (
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {t('Change group payment')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('Loading...')}
        </div>
      ) : error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>
      ) : (
        <>
          {level && (
            <>
              <p className="text-xs text-muted-foreground">
                {t("This group takes its level's price. To change it, open Subjects → {subject} → {level}.", {
                  subject: level.subject_name || '—',
                  level: level.level_name,
                })}
              </p>
              {section(
                t('Level price history'),
                level.items.length ? (
                  <PriceHistoryTable items={level.items} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t('The level has no price yet.')}</p>
                ),
                <Layers3 className="h-4 w-4" />
              )}
            </>
          )}

          {moves.length > 0 &&
            section(
              t('Levels of this group'),
              <ul className="space-y-1 text-sm">
                {moves.map((move) => (
                  <li key={move.history_id} className="flex flex-wrap gap-x-2">
                    <span className="font-semibold">{formatMonth(move.effective_from)}:</span>
                    <span>
                      {move.level_id
                        ? [move.subject_name, move.level_name].filter(Boolean).join(' · ')
                        : t("Left its level (the group's own price)")}
                    </span>
                    {move.changed_by_name && <span className="text-muted-foreground">({move.changed_by_name})</span>}
                  </li>
                ))}
              </ul>
            )}

          {section(
            moves.length ? t("The group's own price (months it was in no level)") : t('Price history'),
            items.length ? (
              <PriceHistoryTable items={items} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('The price has not been changed yet. Every month is billed at {amount}.', { amount: formatMoney(price || 0) })}
              </p>
            )
          )}
        </>
      )}

      {isDeveloper && !level && (
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
