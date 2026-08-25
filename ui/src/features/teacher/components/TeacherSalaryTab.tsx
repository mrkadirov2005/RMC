// Read-only monthly salary history for the logged-in teacher.

import { useEffect, useMemo } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppDispatch, useAppSelector } from '../../crm/hooks';
import { fetchMySalaryDetail, selectMySalaryDetail, selectMySalaryDetailLoading } from '@/slices/salariesSlice';
import { formatSalaryPeriod } from '../../crm/salary/model/salaryModel';
import { formatMoney } from '@/utils/helpers';

interface TeacherSalaryTabProps {
  teacherId?: number | string;
}

const TeacherSalaryTab = ({ teacherId }: TeacherSalaryTabProps) => {
  const dispatch = useAppDispatch();
  const detail = useAppSelector(selectMySalaryDetail);
  const loading = useAppSelector(selectMySalaryDetailLoading);

  useEffect(() => {
    if (!teacherId) return;
    dispatch(fetchMySalaryDetail({ months: 12 }));
  }, [dispatch, teacherId]);

  const summary = useMemo(() => {
    const history = detail?.history || [];
    const paidEntries = history.filter((entry) => entry.salary?.is_paid);
    const totalReceived = paidEntries.reduce((sum, entry) => sum + (Number(entry.salary?.amount) || 0), 0);
    return {
      monthsPaid: paidEntries.length,
      monthsTracked: history.length,
      totalReceived,
    };
  }, [detail]);

  if (loading && !detail) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!detail || detail.history.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No salary records yet. Once your center marks a monthly salary as paid, it will show up here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">Months Paid</p>
          <p className="text-base font-black text-emerald-600">{summary.monthsPaid}/{summary.monthsTracked}</p>
        </div>
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">Total Received</p>
          <p className="text-base font-black text-primary">{formatMoney(summary.totalReceived)}</p>
        </div>
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Tracked
          </p>
          <p className="text-base font-black">{summary.monthsTracked} mo</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.history.map((entry) => (
              <TableRow key={`${entry.salary_year}-${entry.salary_month}`}>
                <TableCell className="font-medium">{formatSalaryPeriod(entry.salary_year, entry.salary_month)}</TableCell>
                <TableCell>{entry.salary ? formatMoney(entry.salary.amount) : '—'}</TableCell>
                <TableCell>
                  {entry.salary?.is_paid ? (
                    <Badge variant="success">Paid</Badge>
                  ) : (
                    <Badge variant="warning">Not yet paid</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                  {entry.salary?.notes || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TeacherSalaryTab;
