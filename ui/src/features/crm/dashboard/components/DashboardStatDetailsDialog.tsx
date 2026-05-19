// Source file for the dashboard area in the crm feature.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, GraduationCap, School, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DashboardCollections, DashboardRecord, DashboardStatCard } from '../types';

interface DashboardStatDetailsDialogProps {
  card: DashboardStatCard | null;
  collections: DashboardCollections;
  selectedMonth: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getValue = (item: DashboardRecord, key: string) => item[key];

const getString = (item: DashboardRecord, key: string) => {
  const value = getValue(item, key);
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
};

const getNumber = (item: DashboardRecord, key: string) => {
  const value = getValue(item, key);
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const getStudentId = (student: DashboardRecord) => getNumber(student, 'student_id') || getNumber(student, 'id');

const getTeacherId = (teacher: DashboardRecord) => getNumber(teacher, 'teacher_id') || getNumber(teacher, 'id');

const formatMoney = (value: number) => `$${value.toLocaleString()}`;

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const getFullName = (item: DashboardRecord, fallback: string) => {
  const name = [getString(item, 'first_name'), getString(item, 'last_name')]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
  return name || getString(item, 'name') || fallback;
};

const getSchoolName = (student: DashboardRecord) => getString(student, 'school_name').trim() || 'Unknown school';

const isSameMonth = (value: string, month: Date) => {
  if (!value) return false;
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getMonth() === month.getMonth() &&
    date.getFullYear() === month.getFullYear()
  );
};

const getClassName = (classMap: Map<number, DashboardRecord>, classId?: number) => {
  if (!classId) return 'Unassigned';
  const cls = classMap.get(classId);
  return cls ? getString(cls, 'class_name') || getString(cls, 'name') || `Class ${classId}` : `Class ${classId}`;
};

const getPaymentStatus = (payment: DashboardRecord) =>
  (getString(payment, 'status') || getString(payment, 'payment_status')).toLowerCase();

const isCompletedPayment = (payment: DashboardRecord) => {
  const status = getPaymentStatus(payment);
  return status === 'completed' || status === 'paid';
};

const isFinanceDetails = (detailsType?: DashboardStatCard['detailsType']) =>
  detailsType === 'expectedPayments' ||
  detailsType === 'collectedPayments' ||
  detailsType === 'remainingPayments' ||
  detailsType === 'outstandingDebts';

// Renders the dashboard stat details dialog module.
export const DashboardStatDetailsDialog = ({
  card,
  collections,
  selectedMonth,
  open,
  onOpenChange,
}: DashboardStatDetailsDialogProps) => {
  const navigate = useNavigate();
  const studentMap = useMemo(() => {
    const map = new Map<number, DashboardRecord>();
    collections.students.forEach((student) => {
      const id = getStudentId(student);
      if (id) map.set(id, student);
    });
    return map;
  }, [collections.students]);

  const classMap = useMemo(() => {
    const map = new Map<number, DashboardRecord>();
    collections.classes.forEach((cls) => {
      const id = getNumber(cls, 'class_id') || getNumber(cls, 'id');
      if (id) map.set(id, cls);
    });
    return map;
  }, [collections.classes]);

  const rows = useMemo(() => {
    if (card?.detailsType === 'expectedPayments' || card?.detailsType === 'remainingPayments') {
      const paymentsThisMonth = collections.payments.filter((payment) =>
        isSameMonth(getString(payment, 'payment_date'), selectedMonth) && isCompletedPayment(payment)
      );
      const paidByStudent = new Map<number, number>();
      paymentsThisMonth.forEach((payment) => {
        const studentId = getNumber(payment, 'student_id');
        if (!studentId) return;
        paidByStudent.set(studentId, (paidByStudent.get(studentId) || 0) + (getNumber(payment, 'amount') || 0));
      });

      const expectedRows = collections.students
        .map((student) => {
          const studentId = getStudentId(student);
          const classId = getNumber(student, 'class_id');
          const cls = classId ? classMap.get(classId) : undefined;
          const expected = cls ? getNumber(cls, 'payment_amount') || 0 : 0;
          const paid = studentId ? paidByStudent.get(studentId) || 0 : 0;
          return {
            student,
            studentId,
            classId,
            expected,
            paid,
            remaining: Math.max(expected - paid, 0),
          };
        })
        .filter((row) => row.expected > 0);

      if (card.detailsType === 'remainingPayments') {
        return expectedRows.filter((row) => row.remaining > 0).sort((a, b) => b.remaining - a.remaining);
      }
      return expectedRows.sort((a, b) => b.expected - a.expected);
    }

    if (card?.detailsType === 'collectedPayments') {
      return collections.payments
        .filter((payment) => isSameMonth(getString(payment, 'payment_date'), selectedMonth) && isCompletedPayment(payment))
        .sort((a, b) => {
          const aTime = new Date(getString(a, 'payment_date')).getTime() || 0;
          const bTime = new Date(getString(b, 'payment_date')).getTime() || 0;
          return bTime - aTime;
        });
    }

    if (card?.detailsType === 'outstandingDebts') {
      return collections.debts
        .map((debt) => {
          const debtAmount = getNumber(debt, 'debt_amount') || 0;
          const amountPaid = getNumber(debt, 'amount_paid') || 0;
          const balance = getNumber(debt, 'balance') ?? Math.max(debtAmount - amountPaid, 0);
          return { debt, debtAmount, amountPaid, balance };
        })
        .filter((row) => row.balance > 0)
        .sort((a, b) => b.balance - a.balance);
    }

    if (card?.detailsType === 'newStudents') {
      return collections.students.filter((student) => isSameMonth(getString(student, 'created_at'), selectedMonth));
    }
    if (card?.detailsType === 'schools') {
      const counts = new Map<string, number>();
      collections.students.forEach((student) => {
        const school = getSchoolName(student);
        counts.set(school, (counts.get(school) || 0) + 1);
      });
      return Array.from(counts.entries())
        .map(([school, count]) => ({ school, count }))
        .sort((a, b) => b.count - a.count || a.school.localeCompare(b.school));
    }
    if (card?.detailsType === 'teachers') return collections.teachers;
    return collections.students;
  }, [card?.detailsType, classMap, collections.debts, collections.payments, collections.students, collections.teachers, selectedMonth]);

  const goToStudent = (student: DashboardRecord) => {
    const id = getStudentId(student);
    if (!id) return;
    onOpenChange(false);
    navigate(`/student/${id}`);
  };

  const goToTeacher = (teacher: DashboardRecord) => {
    const id = getTeacherId(teacher);
    if (!id) return;
    onOpenChange(false);
    navigate(`/teacher/${id}`);
  };

  const title = card?.label || 'Details';
  const description =
    card?.detailsType === 'schools'
      ? 'Schools represented by the students in the current dashboard scope.'
      : isFinanceDetails(card?.detailsType)
        ? 'Financial records included in the current dashboard scope and selected month.'
      : 'Records included in the current dashboard scope.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-4xl overflow-hidden border-sky-100 bg-white p-0 dark:border-border dark:bg-background">
        <DialogHeader className="relative border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-5 dark:border-border dark:bg-background dark:bg-none">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-emerald-100 text-sky-700 shadow-sm dark:bg-muted dark:bg-none dark:text-muted-foreground dark:shadow-none">
              {card?.detailsType === 'teachers' ? (
                <GraduationCap className="h-5 w-5" />
              ) : card?.detailsType === 'schools' ? (
                <School className="h-5 w-5" />
              ) : (
                <Users className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-auto px-6 py-4">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No records found for this card.
            </div>
          ) : card?.detailsType === 'schools' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as Array<{ school: string; count: number }>).map((row) => (
                  <TableRow key={row.school}>
                    <TableCell className="font-medium">{row.school}</TableCell>
                    <TableCell className="text-right font-semibold">{row.count.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : card?.detailsType === 'expectedPayments' || card?.detailsType === 'remainingPayments' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as Array<{
                  student: DashboardRecord;
                  studentId?: number;
                  classId?: number;
                  expected: number;
                  paid: number;
                  remaining: number;
                }>).map((row) => (
                  <TableRow key={row.studentId || getString(row.student, 'email')} className="cursor-pointer" onClick={() => goToStudent(row.student)}>
                    <TableCell className="font-medium">{getFullName(row.student, 'Unnamed student')}</TableCell>
                    <TableCell>{getClassName(classMap, row.classId)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(row.expected)}</TableCell>
                    <TableCell className="text-right text-emerald-700 dark:text-emerald-300">{formatMoney(row.paid)}</TableCell>
                    <TableCell className="text-right text-rose-700 dark:text-rose-300">{formatMoney(row.remaining)}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={(event) => { event.stopPropagation(); goToStudent(row.student); }}>
                        Open
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : card?.detailsType === 'collectedPayments' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as DashboardRecord[]).map((payment, index) => {
                  const studentId = getNumber(payment, 'student_id');
                  const student = studentId ? studentMap.get(studentId) : undefined;
                  return (
                    <TableRow
                      key={getNumber(payment, 'payment_id') || getNumber(payment, 'id') || index}
                      className={student ? 'cursor-pointer' : undefined}
                      onClick={() => student && goToStudent(student)}
                    >
                      <TableCell className="font-medium">{student ? getFullName(student, `Student ${studentId}`) : `Student ${studentId || '-'}`}</TableCell>
                      <TableCell>{formatDate(getString(payment, 'payment_date'))}</TableCell>
                      <TableCell>{getString(payment, 'payment_type') || '-'}</TableCell>
                      <TableCell>{getString(payment, 'payment_status') || getString(payment, 'status') || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700 dark:text-emerald-300">{formatMoney(getNumber(payment, 'amount') || 0)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : card?.detailsType === 'outstandingDebts' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Debt</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as Array<{ debt: DashboardRecord; debtAmount: number; amountPaid: number; balance: number }>).map((row, index) => {
                  const studentId = getNumber(row.debt, 'student_id');
                  const student = studentId ? studentMap.get(studentId) : undefined;
                  return (
                    <TableRow
                      key={getNumber(row.debt, 'debt_id') || getNumber(row.debt, 'id') || index}
                      className={student ? 'cursor-pointer' : undefined}
                      onClick={() => student && goToStudent(student)}
                    >
                      <TableCell className="font-medium">{student ? getFullName(student, `Student ${studentId}`) : `Student ${studentId || '-'}`}</TableCell>
                      <TableCell>{formatDate(getString(row.debt, 'due_date'))}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.debtAmount)}</TableCell>
                      <TableCell className="text-right text-emerald-700 dark:text-emerald-300">{formatMoney(row.amountPaid)}</TableCell>
                      <TableCell className="text-right font-semibold text-amber-700 dark:text-amber-300">{formatMoney(row.balance)}</TableCell>
                      <TableCell className="text-right">
                        {student && (
                          <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={(event) => { event.stopPropagation(); goToStudent(student); }}>
                            Open
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : card?.detailsType === 'teachers' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as DashboardRecord[]).map((teacher) => {
                  const id = getTeacherId(teacher);
                  return (
                    <TableRow key={id || getString(teacher, 'email')} className="cursor-pointer" onClick={() => goToTeacher(teacher)}>
                      <TableCell className="font-medium">{getFullName(teacher, 'Unnamed teacher')}</TableCell>
                      <TableCell className="text-muted-foreground">{getString(teacher, 'email') || getString(teacher, 'phone') || '-'}</TableCell>
                      <TableCell>{getString(teacher, 'status') || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={(event) => { event.stopPropagation(); goToTeacher(teacher); }}>
                          Open
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as DashboardRecord[]).map((student) => {
                  const id = getStudentId(student);
                  const classId = getNumber(student, 'class_id');
                  return (
                    <TableRow key={id || getString(student, 'email')} className="cursor-pointer" onClick={() => goToStudent(student)}>
                      <TableCell className="font-medium">{getFullName(student, 'Unnamed student')}</TableCell>
                      <TableCell>{getClassName(classMap, classId)}</TableCell>
                      <TableCell className="text-muted-foreground">{getSchoolName(student)}</TableCell>
                      <TableCell>{getString(student, 'status') || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={(event) => { event.stopPropagation(); goToStudent(student); }}>
                          Open
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
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
