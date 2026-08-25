import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionPanel } from '@/components/common/SectionPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSalaryTeacherDetail } from './hooks/useSalaryTeacherDetail';
import { MarkSalaryPaidDialog } from './components/MarkSalaryPaidDialog';
import { formatSalaryPeriod, formatStudentPaidShare, resolvePreviousMonth, teacherFullName } from './model/salaryModel';
import { formatMoney } from '@/utils/helpers';
import type { SalaryHistoryEntry, SalaryStudentStats } from './types';

const EMPTY_STATS: SalaryStudentStats = {
  total_students: 0,
  paid_students: 0,
  unpaid_students: 0,
  paid_percent: 0,
  unpaid_percent: 0,
  collected_amount: 0,
};

const SalaryTeacherDetailPage = () => {
  const navigate = useNavigate();
  const { teacherId: teacherIdParam } = useParams<{ teacherId: string }>();
  const teacherId = Number(teacherIdParam);
  const { detail, loading } = useSalaryTeacherDetail(teacherId);

  const [dialogPeriod, setDialogPeriod] = useState<{
    year: number;
    month: number;
    amount?: number | string | null;
    paymentMethod?: string | null;
    notes?: string | null;
    studentStats: SalaryStudentStats;
  } | null>(null);

  const currentPeriod = useMemo(() => resolvePreviousMonth(), []);
  const teacherName = detail ? teacherFullName(detail.teacher) : '';

  const openMarkPaidFor = (entry: SalaryHistoryEntry) => {
    setDialogPeriod({
      year: entry.salary_year,
      month: entry.salary_month,
      amount: entry.salary?.amount,
      paymentMethod: entry.salary?.payment_method,
      notes: entry.salary?.notes,
      studentStats: entry.student_stats,
    });
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/salary')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Salaries
      </Button>

      <PageHeader
        title={teacherName || 'Teacher Salary'}
        description="Monthly salary history and student payment coverage for this teacher."
        icon={Wallet}
        primaryAction={
          <Button
            className="gap-2"
            onClick={() => {
              const currentEntry = detail?.history.find(
                (entry) => entry.salary_year === currentPeriod.year && entry.salary_month === currentPeriod.month
              );
              openMarkPaidFor(
                currentEntry || {
                  salary_year: currentPeriod.year,
                  salary_month: currentPeriod.month,
                  salary: null,
                  student_stats: EMPTY_STATS,
                }
              );
            }}
          >
            Mark {formatSalaryPeriod(currentPeriod.year, currentPeriod.month)} as Paid
          </Button>
        }
      />

      <SectionPanel contentClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !detail || detail.history.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No salary history yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid?</TableHead>
                  <TableHead>Marked By</TableHead>
                  <TableHead>Students Paid</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        <Badge variant="warning">Unpaid</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.salary?.marked_by_name
                        ? `${entry.salary.marked_by_name} (${entry.salary.marked_by_role || 'admin'})`
                        : '—'}
                    </TableCell>
                    <TableCell>{formatStudentPaidShare(entry.student_stats)}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {entry.salary?.notes || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openMarkPaidFor(entry)}>
                        {entry.salary?.is_paid ? 'Edit' : 'Mark Paid'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionPanel>

      {dialogPeriod && (
        <MarkSalaryPaidDialog
          open={!!dialogPeriod}
          onOpenChange={(open) => { if (!open) setDialogPeriod(null); }}
          teacherId={teacherId}
          teacherName={teacherName || `Teacher #${teacherId}`}
          salaryYear={dialogPeriod.year}
          salaryMonth={dialogPeriod.month}
          studentStats={dialogPeriod.studentStats}
          existingAmount={dialogPeriod.amount}
          existingPaymentMethod={dialogPeriod.paymentMethod}
          existingNotes={dialogPeriod.notes}
        />
      )}
    </div>
  );
};

export default SalaryTeacherDetailPage;
