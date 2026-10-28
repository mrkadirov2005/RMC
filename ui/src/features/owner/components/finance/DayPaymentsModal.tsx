// Every payment taken on one day, opened from a day in the Moliya chart or the Kunlik table.

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/utils/helpers';
import { isCollectedPayment } from '../../../crm/dashboard/dailyPayments';
import { getOwnerPaymentAmount } from '../../utils';
import type { OwnerManagerStatisticsCollections } from '../../types';

interface Props {
  /** The day as YYYY-MM-DD, or null while the modal is closed. */
  dateKey: string | null;
  onClose: () => void;
  collections: OwnerManagerStatisticsCollections;
}

const formatTime = (value: unknown) => {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
};

export const DayPaymentsModal = ({ dateKey, onClose, collections }: Props) => {
  const students = useMemo(() => new Map(collections.students.map((student) => [Number(student?.student_id || student?.id || 0), student])), [collections.students]);
  const classes = useMemo(() => new Map(collections.classes.map((cls) => [Number(cls?.class_id || cls?.id || 0), cls])), [collections.classes]);

  const rows = useMemo(() => {
    if (!dateKey) return [];
    return collections.payments
      .filter((payment) => String(payment?.payment_date || '').slice(0, 10) === dateKey && isCollectedPayment(payment))
      .sort((a, b) => String(a?.created_at || '').localeCompare(String(b?.created_at || '')));
  }, [collections.payments, dateKey]);
  const total = rows.reduce((sum, payment) => sum + getOwnerPaymentAmount(payment), 0);

  return (
    <Dialog open={Boolean(dateKey)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[86vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {dateKey ? new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </DialogTitle>
          <DialogDescription>Shu kuni qabul qilingan barcha to'lovlar.</DialogDescription>
        </DialogHeader>
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
            <span>{rows.length} ta to'lov</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>
        <div className="max-h-[56vh] overflow-auto px-6 py-4">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Bu kuni to'lov topilmadi.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>O'quvchi</TableHead>
                  <TableHead>Guruh</TableHead>
                  <TableHead>Usul</TableHead>
                  <TableHead>Qabul qildi</TableHead>
                  <TableHead>Vaqt</TableHead>
                  <TableHead className="text-right">Summa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((payment, index) => {
                  const studentId = Number(payment?.student_id || 0);
                  const student = students.get(studentId);
                  const cls = classes.get(Number(student?.class_id || 0));
                  const name = student
                    ? [student.first_name, student.last_name].filter(Boolean).join(' ').trim() || `Student ${studentId}`
                    : `Student ${studentId || '-'}`;
                  return (
                    <TableRow key={payment?.payment_id || payment?.id || index}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{cls?.class_name || '-'}</TableCell>
                      <TableCell>{payment?.payment_method || '-'}</TableCell>
                      <TableCell>{payment?.received_by_name || '-'}</TableCell>
                      <TableCell>{formatTime(payment?.created_at)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{formatMoney(getOwnerPaymentAmount(payment))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
