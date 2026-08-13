// View component for the students screen in the crm feature.

import { useEffect, useState } from 'react';
import { ArrowRightLeft, BookOpen, Coins, CreditCard, GraduationCap, Info, KeyRound, MoreVertical, Pencil, Phone, School, Trash2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getPaginatedRowNumber } from '@/components/common/pagination';
import { useListSelection } from '@/components/common/useListSelection';
import { StudentCoinsDialog } from '@/shared/components/StudentCoinsDialog';
import type { ViewMode } from '@/components/common/ViewModeToggle';
import type { Class, Student } from '../types';
import { formatGroupLabel } from '@/shared/groupLabel';
import { getStatusVariant, isTransferredStudentStatus } from '../status';

type TeacherOption = {
  id?: string | number;
  value?: string | number;
  label: string;
};

interface Props {
  students: Student[];
  loading: boolean;
  hasActiveFilters: boolean;
  onView: (id: number) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  onTransfer?: (student: Student, targetClassId: number) => Promise<void> | void;
  onBulkDelete?: (ids: number[]) => Promise<void> | void;
  onPasswordUpdate?: (student: Student, password: string) => Promise<void> | void;
  onCoinsUpdated?: () => void;
  classOptions?: Class[];
  teacherOptions?: TeacherOption[];
  hideTeacherGroup?: boolean;
  showMonthlyPaymentStatus?: boolean;
  viewMode?: ViewMode;
  startIndex?: number;
}

const PasswordField = ({
  student,
  onPasswordUpdate,
}: {
  student: Student;
  onPasswordUpdate?: (student: Student, password: string) => Promise<void> | void;
}) => {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue('');
  }, [student.student_id, student.id]);

  const save = async () => {
    const next = value.trim();
    if (!onPasswordUpdate || !next || saving) return;

    setSaving(true);
    try {
      await onPasswordUpdate(student, next);
      setValue('');
    } catch {
      setValue('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[180px]">
      <div className="relative">
        <KeyRound className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
            if (event.key === 'Escape') {
              setValue('');
              event.currentTarget.blur();
            }
          }}
          disabled={saving}
          placeholder="New password"
          className="h-7 bg-white/80 pl-7 text-xs dark:bg-background"
        />
      </div>
      {saving && <p className="mt-1 text-xs text-muted-foreground">Saving...</p>}
    </div>
  );
};

// Renders the students table view view.
export const StudentsTableView = ({
  students,
  loading,
  hasActiveFilters,
  onView,
  onEdit,
  onDelete,
  onTransfer,
  onBulkDelete,
  onPasswordUpdate,
  onCoinsUpdated,
  classOptions = [],
  teacherOptions = [],
  hideTeacherGroup = false,
  showMonthlyPaymentStatus = false,
  viewMode = 'list',
  startIndex = 0,
}: Props) => {
  const [coinDialogOpen, setCoinDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [transferStudent, setTransferStudent] = useState<Student | null>(null);
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false);
  const [targetTeacherId, setTargetTeacherId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [transferring, setTransferring] = useState(false);

  const getStudentId = (student: Student) => Number(student.student_id || student.id || 0);
  const getClassTeacherId = (student: Student) => {
    const classId = Number(student.class_id || 0);
    if (!classId) return 0;
    const studentClass = classOptions.find((cls) => Number(cls.class_id || cls.id || 0) === classId);
    return Number(studentClass?.teacher_id || 0);
  };
  const {
    selectedIds,
    selectedVisibleCount,
    allVisibleSelected,
    toggle: toggleStudent,
    toggleAllVisible,
    clear: clearSelection,
  } = useListSelection(students, getStudentId);
  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !onBulkDelete) return;
    await onBulkDelete(ids);
    clearSelection();
  };

// Opens coins.
  const openCoins = (student: Student) => {
    setSelectedStudent(student);
    setCoinDialogOpen(true);
  };

  const openTransfer = (student: Student) => {
    setTransferStudent(student);
    setTargetTeacherId('');
    setTargetClassId('');
  };

  const openBulkTransfer = () => {
    if (selectedIds.size === 0) return;
    setTransferStudent(null);
    setBulkTransferOpen(true);
    setTargetTeacherId('');
    setTargetClassId('');
  };

  const closeTransfer = () => {
    if (transferring) return;
    setTransferStudent(null);
    setBulkTransferOpen(false);
    setTargetTeacherId('');
    setTargetClassId('');
  };

  const submitTransfer = async () => {
    const nextClassId = Number(targetClassId);
    if ((!transferStudent && !bulkTransferOpen) || !nextClassId || !onTransfer) return;
    setTransferring(true);
    try {
      if (bulkTransferOpen) {
        const selectedStudents = students.filter((student) => selectedIds.has(getStudentId(student)));
        for (const student of selectedStudents) await onTransfer(student, nextClassId);
        clearSelection();
      } else if (transferStudent) {
        await onTransfer(transferStudent, nextClassId);
      }
      setTransferStudent(null);
      setBulkTransferOpen(false);
      setTargetTeacherId('');
      setTargetClassId('');
    } finally {
      setTransferring(false);
    }
  };

  const actionIconClass = 'h-3 w-3';
  const getTeacherName = (student: Student) => {
    const teacherId = Number(student.class_teacher_id || getClassTeacherId(student) || student.effective_teacher_id || student.teacher_id || 0);
    if (!teacherId) return 'No teacher';
    return teacherOptions.find((teacher) => Number(teacher.value || teacher.id || 0) === teacherId)?.label || 'No teacher';
  };
  const getAge = (student: Student) => {
    if (!student.date_of_birth) return '-';
    const birthDate = new Date(student.date_of_birth);
    if (Number.isNaN(birthDate.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
    return age > 0 && age < 120 ? String(age) : '-';
  };
  const getGroupName = (student: Student) => student.class_name || 'No group';
  const getSchoolName = (student: Student) => student.school_name || 'No school';
  const getSchoolClass = (student: Student) => student.school_class || '-';
  const getPhone = (student: Student) => student.phone || student.parent_phone || '-';
  const chipClass = 'inline-flex h-6 max-w-full items-center gap-1 rounded-md px-2 text-[11px] font-bold leading-none';
  const renderTransferredChip = (student: Student) => {
    if (!isTransferredStudentStatus(student.status)) return null;

    return (
      <span className={`${chipClass} border ${getStatusVariant(student.status)}`}>
        <ArrowRightLeft className="h-3 w-3" />
        Transferred
      </span>
    );
  };
  const formatMoney = (value: unknown) => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return '';
    return `${amount.toLocaleString()} UZS`;
  };
  const formatDate = (value: unknown) => {
    if (!value) return '';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString();
  };
  const getPaymentLabel = (student: Student) => {
    if (!student.paid_this_month) return 'Unpaid';
    const amount = formatMoney(student.payment_amount_this_month);
    return amount ? `Paid ${amount}` : 'Paid';
  };
  const getPaymentTitle = (student: Student) => {
    const date = formatDate(student.last_payment_date_this_month);
    const status = String(student.payment_status_this_month || '').trim();
    if (!student.paid_this_month) return 'No completed payment recorded this month';
    return [status || 'Completed', date].filter(Boolean).join(' / ');
  };
  const renderPaymentChip = (student: Student) => (
    <span
      className={`${chipClass} ${student.paid_this_month ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
      title={getPaymentTitle(student)}
    >
      <CreditCard className="h-3 w-3" />
      <span className="max-w-[150px] truncate">{getPaymentLabel(student)}</span>
    </span>
  );

  const renderActions = (student: Student) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 w-7 rounded-md p-0">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => openCoins(student)}>
          <Coins className={actionIconClass} />
          Coins
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onView(student.student_id || student.id || 0)}>
          <Info className={actionIconClass} />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(student)}>
          <Pencil className={actionIconClass} />
          Edit
        </DropdownMenuItem>
        {onTransfer && (
          <DropdownMenuItem onClick={() => openTransfer(student)}>
            <ArrowRightLeft className={actionIconClass} />
            Transfer
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => onDelete(student.student_id || student.id || 0)}>
          <Trash2 className={actionIconClass} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const emptyText = hasActiveFilters ? 'No students match your search criteria' : 'No students found in this class';

  const dialog = (
    <>
      <StudentCoinsDialog
        open={coinDialogOpen}
        onOpenChange={setCoinDialogOpen}
        studentId={selectedStudent?.student_id || selectedStudent?.id}
        studentName={selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : undefined}
        currentCoins={selectedStudent?.coins}
        onSaved={onCoinsUpdated}
      />
      <Dialog open={transferStudent != null || bulkTransferOpen} onOpenChange={(open) => (!open ? closeTransfer() : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{bulkTransferOpen ? `Transfer ${selectedIds.size} students` : 'Transfer student'}</DialogTitle>
            <DialogDescription>
              {bulkTransferOpen ? 'Move the selected students into another teacher’s group.' : 'Move this student into another group. The current group keeps a transferred record, and a new active student record is created in the target group.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm dark:bg-muted/40">
              {bulkTransferOpen ? (
                <p className="font-medium">{selectedIds.size} selected students</p>
              ) : <>
                <p className="font-medium">{transferStudent?.first_name} {transferStudent?.last_name}</p>
                <p className="text-xs text-muted-foreground">Current group: {transferStudent?.class_name || transferStudent?.class_id || 'Unassigned'}</p>
              </>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-teacher">New teacher</Label>
              <Select
                value={targetTeacherId}
                onValueChange={(value) => {
                  setTargetTeacherId(value);
                  setTargetClassId('');
                }}
                disabled={transferring}
              >
                <SelectTrigger id="target-teacher">
                  <SelectValue placeholder="Select target teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptions
                    .filter((teacher) => classOptions.some((cls) => Number(cls.teacher_id || 0) === Number(teacher.value || teacher.id || 0)))
                    .map((teacher) => {
                      const id = Number(teacher.value || teacher.id || 0);
                      return <SelectItem key={id} value={String(id)}>{teacher.label}</SelectItem>;
                    })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-class">New group</Label>
              <Select value={targetClassId} onValueChange={setTargetClassId} disabled={transferring || !targetTeacherId}>
                <SelectTrigger id="target-class">
                  <SelectValue placeholder={targetTeacherId ? 'Select target group' : 'Choose a teacher first'} />
                </SelectTrigger>
                <SelectContent>
                  {classOptions
                    .filter((cls) => Number(cls.teacher_id || 0) === Number(targetTeacherId))
                    .filter((cls) => Number(cls.class_id || cls.id || 0) !== Number(transferStudent?.class_id || 0))
                    .map((cls) => {
                      const id = Number(cls.class_id || cls.id || 0);
                      return (
                        <SelectItem key={id} value={String(id)}>
                          {formatGroupLabel(cls)}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeTransfer} disabled={transferring}>
              Cancel
            </Button>
            <Button type="button" onClick={submitTransfer} disabled={transferring || !targetClassId}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              {transferring ? 'Transferring...' : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (viewMode !== 'list') {
    return (
      <>
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm shadow-sm dark:border-border dark:bg-card">
            <span className="font-medium">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2">
              {onTransfer && (
                <Button type="button" variant="outline" size="sm" onClick={openBulkTransfer}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer
                </Button>
              )}
              {onBulkDelete && (
                <Button type="button" variant="outline" size="sm" onClick={deleteSelected}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </div>
        )}
        {loading ? (
          <Card className="border-sky-100 bg-white shadow-sm dark:border-border dark:bg-card"><CardContent className="py-12 text-center">Loading...</CardContent></Card>
        ) : students.length === 0 ? (
          <Card className="border-sky-100 bg-white shadow-sm dark:border-border dark:bg-card"><CardContent className="py-12 text-center text-muted-foreground">{emptyText}</CardContent></Card>
        ) : (
          <div className={viewMode === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}>
            {students.map((student, index) => (
              <Card
                key={student.student_id || student.id}
                className={cn(
                  'relative overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-border dark:bg-card dark:hover:translate-y-0',
                  viewMode === 'cards' && [
                    'border-0 text-white',
                    index % 4 === 0 && 'bg-sky-600',
                    index % 4 === 1 && 'bg-emerald-600',
                    index % 4 === 2 && 'bg-amber-600',
                    index % 4 === 3 && 'bg-fuchsia-600',
                  ]
                )}
              >
                <span className="absolute left-2 top-2 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-900/80 px-1.5 text-[10px] font-bold text-white">
                  {getPaginatedRowNumber(index + startIndex)}
                </span>
                <div className="absolute right-2 top-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(getStudentId(student))}
                    onChange={(event) => toggleStudent(getStudentId(student), event.target.checked)}
                    className="h-3.5 w-3.5"
                    aria-label={`Select ${student.first_name} ${student.last_name}`}
                  />
                </div>
                {viewMode === 'cards' && (
                  <div className="p-3 text-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{student.first_name} {student.last_name}</h3>
                      </div>
                    </div>
                  </div>
                )}
                <CardContent className={cn(viewMode === 'compact' ? 'p-2.5' : 'space-y-3 p-3', viewMode === 'cards' && 'pt-0')}>
                  {viewMode === 'compact' ? (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shadow-sm">
                        <GraduationCap className="h-4 w-4 fill-white/20" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{student.first_name} {student.last_name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {renderTransferredChip(student)}
                          {!hideTeacherGroup && <span className={`${chipClass} bg-cyan-100 text-cyan-800`}><BookOpen className="h-3 w-3" />{getGroupName(student)}</span>}
                          {!hideTeacherGroup && <span className={`${chipClass} bg-violet-100 text-violet-800`}><UserCheck className="h-3 w-3" />{getTeacherName(student)}</span>}
                          <span className={`${chipClass} bg-amber-100 text-amber-800`}><School className="h-3 w-3" />{getSchoolName(student)}</span>
                          <span className={`${chipClass} bg-slate-100 text-slate-800`}><GraduationCap className="h-3 w-3" />{getSchoolClass(student)}</span>
                          <span className={`${chipClass} bg-rose-100 text-rose-800`}><Phone className="h-3 w-3" />{getPhone(student)}</span>
                          <span className={`${chipClass} bg-emerald-100 text-emerald-800`}>{getAge(student)} age</span>
                          {showMonthlyPaymentStatus && renderPaymentChip(student)}
                        </div>
                        <div className="mt-1.5">
                          <PasswordField student={student} onPasswordUpdate={onPasswordUpdate} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className={cn('text-sm font-semibold text-slate-950 dark:text-card-foreground', viewMode === 'cards' && 'text-white dark:text-white')}>
                        {student.first_name} {student.last_name}
                      </h3>
                      <div className={cn('mt-2 flex flex-wrap gap-1', viewMode === 'cards' && 'text-slate-950')}>
                        {renderTransferredChip(student)}
                        {!hideTeacherGroup && <span className={`${chipClass} bg-cyan-100 text-cyan-800`}><BookOpen className="h-3 w-3" />{getGroupName(student)}</span>}
                        {!hideTeacherGroup && <span className={`${chipClass} bg-violet-100 text-violet-800`}><UserCheck className="h-3 w-3" />{getTeacherName(student)}</span>}
                        <span className={`${chipClass} bg-amber-100 text-amber-800`}><School className="h-3 w-3" />{getSchoolName(student)}</span>
                        <span className={`${chipClass} bg-slate-100 text-slate-800`}><GraduationCap className="h-3 w-3" />{getSchoolClass(student)}</span>
                        <span className={`${chipClass} bg-rose-100 text-rose-800`}><Phone className="h-3 w-3" />{getPhone(student)}</span>
                        <span className={`${chipClass} bg-emerald-100 text-emerald-800`}>{getAge(student)} age</span>
                        {showMonthlyPaymentStatus && renderPaymentChip(student)}
                      </div>
                      <div className="mt-2">
                        <PasswordField student={student} onPasswordUpdate={onPasswordUpdate} />
                      </div>
                    </div>
                  )}
                  <div className={cn(viewMode === 'compact' ? 'mt-2 flex justify-end border-t pt-2' : 'border-t pt-2', viewMode === 'cards' && 'border-white/25')}>
                    {renderActions(student)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {dialog}
      </>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between border-b bg-sky-50/70 px-3 py-1.5 text-xs dark:bg-muted/50">
          <span className="font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            {onTransfer && (
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={openBulkTransfer}>
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                Transfer
              </Button>
            )}
            {onBulkDelete && (
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={deleteSelected}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}
      <Table className="text-xs">
        <TableHeader className="bg-slate-50/90 dark:bg-transparent">
          <TableRow>
            <TableHead className="h-8 w-8 px-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(input) => {
                  if (input) input.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
                }}
                onChange={(event) => toggleAllVisible(event.target.checked)}
                aria-label="Select all visible students"
                className="h-3.5 w-3.5"
              />
            </TableHead>
            <TableHead className="h-8 w-12 px-2 text-xs">#</TableHead>
            <TableHead className="h-8 px-2 text-xs">Name</TableHead>
            {!hideTeacherGroup && <TableHead className="h-8 px-2 text-xs">Group</TableHead>}
            {!hideTeacherGroup && <TableHead className="h-8 px-2 text-xs">Teacher</TableHead>}
            <TableHead className="h-8 px-2 text-xs">School</TableHead>
            <TableHead className="h-8 px-2 text-xs">School class</TableHead>
            <TableHead className="h-8 px-2 text-xs">Phone</TableHead>
            <TableHead className="h-8 px-2 text-xs">Age</TableHead>
            {showMonthlyPaymentStatus && <TableHead className="h-8 px-2 text-xs">This month</TableHead>}
            <TableHead className="h-8 px-2 text-xs">Password</TableHead>
            <TableHead className="h-8 px-2 text-right text-xs"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={(hideTeacherGroup ? 9 : 11) + (showMonthlyPaymentStatus ? 1 : 0)} className="py-8 text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={(hideTeacherGroup ? 9 : 11) + (showMonthlyPaymentStatus ? 1 : 0)} className="py-8 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            students.map((student, index) => (
              <TableRow key={student.student_id || student.id} className="hover:bg-sky-50/60 dark:hover:bg-muted/50">
                <TableCell className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(getStudentId(student))}
                    onChange={(event) => toggleStudent(getStudentId(student), event.target.checked)}
                    aria-label={`Select ${student.first_name} ${student.last_name}`}
                    className="h-3.5 w-3.5"
                  />
                </TableCell>
                <TableCell className="px-2 py-2 font-semibold tabular-nums text-muted-foreground">
                  {getPaginatedRowNumber(index + startIndex)}
                </TableCell>
                <TableCell className="px-2 py-2 font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="text-left font-semibold text-slate-950 hover:text-sky-700 dark:text-card-foreground dark:hover:text-primary"
                      onClick={() => onView(student.student_id || student.id || 0)}
                    >
                      {student.first_name} {student.last_name}
                    </button>
                    {renderTransferredChip(student)}
                  </div>
                </TableCell>
                {!hideTeacherGroup && (
                  <TableCell className="px-2 py-2">
                    <span className={`${chipClass} bg-cyan-100 text-cyan-800`}>
                      <BookOpen className="h-3 w-3" />
                      <span className="max-w-[160px] truncate">{getGroupName(student)}</span>
                    </span>
                  </TableCell>
                )}
                {!hideTeacherGroup && (
                  <TableCell className="px-2 py-2">
                    <span className={`${chipClass} bg-violet-100 text-violet-800`}>
                      <UserCheck className="h-3 w-3" />
                      <span className="max-w-[150px] truncate">{getTeacherName(student)}</span>
                    </span>
                  </TableCell>
                )}
                <TableCell className="px-2 py-2">
                  <span className={`${chipClass} bg-amber-100 text-amber-800`}>
                    <School className="h-3 w-3" />
                    <span className="max-w-[140px] truncate">{getSchoolName(student)}</span>
                  </span>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <span className={`${chipClass} bg-slate-100 text-slate-800`}>
                    <GraduationCap className="h-3 w-3" />
                    <span className="max-w-[100px] truncate">{getSchoolClass(student)}</span>
                  </span>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <span className={`${chipClass} bg-rose-100 text-rose-800`}>
                    <Phone className="h-3 w-3" />
                    <span className="max-w-[120px] truncate">{getPhone(student)}</span>
                  </span>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <span className={`${chipClass} bg-emerald-100 text-emerald-800`}>{getAge(student)}</span>
                </TableCell>
                {showMonthlyPaymentStatus && (
                  <TableCell className="px-2 py-2">
                    {renderPaymentChip(student)}
                  </TableCell>
                )}
                <TableCell className="px-2 py-2">
                  <PasswordField student={student} onPasswordUpdate={onPasswordUpdate} />
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  {renderActions(student)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {dialog}
    </Card>
  );
};
