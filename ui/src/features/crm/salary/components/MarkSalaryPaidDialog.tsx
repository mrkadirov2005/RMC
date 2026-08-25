import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { markSalaryPaid, selectSalaryMarkPaidLoading } from '@/slices/salariesSlice';
import { formatSalaryPeriod } from '../model/salaryModel';
import { formatMoney } from '@/utils/helpers';
import type { SalaryStudentStats } from '../types';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Other'];

interface MarkSalaryPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: number;
  teacherName: string;
  salaryYear: number;
  salaryMonth: number;
  studentStats: SalaryStudentStats;
  existingAmount?: number | string | null;
  existingPaymentMethod?: string | null;
  existingNotes?: string | null;
}

export const MarkSalaryPaidDialog = ({
  open,
  onOpenChange,
  teacherId,
  teacherName,
  salaryYear,
  salaryMonth,
  studentStats,
  existingAmount,
  existingPaymentMethod,
  existingNotes,
}: MarkSalaryPaidDialogProps) => {
  const dispatch = useAppDispatch();
  const submitting = useAppSelector(selectSalaryMarkPaidLoading);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    const defaultAmount = existingAmount != null ? existingAmount : studentStats.collected_amount;
    setAmount(defaultAmount != null ? String(defaultAmount) : '');
    setPaymentMethod(existingPaymentMethod || 'Cash');
    setNotes(existingNotes || '');
  }, [open, existingAmount, existingPaymentMethod, existingNotes, studentStats.collected_amount]);

  const parsedAmount = Number(amount);
  const isValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount >= 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    const result = await dispatch(
      markSalaryPaid({
        teacher_id: teacherId,
        salary_year: salaryYear,
        salary_month: salaryMonth,
        amount: parsedAmount,
        payment_method: paymentMethod || undefined,
        notes: notes.trim() || undefined,
      })
    );
    if ((result as any).meta?.requestStatus === 'fulfilled') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Salary as Paid</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {teacherName} — {formatSalaryPeriod(salaryYear, salaryMonth)}
          </p>

          <div className="grid grid-cols-2 gap-1.5 rounded-md border bg-muted/30 p-2.5 text-xs sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Students Paid</p>
              <p className="font-bold text-emerald-600">{studentStats.paid_students}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Students Unpaid</p>
              <p className="font-bold text-rose-600">{studentStats.unpaid_students}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid %</p>
              <p className="font-bold text-primary">{studentStats.paid_percent}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Collected</p>
              <p className="font-bold">{formatMoney(studentStats.collected_amount)}</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Total Amount</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
            />
            <p className="text-[11px] text-muted-foreground">
              Pre-filled from the amount collected this month — edit to set the actual salary.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !isValid}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark as Paid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
