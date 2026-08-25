// Read-only monthly salary history table (the "Details" view) for the logged-in teacher.

import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatSalaryPeriod } from '../../crm/salary/model/salaryModel';
import { formatMoney } from '@/utils/helpers';
import type { SalaryTeacherDetail } from '../../crm/salary/types';

interface TeacherSalaryTabProps {
  detail: SalaryTeacherDetail | null;
  loading: boolean;
}

const TeacherSalaryTab = ({ detail, loading }: TeacherSalaryTabProps) => {
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
  );
};

export default TeacherSalaryTab;
