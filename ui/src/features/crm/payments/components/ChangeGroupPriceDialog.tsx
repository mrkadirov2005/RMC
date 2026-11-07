import { useEffect, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getCenterMonthKey } from '@/shared/billingPeriod';
import { useLanguage } from '@/i18n/LanguageContext';
import { priceHistoryAPI } from '../priceHistory';
import { refreshGroupPrices } from '@/shared/groupPrices';

const shiftMonth = (monthKey: string, count: number) => {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const formatMoney = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} UZS`;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: number;
  className?: string;
  currentAmount: number;
  onChanged: () => void;
}

/** "Change group payment": a new price from a month. Earlier months keep their price. */
export const ChangeGroupPriceDialog = ({ open, onOpenChange, classId, className, currentAmount, onChanged }: Props) => {
  const { t } = useLanguage();
  const thisMonth = getCenterMonthKey();
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(thisMonth);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(currentAmount ? String(currentAmount) : '');
    setMonth(getCenterMonthKey());
    setNote('');
    setError(null);
  }, [open, currentAmount]);

  const value = Number(amount);
  const valid = amount !== '' && Number.isFinite(value) && value >= 0 && /^\d{4}-\d{2}$/.test(month);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await priceHistoryAPI.change(classId, { amount: value, effective_month: month, note: note.trim() || undefined });
      void refreshGroupPrices();
      onChanged();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || t('Could not change the price.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('Change group payment')}</DialogTitle>
            <DialogDescription>
              {className ? `${className} · ` : ''}
              {t('Current price: {amount}', { amount: formatMoney(currentAmount) })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="group-price-amount">{t('New monthly price (UZS)')}</Label>
            <Input
              id="group-price-amount"
              type="number"
              min={0}
              step="1000"
              required
              autoFocus
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-price-month">{t('Starts from month')}</Label>
            <Input
              id="group-price-month"
              type="month"
              required
              min={shiftMonth(thisMonth, -12)}
              max={shiftMonth(thisMonth, 12)}
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('Months before this keep their old price, so payments made at the old price stay paid.')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-price-note">{t('Note (optional)')}</Label>
            <Textarea
              id="group-price-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('Why the price changed')}
            />
          </div>

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Save price')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
