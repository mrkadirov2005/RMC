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
import { SelectField } from '../../students/components/SelectField';
import { paymentMethodOptions, paymentStatusOptions, paymentTypeOptions } from '@/utils/dropdownOptions';
import { useLanguage } from '@/i18n/LanguageContext';
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
              <Label htmlFor="amount">{t('Amount')} *</Label>
              <Input
                type="number"
                id="amount"
                required
                step="0.01"
                min="0"
                value={formData.amount || ''}
                onChange={(e) => setFormData((current) => ({ ...current, amount: Number(e.target.value) }))}
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
