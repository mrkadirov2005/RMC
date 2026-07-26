import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BadgePercent, CalendarDays, Layers3, List, WalletCards } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart } from '@/shared/components/PieChart';
import { formatMoney } from '@/utils/helpers';
import type { OwnerManagerStatisticsCollections } from '../../types';

interface Props {
  collections: OwnerManagerStatisticsCollections;
}

type DiscountKind = 'serial_discount' | 'monthly_discount';

type DiscountRecord = {
  key: string;
  kind: DiscountKind;
  raw: any;
  studentId: number;
  studentName: string;
  groupName: string;
  originalAmount: number;
  finalAmount: number;
  discountAmount: number;
  valueLabel: string;
  reason: string;
  status: string;
};

const colors = {
  serial: '#2563eb',
  monthly: '#10b981',
};

const kindLabels: Record<DiscountKind, string> = {
  serial_discount: 'Serial discount',
  monthly_discount: 'One-month discount',
};

const getId = (item: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = Number(item?.[key] || 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
};

const getStudentName = (record: any, student: any, studentId: number) => {
  const name = [
    record?.student_first_name || student?.first_name,
    record?.student_last_name || student?.last_name,
  ].filter(Boolean).join(' ').trim();
  return name || (studentId ? `Student #${studentId}` : 'Unknown student');
};

const getDiscountAmount = (record: any) => {
  const direct = Number(record?.discount_amount);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const original = Number(record?.original_price ?? record?.original_amount ?? record?.payment_amount ?? record?.amount ?? 0);
  const finalAmount = Number(record?.final_price ?? record?.final_amount ?? record?.amount ?? original);
  return Math.max(0, original - finalAmount);
};

const getOriginalAmount = (record: any, discountAmount: number) => {
  const original = Number(record?.original_price ?? record?.original_amount ?? record?.payment_amount ?? 0);
  if (Number.isFinite(original) && original > 0) return original;
  return Number(record?.amount || 0) + discountAmount;
};

const getFinalAmount = (record: any, originalAmount: number, discountAmount: number) => {
  const finalAmount = Number(record?.final_price ?? record?.final_amount);
  if (Number.isFinite(finalAmount) && finalAmount >= 0) return finalAmount;
  const amount = Number(record?.amount);
  if (Number.isFinite(amount) && amount >= 0) return amount;
  return Math.max(0, originalAmount - discountAmount);
};

const getValueLabel = (record: any) => {
  const value = Number(record?.value ?? record?.discount_value ?? 0);
  const type = String(record?.discount_type || record?.discount_value_type || '').trim();
  if (!value) return '-';
  return type === 'percent' ? `${value}%` : formatMoney(value);
};

export const DiscountStatsPanel = ({ collections }: Props) => {
  const [selectedKind, setSelectedKind] = useState<DiscountKind | null>(null);

  const stats = useMemo(() => {
    const studentsById = new Map(collections.students.map((student) => [getId(student, 'student_id', 'id'), student]));
    const classesById = new Map(collections.classes.map((cls) => [getId(cls, 'class_id', 'id'), cls]));
    const discountRows = collections.discounts || [];
    const paymentDiscountRows = collections.payments.filter((payment) => Number(payment?.discount_amount || 0) > 0);
    const source = paymentDiscountRows.length > 0 ? paymentDiscountRows : discountRows;

    const records = source
      .map<DiscountRecord | null>((item, index) => {
        const kind = item?.discount_kind as DiscountKind;
        if (kind !== 'serial_discount' && kind !== 'monthly_discount') return null;
        const studentId = getId(item, 'student_id');
        const student = studentsById.get(studentId);
        const classId = getId(item, 'class_id') || getId(student, 'class_id');
        const cls = classesById.get(classId);
        const discountAmount = getDiscountAmount(item);
        const originalAmount = getOriginalAmount(item, discountAmount);
        const finalAmount = getFinalAmount(item, originalAmount, discountAmount);

        return {
          key: String(item?.discount_id || item?.payment_id || `${kind}-${studentId}-${index}`),
          kind,
          raw: item,
          studentId,
          studentName: getStudentName(item, student, studentId),
          groupName: item?.class_name || cls?.class_name || '-',
          originalAmount,
          finalAmount,
          discountAmount,
          valueLabel: getValueLabel(item),
          reason: String(item?.reason || item?.notes || '-'),
          status: item?.active === false ? 'Inactive' : 'Active',
        };
      })
      .filter((record): record is DiscountRecord => Boolean(record));

    const serial = records.filter((record) => record.kind === 'serial_discount');
    const monthly = records.filter((record) => record.kind === 'monthly_discount');
    const totalDiscount = records.reduce((sum, record) => sum + record.discountAmount, 0);
    const serialTotal = serial.reduce((sum, record) => sum + record.discountAmount, 0);
    const monthlyTotal = monthly.reduce((sum, record) => sum + record.discountAmount, 0);
    const originalTotal = records.reduce((sum, record) => sum + record.originalAmount, 0);
    const finalTotal = records.reduce((sum, record) => sum + record.finalAmount, 0);

    return {
      records,
      serial,
      monthly,
      totalDiscount,
      serialTotal,
      monthlyTotal,
      originalTotal,
      finalTotal,
    };
  }, [collections.classes, collections.discounts, collections.payments, collections.students]);

  const pieRows = [
    { kind: 'serial_discount' as const, label: 'Serial discount', value: stats.serial.length, amount: stats.serialTotal, color: colors.serial },
    { kind: 'monthly_discount' as const, label: 'One-month discount', value: stats.monthly.length, amount: stats.monthlyTotal, color: colors.monthly },
  ].filter((row) => row.value > 0);

  const selectedRows = selectedKind === 'serial_discount' ? stats.serial : selectedKind === 'monthly_discount' ? stats.monthly : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<BadgePercent className="h-5 w-5" />} label="Discount records" value={stats.records.length.toLocaleString()} tone="from-blue-600 to-cyan-600" />
        <MetricCard icon={<WalletCards className="h-5 w-5" />} label="Serial total" value={formatMoney(stats.serialTotal)} tone="from-indigo-600 to-blue-700" />
        <MetricCard icon={<Layers3 className="h-5 w-5" />} label="One-month total" value={formatMoney(stats.monthlyTotal)} tone="from-emerald-600 to-teal-600" />
        <MetricCard icon={<CalendarDays className="h-5 w-5" />} label="Final payable" value={formatMoney(stats.finalTotal)} tone="from-amber-500 to-orange-600" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Discount statistics</h3>
            <p className="text-xs font-semibold text-slate-500">Click a discount type to view the students behind it.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-right text-xs font-black">
            <span className="rounded-md bg-blue-50 px-3 py-2 text-blue-700">Serial: {formatMoney(stats.serialTotal)}</span>
            <span className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">One-month: {formatMoney(stats.monthlyTotal)}</span>
          </div>
        </div>

        {pieRows.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm font-semibold text-slate-500">
            No discount data yet.
          </div>
        ) : (
          <div className="animate-chart-open grid gap-5 lg:grid-cols-[320px_1fr]">
            <button
              type="button"
              onClick={() => setSelectedKind(pieRows[0]?.kind || null)}
              className="relative flex items-center justify-center rounded-lg bg-slate-50 p-4 transition hover:bg-blue-50 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
            >
              <PieChart
                size={280}
                strokeWidth={42}
                data={pieRows.map((row) => ({ label: row.label, value: row.value, color: row.color }))}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black uppercase text-slate-400">Total</span>
                <span className="text-3xl font-black text-slate-950 dark:text-white">{stats.records.length.toLocaleString()}</span>
                <span className="text-[11px] font-bold text-slate-500">{formatMoney(stats.totalDiscount)}</span>
              </div>
            </button>

            <div className="grid content-center gap-3">
              {pieRows.map((row) => (
                <button
                  key={row.kind}
                  type="button"
                  onClick={() => setSelectedKind(row.kind)}
                  className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                      {row.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-black text-blue-700">
                      <List className="h-3.5 w-3.5" />
                      View students
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="rounded-md bg-white px-3 py-2 font-black text-slate-700 dark:bg-slate-950 dark:text-white">{row.value.toLocaleString()} records</span>
                    <span className="rounded-md bg-white px-3 py-2 font-black text-slate-700 dark:bg-slate-950 dark:text-white">{formatMoney(row.amount)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <DiscountStudentsDialog
        open={Boolean(selectedKind)}
        onOpenChange={(open) => !open && setSelectedKind(null)}
        title={selectedKind ? kindLabels[selectedKind] : 'Discount students'}
        rows={selectedRows}
        serialTotal={stats.serialTotal}
        monthlyTotal={stats.monthlyTotal}
      />
    </div>
  );
};

const MetricCard = ({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) => (
  <div className={`rounded-lg bg-gradient-to-br ${tone} p-4 text-white shadow-lg`}>
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-white/20">{icon}</div>
    <p className="text-[10px] font-black uppercase text-white/75">{label}</p>
    <p className="text-xl font-black leading-tight">{value}</p>
  </div>
);

const DiscountStudentsDialog = ({
  open,
  onOpenChange,
  title,
  rows,
  serialTotal,
  monthlyTotal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rows: DiscountRecord[];
  serialTotal: number;
  monthlyTotal: number;
}) => {
  const selectedTotal = rows.reduce((sum, row) => sum + row.discountAmount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-border bg-background text-foreground sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-3">
          <ModalStat label="Selected records" value={rows.length.toLocaleString()} />
          <ModalStat label="Selected total" value={formatMoney(selectedTotal)} />
          <ModalStat label="Serial / One-month" value={`${formatMoney(serialTotal)} / ${formatMoney(monthlyTotal)}`} />
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Original</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Final</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm font-semibold text-muted-foreground">
                    No students found for this discount type.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-black">{row.studentName}</TableCell>
                    <TableCell>{row.groupName}</TableCell>
                    <TableCell>{row.valueLabel}</TableCell>
                    <TableCell>{formatMoney(row.originalAmount)}</TableCell>
                    <TableCell className="font-black text-amber-700">-{formatMoney(row.discountAmount)}</TableCell>
                    <TableCell>{formatMoney(row.finalAmount)}</TableCell>
                    <TableCell>
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${row.status === 'Inactive' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                        {row.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ModalStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
    <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
    <p className="text-sm font-black text-slate-950 dark:text-white">{value}</p>
  </div>
);
