import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { salaryAPI } from '@/shared/api/api';
import { GroupPaidBadge, PaymentStateBadge } from '@/features/teacher/payments/PaymentStateBadge';
import type { TeacherGroupPayments } from '@/features/teacher/payments/types';
import { formatSalaryPeriod, monthInputValue } from '../model/salaryModel';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';

interface TeacherStudentsPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: number;
  teacherName: string;
  salaryYear: number;
  salaryMonth: number;
}

/** Which of a teacher's students paid for one month, group by group. */
export const TeacherStudentsPaidDialog = ({ open, onOpenChange, teacherId, teacherName, salaryYear, salaryMonth }: TeacherStudentsPaidDialogProps) => {
  const { t } = useLanguage();
  const [data, setData] = useState<TeacherGroupPayments | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setData(null);
    salaryAPI
      .getTeacherPayments(teacherId, { month: monthInputValue(salaryYear, salaryMonth) })
      .then((response) => {
        if (!cancelled) setData(response?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, teacherId, salaryYear, salaryMonth]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('Students who paid')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {teacherName} — {formatSalaryPeriod(salaryYear, salaryMonth)}
        </p>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : failed || !data ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{t('Could not load the payments.')}</div>
        ) : data.groups.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{t('This teacher has no groups.')}</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5 rounded-md border bg-muted/30 p-2.5 text-xs sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">{t('Students Paid')}</p>
                <p className="font-bold text-emerald-600">{data.totals.paid_students}/{data.totals.total_students}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('Collected')}</p>
                <p className="font-bold">{formatMoney(data.totals.collected)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('Still owed')}</p>
                <p className="font-bold text-rose-600">{formatMoney(data.totals.remaining)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('Teacher share')}</p>
                <p className="font-bold">{formatMoney(data.totals.current_salary)}</p>
              </div>
            </div>

            {data.groups.map((group) => (
              <div key={group.class_id} className="rounded-md border">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                  <span className="text-sm font-semibold">{group.class_name}</span>
                  <GroupPaidBadge paid={group.paid_students} total={group.total_students} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Student')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead className="text-right">{t('Paid')}</TableHead>
                      <TableHead className="text-right">{t('Still owed')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.students.map((student) => (
                      <TableRow key={student.student_id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell><PaymentStateBadge state={student.state} /></TableCell>
                        <TableCell className="text-right">{formatMoney(student.paid)}</TableCell>
                        <TableCell className="text-right">{student.remaining > 0 ? formatMoney(student.remaining) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
