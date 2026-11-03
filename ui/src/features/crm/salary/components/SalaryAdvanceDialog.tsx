import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { addSalaryAdvance, removeSalaryAdvance, selectSalaryAdvanceLoading } from '@/slices/salariesSlice';
import { formatSalaryPeriod } from '../model/salaryModel';
import { formatMoney } from '@/utils/helpers';
import type { SalaryAdvance } from '../types';
import { useLanguage } from '@/i18n/LanguageContext';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card'];

interface SalaryAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: number;
  teacherName: string;
  salaryYear: number;
  salaryMonth: number;
  /** Money already given for this month, newest first (only the entries of `kind` are listed). */
  advances: SalaryAdvance[];
  /** An advance (before the salary is due), or a part of the salary itself. */
  kind?: 'advance' | 'salary';
  /** For the salary: what is left of it by the teacher's pay rate; more cannot be given. */
  limit?: number;
}

/**
 * Gives a teacher money against one month's salary, and lists what was already given: an advance
 * (avans), or the salary itself, in one go or in parts, up to what is left of it.
 */
export const SalaryAdvanceDialog = ({
  open,
  onOpenChange,
  teacherId,
  teacherName,
  salaryYear,
  salaryMonth,
  advances: allEntries,
  kind = 'advance',
  limit,
}: SalaryAdvanceDialogProps) => {
  const isSalary = kind === 'salary';
  const advances = allEntries.filter((entry) => (entry.kind === 'salary') === isSalary);
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const submitting = useAppSelector(selectSalaryAdvanceLoading);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    // The salary is offered in full: whatever is left of it.
    setAmount(isSalary && limit && limit > 0 ? String(limit) : '');
    setPaymentMethod('Cash');
    setNotes('');
  }, [open, isSalary, limit]);

  const parsedAmount = Number(amount);
  const overLimit = isSalary && limit !== undefined && parsedAmount > limit + 0.01;
  const isValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0 && !overLimit;
  const total = advances.reduce((sum, advance) => sum + (Number(advance.amount) || 0), 0);

  const handleSubmit = async () => {
    if (!isValid) return;
    const result = await dispatch(
      addSalaryAdvance({
        teacher_id: teacherId,
        salary_year: salaryYear,
        salary_month: salaryMonth,
        amount: parsedAmount,
        payment_method: paymentMethod || undefined,
        notes: notes.trim() || undefined,
        kind,
      })
    );
    if ((result as any).meta?.requestStatus === 'fulfilled') {
      // What is left of the salary changed: the page reloads it once the window closes.
      if (isSalary) return onOpenChange(false);
      setAmount('');
      setNotes('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isSalary ? t('Give salary') : t('Give Advance')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {teacherName} — {formatSalaryPeriod(salaryYear, salaryMonth)}
          </p>

          {advances.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-2.5 text-xs">
              <p className="mb-1.5 font-semibold">
                {isSalary ? t('Salary given: {total}', { total: formatMoney(total) }) : t('Advances given: {total}', { total: formatMoney(total) })}
              </p>
              <ul className="space-y-1">
                {advances.map((advance) => (
                  <li key={advance.advance_id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-semibold">{formatMoney(advance.amount)}</span>
                      <span className="text-muted-foreground">
                        {' · '}{advance.given_at ? new Date(advance.given_at).toLocaleDateString() : ''}
                        {advance.given_by_name ? ` · ${advance.given_by_name}` : ''}
                        {advance.notes ? ` · ${advance.notes}` : ''}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-rose-600"
                      aria-label={isSalary ? t('Take back this payment') : t('Remove advance')}
                      disabled={submitting}
                      onClick={() => dispatch(removeSalaryAdvance({ id: advance.advance_id, teacherId }))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-1">
            <Label>{isSalary ? t('Amount given now') : t('Advance Amount')}</Label>
            <Input
              type="number"
              min="0"
              max={isSalary && limit !== undefined ? limit : undefined}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 300000"
            />
            {isSalary && limit !== undefined && (
              <p className={overLimit ? 'text-xs font-semibold text-rose-600' : 'text-xs text-muted-foreground'}>
                {overLimit
                  ? t('More than what is left of the salary ({left}).', { left: formatMoney(limit) })
                  : limit > 0
                    ? t('Left of the salary: {left}. A smaller amount leaves the rest for later.', { left: formatMoney(limit) })
                    : t('Nothing is left of the salary by pay rate.')}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>{t('Payment Method')}</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder={t('Select payment method')} />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('Notes')}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Optional notes')} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Close')}</Button>
          <Button onClick={handleSubmit} disabled={submitting || !isValid} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isSalary ? t('Give salary') : t('Give Advance')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
