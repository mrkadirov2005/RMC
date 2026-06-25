import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SelectField } from '../../students/components/SelectField';
import { paymentMethodOptions, paymentStatusOptions, paymentTypeOptions } from '@/utils/dropdownOptions';
import { useLanguage } from '@/i18n/LanguageContext';
import { discountAPI } from '@/shared/api/api';
import type { Payment } from '../types';

interface PaymentFormDialogProps {
  open: boolean;
  editingId: number | null;
  loading: boolean;
  isOwner: boolean;
  centerOptions: Array<{ id?: number; value: string | number; label: string }>;
  studentOptions: Array<{ id?: number; value: string | number; label: string }>;
  isLoadingOptions: boolean;
  formData: Partial<Payment>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Payment>>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const PaymentFormDialog = ({
  open,
  editingId,
  loading,
  isOwner,
  centerOptions,
  studentOptions,
  isLoadingOptions,
  formData,
  setFormData,
  onClose,
  onSubmit,
}: PaymentFormDialogProps) => {
  const { t } = useLanguage();
  const [serialDiscount, setSerialDiscount] = useState<any>(null);
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  const originalAmount = Number(formData.original_amount ?? formData.amount ?? 0);
  const discountValue = Number(formData.discount_value || 0);
  const discountAmount = useMemo(() => {
    if (!formData.discount_kind || originalAmount <= 0) return 0;
    if (formData.discount_value_type === 'percent') {
      return Math.min(originalAmount, (originalAmount * Math.min(discountValue, 100)) / 100);
    }
    return Math.min(originalAmount, discountValue);
  }, [discountValue, formData.discount_kind, formData.discount_value_type, originalAmount]);
  const finalAmount = Math.max(0, originalAmount - discountAmount);

  useEffect(() => {
    if (!open || editingId || !formData.student_id) {
      setSerialDiscount(null);
      return;
    }
    let cancelled = false;
    setLoadingDiscount(true);
    discountAPI
      .getActiveSerialByStudent(Number(formData.student_id))
      .then((res) => {
        if (cancelled) return;
        const discount = (res as any).data ?? null;
        setSerialDiscount(discount);
        if (discount) {
          setFormData((current) => ({
            ...current,
            discount_id: discount.discount_id,
            discount_kind: 'serial_discount',
            discount_value_type: discount.discount_type || 'fixed',
            discount_value: Number(discount.value || 0),
          }));
        }
      })
      .catch(() => {
        if (!cancelled) setSerialDiscount(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDiscount(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editingId, formData.student_id, open, setFormData]);

  useEffect(() => {
    if (!formData.discount_kind) return;
    setFormData((current) => ({
      ...current,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      is_complete: Number(current.amount || 0) >= finalAmount,
    }));
  }, [discountAmount, finalAmount, formData.discount_kind, setFormData]);

  const clearDiscount = () => {
    setSerialDiscount(null);
    setFormData((current) => ({
      ...current,
      discount_id: null,
      discount_kind: null,
      discount_value_type: null,
      discount_value: 0,
      discount_amount: 0,
      final_amount: undefined,
      original_amount: undefined,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? t('Edit Payment') : t('Add New Payment')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {isOwner && (
            <SelectField
              label="Center"
              name="center_id"
              value={formData.center_id || ''}
              onChange={(value) => setFormData((current) => ({ ...current, center_id: Number(value) }))}
              options={centerOptions}
              isLoading={isLoadingOptions}
              required
              placeholder={t('Select a center')}
            />
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField
              label="Student"
              name="student_id"
              value={formData.student_id || ''}
              onChange={(value) => setFormData((current) => ({ ...current, student_id: Number(value) }))}
              options={studentOptions}
              isLoading={isLoadingOptions}
              required
              placeholder={t('Select a student')}
            />
            <SelectField
              label={t('Payment Method')}
              name="payment_method"
              value={formData.payment_method || ''}
              onChange={(value) => setFormData((current) => ({ ...current, payment_method: value }))}
              options={paymentMethodOptions}
              required
              placeholder={t('Select method')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">{formData.discount_kind ? 'Original amount *' : `${t('Amount')} *`}</Label>
              <Input
                type="number"
                id="amount"
                required
                step="0.01"
                min="0"
                value={formData.original_amount ?? formData.amount ?? ''}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setFormData((current) => ({ ...current, amount: value, original_amount: value }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_date">{t('Payment Date')} *</Label>
              <Input
                type="date"
                id="payment_date"
                required
                value={formData.payment_date || ''}
                onChange={(e) => setFormData((current) => ({ ...current, payment_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-bold text-sky-900">Discount</Label>
                <p className="text-xs text-sky-700">
                  {loadingDiscount
                    ? 'Checking active serial discount...'
                    : serialDiscount
                      ? 'Active serial discount is applied automatically.'
                      : 'Use a monthly discount only for this payment.'}
                </p>
              </div>
              {formData.discount_kind === 'serial_discount' ? (
                <Button type="button" variant="outline" size="sm" onClick={clearDiscount}>
                  Remove
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-sky-800">Monthly</span>
                  <Switch
                    checked={formData.discount_kind === 'monthly_discount'}
                    onCheckedChange={(checked) =>
                      checked
                        ? setFormData((current) => ({
                            ...current,
                            discount_kind: 'monthly_discount',
                            discount_value_type: 'fixed',
                            discount_value: 0,
                          }))
                        : clearDiscount()
                    }
                  />
                </div>
              )}
            </div>
            {formData.discount_kind && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                <SelectField
                  label="Discount type"
                  name="discount_value_type"
                  value={formData.discount_value_type || 'fixed'}
                  onChange={(value) =>
                    setFormData((current) => ({ ...current, discount_value_type: value as 'percent' | 'fixed' }))
                  }
                  options={[
                    { label: 'Fixed', value: 'fixed' },
                    { label: 'Percent', value: 'percent' },
                  ]}
                />
                <div className="space-y-2">
                  <Label>Discount value</Label>
                  <Input
                    type="number"
                    min="0"
                    max={formData.discount_value_type === 'percent' ? 100 : undefined}
                    step="0.01"
                    value={formData.discount_value || ''}
                    disabled={formData.discount_kind === 'serial_discount'}
                    onChange={(e) => setFormData((current) => ({ ...current, discount_value: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount amount</Label>
                  <Input readOnly value={discountAmount.toFixed(2)} />
                </div>
                <div className="space-y-2">
                  <Label>Final payable</Label>
                  <Input readOnly value={finalAmount.toFixed(2)} />
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField
              label={t('Payment Type')}
              name="payment_type"
              value={formData.payment_type || ''}
              onChange={(value) => setFormData((current) => ({ ...current, payment_type: value }))}
              options={paymentTypeOptions}
              required
              placeholder={t('Select type')}
            />
            <SelectField
              label="Status"
              name="status"
              value={formData.status || ''}
              onChange={(value) => setFormData((current) => ({ ...current, status: value }))}
              options={paymentStatusOptions}
              required
              placeholder={t('Select status')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="receipt_number">{t('Receipt Number')} *</Label>
              <Input
                type="text"
                id="receipt_number"
                required
                value={formData.receipt_number || ''}
                onChange={(e) => setFormData((current) => ({ ...current, receipt_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference_number">{t('Reference Number')}</Label>
              <Input
                type="text"
                id="reference_number"
                value={formData.reference_number || ''}
                onChange={(e) => setFormData((current) => ({ ...current, reference_number: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">{t('Notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData((current) => ({ ...current, notes: e.target.value }))}
              placeholder={t('Additional notes...')}
            />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} onClick={onSubmit}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentFormDialog;
