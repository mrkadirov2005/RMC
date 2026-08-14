// Daily income breakdown for the selected month.

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/utils/helpers';

export interface DailyIncomeRow {
  dateKey: string;
  dateLabel: string;
  paymentCount: number;
  studentCount: number;
  total: number;
}

interface Props {
  selectedMonth: string;
  rows: DailyIncomeRow[];
  monthTotal: number;
  totalPaymentCount: number;
  daysWithIncome: number;
}

export const FinanceDailyView = ({ selectedMonth, rows, monthTotal, totalPaymentCount, daysWithIncome }: Props) => (
  <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
    <div className="mb-3">
      <p className="text-base font-black text-slate-950 dark:text-white">Kunlik tushum</p>
      <p className="text-xs font-semibold text-slate-500">
        {new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
      </p>
    </div>

    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
      <span>{daysWithIncome} kun tushum bilan</span>
      <span>{totalPaymentCount} ta to'lov</span>
      <span>{formatMoney(monthTotal)}</span>
    </div>

    {rows.length === 0 ? (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Bu oyda tolov topilmadi.
      </div>
    ) : (
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sana</TableHead>
              <TableHead className="text-right">To'lovlar</TableHead>
              <TableHead className="text-right">O'quvchilar</TableHead>
              <TableHead className="text-right">Tushum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.dateKey}>
                <TableCell className="font-medium">{row.dateLabel}</TableCell>
                <TableCell className="text-right">{row.paymentCount}</TableCell>
                <TableCell className="text-right">{row.studentCount}</TableCell>
                <TableCell className="text-right font-semibold text-emerald-700">{formatMoney(row.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )}
  </div>
);
