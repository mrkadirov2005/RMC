import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { classAPI, paymentAPI, studentAPI } from '@/shared/api/api';
import type { Class, Payment, Student } from '../types';

type MonthCellState = 'full' | 'partial' | 'none';

const getRows = <T,>(response: any): T[] => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  if (Array.isArray(payload?.data?.items)) return payload.data.items as T[];
  if (Array.isArray(payload?.data?.data)) return payload.data.data as T[];
  if (Array.isArray(payload?.students)) return payload.students as T[];
  return [];
};

const getClassId = (cls: Class) => Number(cls.class_id || cls.id || 0);
const getStudentId = (student: Student) => Number(student.student_id || student.id || 0);

const getStudentName = (student: Student) =>
  `${student.first_name || ''} ${student.last_name || ''}`.trim() || `Student ${getStudentId(student)}`;

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getPaymentMonthKey = (payment: Payment) => {
  if (!payment.payment_date) return '';
  const date = new Date(payment.payment_date);
  return Number.isNaN(date.getTime()) ? '' : getMonthKey(date);
};

const isPaidPayment = (payment: Payment) => {
  const status = String(payment.status || payment.payment_status || '').trim().toLowerCase();
  return status === 'completed' || status === 'paid';
};

const getLastMonths = (count: number) => {
  const current = new Date();
  current.setDate(1);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(current);
    date.setMonth(current.getMonth() - (count - 1 - index));
    return {
      key: getMonthKey(date),
      label: date.toLocaleDateString(undefined, { month: 'short' }),
      year: date.getFullYear(),
    };
  });
};

const getMonthState = (payments: Payment[], monthKey: string, expectedAmount: number): MonthCellState => {
  const paidAmount = payments
    .filter((payment) => isPaidPayment(payment) && getPaymentMonthKey(payment) === monthKey)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  if (paidAmount <= 0) return 'none';
  if (expectedAmount > 0 && paidAmount < expectedAmount) return 'partial';
  return 'full';
};

const getDotClass = (state: MonthCellState) => {
  if (state === 'full') return 'border-emerald-500 bg-emerald-500';
  if (state === 'partial') return 'border-orange-400 bg-orange-400';
  return 'border-rose-500 bg-rose-500';
};

const getStateTitle = (state: MonthCellState) => {
  if (state === 'full') return 'Fully done';
  if (state === 'partial') return 'Partly done';
  return 'None';
};

export const PaymentGroupsMatrixTab = () => {
  const [groups, setGroups] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [paymentsByStudent, setPaymentsByStudent] = useState<Record<number, Payment[]>>({});
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(() => getLastMonths(12), []);
  const selectedGroup = useMemo(
    () => groups.find((group) => getClassId(group) === Number(selectedGroupId)) || null,
    [groups, selectedGroupId]
  );
  const expectedAmount = Number(selectedGroup?.payment_amount || 0);

  const filteredGroups = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return groups;
    return groups.filter((group) =>
      [group.class_name, group.class_code, group.level, group.class_id, group.id]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [groups, searchTerm]);

  const rowStates = useMemo(() => {
    return students.map((student) => {
      const studentId = getStudentId(student);
      const payments = paymentsByStudent[studentId] || [];
      const states = months.reduce<Record<string, MonthCellState>>((acc, month) => {
        acc[month.key] = getMonthState(payments, month.key, expectedAmount);
        return acc;
      }, {});
      return { student, studentId, states };
    });
  }, [expectedAmount, months, paymentsByStudent, students]);

  const monthPercentages = useMemo(() => {
    if (rowStates.length === 0) {
      return months.reduce<Record<string, number>>((acc, month) => {
        acc[month.key] = 0;
        return acc;
      }, {});
    }

    return months.reduce<Record<string, number>>((acc, month) => {
      const fullCount = rowStates.filter((row) => row.states[month.key] === 'full').length;
      acc[month.key] = Math.round((fullCount / rowStates.length) * 100);
      return acc;
    }, {});
  }, [months, rowStates]);

  const loadGroups = async () => {
    setGroupsLoading(true);
    setError(null);
    try {
      const response = await classAPI.getAll({ page: 1, limit: 500, _fresh: Date.now() });
      const rows = getRows<Class>(response).filter((group) => getClassId(group) > 0);
      setGroups(rows);
      setSelectedGroupId((current) => current ?? (rows[0] ? getClassId(rows[0]) : null));
    } catch (err) {
      setError('Could not load groups.');
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadGroupStudents = async (groupId: number) => {
    setStudentsLoading(true);
    setError(null);
    setStudents([]);
    setPaymentsByStudent({});
    try {
      let studentRows: Student[] = [];
      try {
        const response = await studentAPI.getByClassWithTransfers(groupId, { _fresh: Date.now() });
        studentRows = getRows<Student>(response);
      } catch {
        const response = await studentAPI.getAll({ class_id: groupId, page: 1, limit: 500, _fresh: Date.now() });
        studentRows = getRows<Student>(response);
      }

      const cleanStudents = studentRows.filter((student) => getStudentId(student) > 0);
      setStudents(cleanStudents);

      const paymentPairs = await Promise.all(
        cleanStudents.map(async (student) => {
          const studentId = getStudentId(student);
          const response = await paymentAPI.getByStudent(studentId, { _fresh: Date.now() });
          return [studentId, getRows<Payment>(response)] as const;
        })
      );

      setPaymentsByStudent(Object.fromEntries(paymentPairs));
    } catch (err) {
      setError('Could not load students and payments for this group.');
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupStudents(selectedGroupId);
    }
  }, [selectedGroupId]);

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="overflow-hidden rounded-md border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-foreground">Groups</h2>
              <p className="text-xs text-muted-foreground">{groups.length} groups</p>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={loadGroups} disabled={groupsLoading}>
              {groupsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search group..."
              className="pl-9"
            />
          </div>

          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {groupsLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-md border border-dashed py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading groups...
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                No groups found
              </div>
            ) : (
              filteredGroups.map((group) => {
                const groupId = getClassId(group);
                const active = groupId === Number(selectedGroupId);
                return (
                  <button
                    key={groupId}
                    type="button"
                    onClick={() => setSelectedGroupId(groupId)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-950 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-100'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted/40'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white',
                        active ? 'bg-blue-600' : 'bg-slate-700'
                      )}
                    >
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{group.class_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{group.class_code || 'No code'}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-md border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-foreground">
                {selectedGroup?.class_name || 'Choose a group'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedGroup ? `${students.length} students / expected ${expectedAmount || 0} UZS` : 'Select a group to see monthly payment status'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Fully done</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-orange-400" /> Partly done</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-rose-500" /> None</span>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {studentsLoading ? (
            <div className="flex min-h-[360px] items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading students and payments...
            </div>
          ) : !selectedGroup ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              Choose a group from the list.
            </div>
          ) : students.length === 0 ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No students found for this group.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200/80 dark:border-border">
              <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-muted/40">
                    <TableHead className="sticky left-0 z-20 w-56 bg-slate-50 dark:bg-muted/40">Student</TableHead>
                    <TableHead className="sticky left-56 z-20 w-28 bg-slate-50 dark:bg-muted/40">Status</TableHead>
                    {months.map((month) => (
                      <TableHead key={month.key} className="w-20 text-center">
                        <div className="text-xs font-black text-slate-600 dark:text-muted-foreground">
                          {monthPercentages[month.key]}%
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
                          {month.label}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowStates.map(({ student, studentId, states }) => {
                    const status = String((student as any).status || (student as any).student_status || 'Active');
                    const active = status.toLowerCase() === 'active' || status.toLowerCase() === 'aktiv';
                    return (
                      <TableRow key={studentId} className="h-16">
                        <TableCell className="sticky left-0 z-10 bg-white font-bold dark:bg-card">
                          {getStudentName(student)}
                        </TableCell>
                        <TableCell className="sticky left-56 z-10 bg-white dark:bg-card">
                          <span
                            className={cn(
                              'inline-flex min-w-20 justify-center rounded-full px-3 py-1 text-xs font-black text-white shadow-sm',
                              active ? 'bg-emerald-500 shadow-emerald-200' : 'bg-orange-400 shadow-orange-200'
                            )}
                          >
                            {active ? 'Aktiv' : 'Passive'}
                          </span>
                        </TableCell>
                        {months.map((month) => {
                          const state = states[month.key];
                          return (
                            <TableCell key={month.key} className="text-center">
                              <span
                                title={`${month.label} ${month.year}: ${getStateTitle(state)}`}
                                className={cn('mx-auto block h-8 w-8 rounded-full border', getDotClass(state))}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
