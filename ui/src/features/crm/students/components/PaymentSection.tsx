// Source file for the students area in the crm feature.

import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { paymentAPI } from '../../../../shared/api/api';
import { showToast } from '../../../../utils/toast';
import { formatMoney } from '../../../../utils/helpers';
import { PaymentFormDialog } from '../../payments/components/PaymentFormDialog';
import { createPaymentDraft, normalizePaymentFormData } from '../../payments/utils/paymentForm';

interface Payment {
  payment_id?: number;
  id?: number;
  student_id?: number;
  center_id?: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: string;
  status?: string;
  payment_status: string;
  receipt_number: string;
  currency?: string;
  transaction_reference?: string;
  notes?: string;
}

interface Student {
  student_id?: number;
  id?: number;
  center_id?: number;
  first_name?: string;
  last_name?: string;
}

interface Class {
  class_id?: number;
  id?: number;
  payment_amount?: number;
  class_name?: string;
}

interface PaymentSectionProps {
  payments: Payment[];
  student?: Student;
  classData?: Class | null;
  onRefresh: () => void;
}

// Returns status badge variant.
const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Renders the payment section module.
export const PaymentSection = ({ payments, student, classData, onRefresh }: PaymentSectionProps) => {
  const defaultCenterId = student?.center_id || 0;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Payment>>(
    createPaymentDraft(defaultCenterId, { amount: classData?.payment_amount || 0 })
  );
  const [loading, setLoading] = useState(false);

  const getNewPaymentDraft = (): Partial<Payment> => ({
    ...createPaymentDraft(defaultCenterId),
    amount: classData?.payment_amount || 0,
  });

// Handles open modal.
  const handleOpenModal = (payment?: Payment) => {
    if (payment) {
      setEditingId(payment.payment_id || payment.id || null);
      setFormData(normalizePaymentFormData(payment, defaultCenterId));
    } else {
      setEditingId(null);
      setFormData(getNewPaymentDraft());
    }
    setIsModalOpen(true);
  };

// Handles close modal.
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(getNewPaymentDraft());
  };

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const paymentData = {
        ...formData,
        student_id: student?.student_id || student?.id,
        center_id: student?.center_id,
        amount: Number(formData.amount || classData?.payment_amount || 0),
        payment_method: formData.payment_method || 'Cash',
        payment_type: formData.payment_type || 'Tuition',
        payment_status: formData.payment_status || formData.status || 'Completed',
        status: formData.payment_status || formData.status || 'Completed',
        currency: formData.currency || 'UZS',
        receipt_number: formData.receipt_number,
        transaction_reference: formData.transaction_reference,
      };

      if (editingId) {
        await paymentAPI.update(editingId, paymentData);
        showToast.success('Payment updated successfully');
      } else {
        await paymentAPI.create(paymentData);
        showToast.success('Payment created successfully');
      }
      onRefresh();
      handleCloseModal();
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast.error(err.message || 'Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

// Handles delete.
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      try {
        await paymentAPI.delete(id);
        showToast.success('Payment deleted successfully');
        onRefresh();
      } catch (error: unknown) {
        const err = error as { message?: string };
        showToast.error(err.message || 'Failed to delete payment');
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Payment History</CardTitle>
        <Button size="sm" onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Payment
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No payment records
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment, index) => (
                  <TableRow key={payment.payment_id || payment.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatMoney(payment.amount)}</TableCell>
                    <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                    <TableCell>{payment.payment_method}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-semibold border ${getStatusBadgeVariant(payment.payment_status)}`}>
                        {payment.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(payment)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(payment.payment_id || payment.id || 0)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <PaymentFormDialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
        title={editingId ? 'Edit Payment' : 'Add Payment'}
        description="Manage this student payment from the same popup structure used across the CRM."
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={loading}
        submitLabel={editingId ? 'Update payment' : 'Save payment'}
        selectedStudent={{
          name:
            `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'Selected student',
          subtitle: `Student ID ${student?.student_id || student?.id || '-'}`,
          className: classData?.class_name || 'No class assigned',
          amount: classData?.payment_amount,
        }}
        paymentHistory={payments}
        historyExpectedAmount={Number(classData?.payment_amount || 0)}
        amountHint={
          classData?.payment_amount
            ? `Suggested from ${classData.class_name || 'current class'} fee: ${formatMoney(
                Number(classData.payment_amount || 0)
              )}`
            : undefined
        }
      />
    </Card>
  );
};
