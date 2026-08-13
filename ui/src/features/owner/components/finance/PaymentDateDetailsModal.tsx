// Drill-down modal for payments made on a specific date, picked via year -> month -> day.

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/utils/helpers';
import { getOwnerPaymentAmount, getOwnerPaymentDateValue } from '../../utils';
import type { OwnerManagerStatisticsCollections } from '../../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: OwnerManagerStatisticsCollections;
}

const isPaidPayment = (payment: any) => {
  const status = String(payment?.status || payment?.payment_status || '').toLowerCase();
  return status === 'paid' || status === 'completed';
};

const pad = (value: number) => String(value).padStart(2, '0');

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

export const PaymentDateDetailsModal = ({ open, onOpenChange, collections }: Props) => {
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);

  const years = useMemo(() => {
    const set = new Set<number>();
    collections.payments.forEach((payment) => {
      const raw = getOwnerPaymentDateValue(payment);
      if (!raw) return;
      const date = new Date(String(raw));
      if (!Number.isNaN(date.getTime())) set.add(date.getFullYear());
    });
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [collections.payments]);

  const dayCount = year && month ? daysInMonth(year, month) : 31;

  const studentMap = useMemo(() => {
    const map = new Map<number, any>();
    collections.students.forEach((student) => {
      const id = Number(student?.student_id || student?.id || 0);
      if (id) map.set(id, student);
    });
    return map;
  }, [collections.students]);

  const classMap = useMemo(() => {
    const map = new Map<number, any>();
    collections.classes.forEach((cls) => {
      const id = Number(cls?.class_id || cls?.id || 0);
      if (id) map.set(id, cls);
    });
    return map;
  }, [collections.classes]);

  const rows = useMemo(() => {
    if (!year) return [];
    return collections.payments
      .filter((payment) => {
        if (!isPaidPayment(payment)) return false;
        const raw = getOwnerPaymentDateValue(payment);
        if (!raw) return false;
        const date = new Date(String(raw));
        if (Number.isNaN(date.getTime())) return false;
        if (date.getFullYear() !== year) return false;
        if (month && date.getMonth() + 1 !== month) return false;
        if (day && date.getDate() !== day) return false;
        return true;
      })
      .sort((a, b) => {
        const aTime = new Date(String(getOwnerPaymentDateValue(a))).getTime() || 0;
        const bTime = new Date(String(getOwnerPaymentDateValue(b))).getTime() || 0;
        return bTime - aTime;
      });
  }, [collections.payments, year, month, day]);

  const totalAmount = rows.reduce((sum, payment) => sum + getOwnerPaymentAmount(payment), 0);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setYear(null);
      setMonth(null);
      setDay(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>To'lov qilgan o'quvchilar</DialogTitle>
          <DialogDescription>Yilni tanlang - shu yildagi barcha to'lovlar korinadi. Toraytirish uchun oy va kunni ham tanlashingiz mumkin.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6 py-4">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="mb-1 text-[10px] font-black uppercase text-slate-500">Yil</p>
              <Select value={year ? String(year) : undefined} onValueChange={(value) => { setYear(Number(value)); setMonth(null); setDay(null); }}>
                <SelectTrigger className="h-9 text-xs font-bold"><SelectValue placeholder="Yil" /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase text-slate-500">Oy</p>
              <Select
                value={month ? String(month) : undefined}
                onValueChange={(value) => { setMonth(Number(value)); setDay(null); }}
                disabled={!year}
              >
                <SelectTrigger className="h-9 text-xs font-bold"><SelectValue placeholder="Oy" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>{pad(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase text-slate-500">Kun</p>
              <Select
                value={day ? String(day) : undefined}
                onValueChange={(value) => setDay(Number(value))}
                disabled={!month}
              >
                <SelectTrigger className="h-9 text-xs font-bold"><SelectValue placeholder="Kun" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: dayCount }, (_, index) => index + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>{pad(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {year && (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
              <span>{rows.length} ta to'lov</span>
              <span>{formatMoney(totalAmount)}</span>
            </div>
          )}
        </div>

        <div className="max-h-[46vh] overflow-auto border-t px-6 py-4">
          {!year ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Natijalarni korish uchun avval yilni tanlang.
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Bu davrda tolov topilmadi.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>O'quvchi</TableHead>
                  <TableHead>Guruh</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead className="text-right">Summa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((payment, index) => {
                  const studentId = Number(payment?.student_id || 0);
                  const student = studentMap.get(studentId);
                  const classId = Number(student?.class_id || 0);
                  const cls = classId ? classMap.get(classId) : undefined;
                  const studentName = student
                    ? [student?.first_name, student?.last_name].filter(Boolean).join(' ').trim() || `Student ${studentId}`
                    : `Student ${studentId || '-'}`;
                  const paymentDate = new Date(String(getOwnerPaymentDateValue(payment)));
                  return (
                    <TableRow key={payment?.payment_id || payment?.id || index}>
                      <TableCell className="font-medium">{studentName}</TableCell>
                      <TableCell>{cls?.class_name || '-'}</TableCell>
                      <TableCell>{Number.isNaN(paymentDate.getTime()) ? '-' : paymentDate.toLocaleDateString()}</TableCell>
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
