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
  /** Advances already given for this month, newest first. */
  advances: SalaryAdvance[];
}

/** Gives a teacher an advance (avans) against one month's salary, and lists the ones already given. */
export const SalaryAdvanceDialog = ({ open, onOpenChange, teacherId, teacherName, salaryYear, salaryMonth, advances }: SalaryAdvanceDialogProps) => {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const submitting = useAppSelector(selectSalaryAdvanceLoading);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setPaymentMethod('Cash');
    setNotes('');
  }, [open]);

  const parsedAmount = Number(amount);
  const isValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
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
      })
    );
    if ((result as any).meta?.requestStatus === 'fulfilled') {
      setAmount('');
      setNotes('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Give Advance')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {teacherName} — {formatSalaryPeriod(salaryYear, salaryMonth)}
          </p>

          {advances.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-2.5 text-xs">
              <p className="mb-1.5 font-semibold">{t('Advances given: {total}', { total: formatMoney(total) })}</p>
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
                      aria-label={t('Remove advance')}
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
            <Label>{t('Advance Amount')}</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 300000" />
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
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Give Advance')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
