import { CreditCard, FileText, ReceiptText, UserRound, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectField } from '../../students/components/SelectField';
import { formLabelClassName } from '@/components/ui/form-control';
import { cn } from '@/lib/utils';
import type { Payment } from '../types';
import { paymentMethodOptions, paymentStatusOptions, paymentTypeOptions } from '@/utils/dropdownOptions';

type Option = { id?: number; label: string; value: string | number };

type StudentSummary = {
  name: string;
  subtitle?: string;
  className?: string;
  amount?: number;
};

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  formData: Partial<Payment>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Payment>>>;
  onSubmit: (event: React.FormEvent) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  studentOptions?: Option[];
  centerOptions?: Option[];
  isLoadingOptions?: boolean;
  showStudentSelect?: boolean;
  showCenterSelect?: boolean;
  selectedStudent?: StudentSummary | null;
  amountHint?: string;
  disableCenterSelect?: boolean;
  submitDisabled?: boolean;
}

const shellClass =
  'rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/96';
const sectionClass =
  'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70';
const statClass =
  'rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70';

const setPaymentField = (
  setter: React.Dispatch<React.SetStateAction<Partial<Payment>>>,
  patch: Partial<Payment>
) => {
  setter((current) => ({
    ...current,
    ...patch,
  }));
};

export const PaymentFormDialog = ({
  open,
  onOpenChange,
  title,
  description,
  formData,
  setFormData,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save payment',
  studentOptions = [],
  centerOptions = [],
  isLoadingOptions = false,
  showStudentSelect = false,
  showCenterSelect = false,
  selectedStudent,
  amountHint,
  disableCenterSelect = false,
  submitDisabled = false,
}: PaymentFormDialogProps) => {
  const normalizedAmount = Number(formData.amount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(shellClass, 'max-h-[90vh] max-w-4xl overflow-y-auto p-0 gap-0')}>
        <DialogHeader className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className={statClass}>
              <p className={formLabelClassName}>Student</p>
              <div className="mt-2 flex items-start gap-2">
                <UserRound className="mt-0.5 h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {selectedStudent?.name || 'Not selected yet'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedStudent?.subtitle || 'Choose who the payment belongs to.'}
                  </p>
                </div>
              </div>
            </div>
            <div className={statClass}>
              <p className={formLabelClassName}>Group</p>
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                {selectedStudent?.className || 'No group attached'}
              </p>
            </div>
            <div className={statClass}>
              <p className={formLabelClassName}>Current amount</p>
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                {normalizedAmount > 0 ? `UZS ${normalizedAmount.toLocaleString()}` : 'Set amount'}
              </p>
              {selectedStudent?.amount ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Monthly fee: UZS {Number(selectedStudent.amount).toLocaleString()}
                </p>
              ) : null}
            </div>
          </div>

          <section className={sectionClass}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                <UserRound className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Payer details</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose the student and center scope for this payment.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {showStudentSelect ? (
                <SelectField
                  label="Student"
                  name="student_id"
                  value={formData.student_id || ''}
                  onChange={(value) => setPaymentField(setFormData, { student_id: Number(value) })}
                  options={studentOptions}
                  isLoading={isLoadingOptions}
                  required
                  placeholder="Select student"
                />
              ) : (
                <div className="space-y-2">
                  <Label className={formLabelClassName}>Student</Label>
                  <div className="flex min-h-10 items-center rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
                    {selectedStudent?.name || 'Student not selected'}
                  </div>
                </div>
              )}

              {showCenterSelect ? (
                <SelectField
                  label="Center"
                  name="center_id"
                  value={formData.center_id || ''}
                  onChange={(value) => setPaymentField(setFormData, { center_id: Number(value) })}
                  options={centerOptions}
                  isLoading={isLoadingOptions}
                  disabled={disableCenterSelect}
                  required
                  placeholder="Select center"
                />
              ) : null}
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Payment details</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Keep the financial fields consistent across all payment entry points.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="payment_date" className={formLabelClassName}>Payment date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  required
                  value={formData.payment_date || ''}
                  onChange={(event) => setPaymentField(setFormData, { payment_date: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount" className={formLabelClassName}>Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.amount ?? ''}
                  onChange={(event) => setPaymentField(setFormData, { amount: Number(event.target.value) })}
                />
                {amountHint ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{amountHint}</p>
                ) : null}
              </div>
              <SelectField
                label="Method"
                name="payment_method"
                value={formData.payment_method || ''}
                onChange={(value) => setPaymentField(setFormData, { payment_method: value })}
                options={paymentMethodOptions}
                required
                placeholder="Select method"
              />
              <SelectField
                label="Type"
                name="payment_type"
                value={formData.payment_type || ''}
                onChange={(value) => setPaymentField(setFormData, { payment_type: value })}
                options={paymentTypeOptions}
                required
                placeholder="Select type"
              />
              <SelectField
                label="Status"
                name="payment_status"
                value={formData.payment_status || formData.status || ''}
                onChange={(value) => setPaymentField(setFormData, { payment_status: value, status: value })}
                options={paymentStatusOptions}
                required
                placeholder="Select status"
              />
              <div className="space-y-2">
                <Label htmlFor="currency" className={formLabelClassName}>Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency || 'UZS'}
                  readOnly
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <ReceiptText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Receipt and notes</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Use stable references so records stay easy to search and audit.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="receipt_number" className={formLabelClassName}>Receipt number</Label>
                <Input
                  id="receipt_number"
                  required
                  value={formData.receipt_number || ''}
                  onChange={(event) => setPaymentField(setFormData, { receipt_number: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transaction_reference" className={formLabelClassName}>Transaction reference</Label>
                <Input
                  id="transaction_reference"
                  value={formData.transaction_reference || formData.reference_number || ''}
                  onChange={(event) =>
                    setPaymentField(setFormData, {
                      transaction_reference: event.target.value,
                      reference_number: event.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes" className={formLabelClassName}>Notes</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  value={formData.notes || ''}
                  onChange={(event) => setPaymentField(setFormData, { notes: event.target.value })}
                  placeholder="Optional context about this payment..."
                />
              </div>
            </div>
          </section>

          <DialogFooter className="border-t border-slate-200/80 px-0 pt-5 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled || isSubmitting} className="gap-2">
              <FileText className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
