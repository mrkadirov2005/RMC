import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { classAPI, paymentAPI, studentAPI, teacherAPI } from '../api';
import type { Class, Payment, Student, Teacher } from '../types';

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
const formatMonthLabel = (monthKey: string) => {
  const date = new Date(`${monthKey}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? monthKey
    : date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const getPaymentMonthKey = (payment: Payment) => {
  if (!payment.payment_date) return '';
  const date = new Date(payment.payment_date);
  return Number.isNaN(date.getTime()) ? '' : getMonthKey(date);
};

const isPaidPayment = (payment: Payment) => {
  const status = String(payment.status || payment.payment_status || '').trim().toLowerCase();
  return status === 'completed' || status === 'paid';
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
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [paymentsByStudent, setPaymentsByStudent] = useState<Record<number, Payment[]>>({});
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()));
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => getClassId(group) === Number(selectedGroupId)) || null,
    [groups, selectedGroupId]
  );
  const expectedAmount = Number(selectedGroup?.payment_amount || 0);
  const teacherById = useMemo(() => {
    return teachers.reduce<Record<number, Teacher>>((acc, teacher) => {
      const teacherId = Number(teacher.teacher_id || teacher.id || 0);
      if (teacherId) acc[teacherId] = teacher;
      return acc;
    }, {});
  }, [teachers]);

  const getTeacherName = (teacherId?: number | null) => {
    const teacher = teacherById[Number(teacherId || 0)];
    return [teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ') || 'No teacher';
  };

  const filteredGroups = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return groups.filter((group) => {
      const matchesTeacher =
        selectedTeacherId === 'all' || Number(group.teacher_id || 0) === Number(selectedTeacherId);
      const matchesSearch =
        !search ||
        [group.class_name, getTeacherName(group.teacher_id)]
          .filter((value) => value != null)
          .some((value) => String(value).toLowerCase().includes(search));
      return matchesTeacher && matchesSearch;
    });
  }, [groups, searchTerm, selectedTeacherId, teacherById]);

  const rowStates = useMemo(() => {
    return students.map((student) => {
      const studentId = getStudentId(student);
      const payments = paymentsByStudent[studentId] || [];
      return { student, studentId, state: getMonthState(payments, selectedMonth, expectedAmount) };
    });
  }, [expectedAmount, paymentsByStudent, selectedMonth, students]);

  const paidPercentage = rowStates.length
    ? Math.round((rowStates.filter((row) => row.state === 'full').length / rowStates.length) * 100)
    : 0;
  const selectedMonthLabel = formatMonthLabel(selectedMonth);

  const loadGroups = async () => {
    setGroupsLoading(true);
    setError(null);
    try {
      const fresh = Date.now();
      const [groupsResponse, teachersResponse] = await Promise.all([
        classAPI.getAll({ page: 1, limit: 500, _fresh: fresh }),
        teacherAPI.getAll({ page: 1, limit: 500, _fresh: fresh }),
      ]);
      const rows = getRows<Class>(groupsResponse).filter((group) => getClassId(group) > 0);
      setTeachers(getRows<Teacher>(teachersResponse));
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
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-md border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-foreground">Groups</h2>
              <p className="text-xs text-muted-foreground">{filteredGroups.length} of {groups.length} groups</p>
            </div>
            <div className="flex min-w-[280px] flex-1 items-center justify-end gap-2">
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filter teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teachers</SelectItem>
                  {teachers.map((teacher) => {
                    const teacherId = Number(teacher.teacher_id || teacher.id || 0);
                    if (!teacherId) return null;
                    return (
                      <SelectItem key={teacherId} value={String(teacherId)}>
                        {[teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || `Teacher ${teacherId}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="relative w-full max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search group or teacher..."
                  className="pl-9"
                />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={loadGroups} disabled={groupsLoading}>
                {groupsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200/80 bg-slate-50/60 p-2 dark:border-border dark:bg-muted/20">
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
              <div className="flex min-w-max flex-nowrap gap-2">
                {filteredGroups.map((group) => {
                  const groupId = getClassId(group);
                  const active = groupId === Number(selectedGroupId);
                  return (
                    <button
                      key={groupId}
                      type="button"
                      onClick={() => setSelectedGroupId(groupId)}
                      className={cn(
                        'flex w-[250px] shrink-0 items-center gap-2 rounded-md border bg-white px-2.5 py-2 text-left text-xs transition-colors dark:bg-card',
                        active
                          ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-sm dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-100'
                          : 'border-slate-200 hover:bg-white dark:border-border dark:hover:bg-muted/40'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white',
                          active ? 'bg-blue-600' : 'bg-slate-700'
                        )}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold leading-tight">{group.class_name}</span>
                        <span className="block truncate text-[11px] font-semibold leading-tight text-muted-foreground">
                          {getTeacherName(group.teacher_id)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-md border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-foreground">
                {selectedGroup?.class_name || 'Choose a group'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedGroup ? `${students.length} students / expected ${expectedAmount || 0} UZS` : 'Select a group to see monthly payment status'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <label htmlFor="payment-month" className="block text-[11px] font-bold text-muted-foreground">Payment month</label>
                <Input
                  id="payment-month"
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value || getMonthKey(new Date()))}
                  className="w-[190px] bg-white font-semibold dark:bg-card"
                />
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-center dark:border-blue-900 dark:bg-blue-950/30">
                <p className="text-[10px] font-bold uppercase text-blue-600">Fully paid</p>
                <p className="text-xl font-black text-blue-800 dark:text-blue-200">{paidPercentage}%</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 dark:bg-muted/30">
            <p className="text-base font-black text-slate-900 dark:text-foreground">{selectedMonthLabel}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Fully done</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-400" /> Partly done</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> None</span>
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
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="h-14 bg-slate-50 dark:bg-muted/40">
                    <TableHead className="w-[280px] text-sm">Student</TableHead>
                    <TableHead className="w-32 text-sm">Status</TableHead>
                    <TableHead className="min-w-[240px] text-center">
                      <div className="text-base font-black text-slate-700 dark:text-foreground">{paidPercentage}%</div>
                      <div className="mt-0.5 text-sm font-semibold text-muted-foreground">{selectedMonthLabel}</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowStates.map(({ student, studentId, state }) => {
                    const status = String((student as any).status || (student as any).student_status || 'Active');
                    const active = status.toLowerCase() === 'active' || status.toLowerCase() === 'aktiv';
                    return (
                      <TableRow key={studentId} className="h-16">
                        <TableCell className="py-3 text-sm font-bold">
                          {getStudentName(student)}
                        </TableCell>
                        <TableCell className="py-3">
                          <span
                            className={cn(
                              'inline-flex min-w-16 justify-center rounded-full px-2 py-0.5 text-[11px] font-black text-white shadow-sm',
                              active ? 'bg-emerald-500 shadow-emerald-200' : 'bg-orange-400 shadow-orange-200'
                            )}
                          >
                            {active ? 'Aktiv' : 'Passive'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <span className={cn(
                            'inline-flex min-w-40 items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-black text-white shadow-sm',
                            getDotClass(state)
                          )}>
                            <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
                            {getStateTitle(state)}
                          </span>
                        </TableCell>
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
