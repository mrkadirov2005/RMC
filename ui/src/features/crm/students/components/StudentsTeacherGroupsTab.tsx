import { ArrowLeft, ArrowRight, ArrowRightLeft, BookOpen, Loader2, Search, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { classAPI, paymentAPI, studentAPI } from '../api';
import { unwrapApiRows } from '@/shared/api/response';
import { showToast } from '@/utils/toast';
import type { ViewMode } from '@/components/common/ViewModeToggle';
import { StudentsTableView } from './StudentsTableView';
import type { Class, Student } from '../types';

interface Option {
  id?: number;
  label: string;
  value: string | number;
}

interface TeacherSummary {
  teacher_id?: number;
  id?: number;
  first_name?: string;
  last_name?: string;
  student_count?: number;
  class_count?: number;
}

interface Props {
  students: Student[];
  classes: Class[];
  teachers?: TeacherSummary[];
  teacherOptions: Option[];
  loading: boolean;
  viewMode: ViewMode;
  onView: (id: number) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  onTransfer?: (student: Student, targetClassId: number) => Promise<void> | void;
  onBulkDelete?: (ids: number[]) => Promise<void> | void;
  onPasswordUpdate?: (student: Student, password: string) => Promise<void> | void;
  onCoinsUpdated?: () => void;
  onTransferGroup: (classId: number, teacherId: number) => Promise<void> | void;
  onDeleteGroups?: (classIds: number[]) => Promise<void> | void;
}

const toId = (value: unknown) => {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const buttonToneClasses = [
  'bg-sky-600 hover:bg-sky-700',
  'bg-emerald-600 hover:bg-emerald-700',
  'bg-amber-500 hover:bg-amber-600',
  'bg-fuchsia-600 hover:bg-fuchsia-700',
  'bg-rose-600 hover:bg-rose-700',
  'bg-cyan-600 hover:bg-cyan-700',
];

const getTone = (index: number) => buttonToneClasses[index % buttonToneClasses.length];

const normalizeSearch = (value: unknown) => String(value || '').trim().toLowerCase();

const getStudentSearchText = (student: Student) =>
  [
    student.first_name,
    student.last_name,
    student.username,
    student.email,
    student.phone,
  ].filter(Boolean).join(' ');

const getRows = unwrapApiRows;

type PaymentRow = {
  student_id?: number;
  student_first_name?: string;
  student_last_name?: string;
  payment_date?: string;
  amount?: number | string;
  payment_status?: string;
  status?: string;
  payment_type?: string;
};

const normalizeName = (firstName?: string, lastName?: string) =>
  [firstName, lastName]
    .map((part) => String(part || '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ');

const getMonthKey = (value: Date | string) => {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const isCompletedPayment = (payment: PaymentRow) => {
  const status = String(payment.status || payment.payment_status || '').trim().toLowerCase();
  return status === 'completed' || status === 'paid';
};

const mergeMonthlyPayments = (students: Student[], payments: PaymentRow[]) => {
  const currentMonth = getMonthKey(new Date());
  const byStudentId = new Map<number, PaymentRow[]>();
  const byStudentName = new Map<string, PaymentRow[]>();

  payments
    .filter((payment) => isCompletedPayment(payment))
    .filter((payment) => getMonthKey(payment.payment_date || '') === currentMonth)
    .filter((payment) => String(payment.payment_type || '') !== 'Transfer Adjustment')
    .forEach((payment) => {
      const studentId = toId(payment.student_id);
      if (studentId) {
        const rows = byStudentId.get(studentId) || [];
        rows.push(payment);
        byStudentId.set(studentId, rows);
      }

      const nameKey = normalizeName(payment.student_first_name, payment.student_last_name);
      if (nameKey) {
        const rows = byStudentName.get(nameKey) || [];
        rows.push(payment);
        byStudentName.set(nameKey, rows);
      }
    });

  return students.map((student) => {
    const studentId = toId(student.student_id || student.id);
    const nameKey = normalizeName(student.first_name, student.last_name);
    const rows = (studentId ? byStudentId.get(studentId) : undefined) || byStudentName.get(nameKey) || [];
    if (rows.length === 0) return student;

    const amount = rows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const latest = rows
      .slice()
      .sort((a, b) => String(b.payment_date || '').localeCompare(String(a.payment_date || '')))[0];

    return {
      ...student,
      paid_this_month: true,
      payment_amount_this_month: amount,
      payment_count_this_month: rows.length,
      last_payment_date_this_month: latest?.payment_date || student.last_payment_date_this_month,
      payment_status_this_month: latest?.status || latest?.payment_status || student.payment_status_this_month || 'Completed',
    };
  });
};

type TeacherClassRow = {
  cls: Partial<Class> & { class_name?: string; class_code?: string; level?: number | null };
  classId: number;
  teacherId: number | null;
  students: Student[];
  studentCount: number;
};

export const StudentsTeacherGroupsTab = ({
  students,
  classes,
  teachers: teacherItems = [],
  teacherOptions,
  loading,
  onView,
  onEdit,
  onDelete,
  onTransfer,
  onBulkDelete,
  onPasswordUpdate,
  onCoinsUpdated,
  onTransferGroup,
  onDeleteGroups,
}: Props) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [targetTeachers, setTargetTeachers] = useState<Record<number, string>>({});
  const [savingClassId, setSavingClassId] = useState<number | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<number>>(new Set());
  const [bulkTargetTeacherId, setBulkTargetTeacherId] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<Student[]>([]);
  const [selectedClassStudents, setSelectedClassStudents] = useState<Student[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [classLoading, setClassLoading] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const teachers = useMemo(() => {
    const map = new Map<number, { id: number; name: string; studentCount?: number; classCount?: number }>();
    for (const teacher of teacherItems) {
      const id = toId(teacher.teacher_id || teacher.id);
      if (!id) continue;
      const name = [teacher.first_name, teacher.last_name].filter(Boolean).join(' ').trim() || `Teacher ${id}`;
      map.set(id, {
        id,
        name,
        studentCount: teacher.student_count == null ? undefined : Number(teacher.student_count),
        classCount: teacher.class_count == null ? undefined : Number(teacher.class_count),
      });
    }
    for (const teacher of teacherOptions) {
      const id = toId(teacher.value || teacher.id);
      if (id && !map.has(id)) map.set(id, { id, name: teacher.label });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teacherItems, teacherOptions]);

  const overviewClassRows = useMemo<TeacherClassRow[]>(() => {
    const realRows = classes
      .map((cls) => {
        const classId = toId(cls.class_id || cls.id) || 0;
        const teacherId = toId(cls.teacher_id);
        const groupStudents = students.filter((student) => toId(student.class_id) === classId);
        return { cls, classId, teacherId, students: groupStudents, studentCount: Number(cls.student_count ?? groupStudents.length) };
      })
      .filter((row) => row.classId > 0);

    return realRows;
  }, [classes, students]);

  const selectedTeacherClassRows = useMemo<TeacherClassRow[]>(() => {
    if (!selectedTeacherId) return [];

    const realRows = teacherClasses
      .map((cls) => {
        const classId = toId(cls.class_id || cls.id) || 0;
        const teacherId = toId(cls.teacher_id) || selectedTeacherId;
        const groupStudents = teacherStudents.filter((student) => toId(student.class_id) === classId);
        return {
          cls,
          classId,
          teacherId,
          students: groupStudents,
          studentCount: Number(cls.student_count ?? groupStudents.length),
        };
      })
      .filter((row) => row.classId > 0);

    return realRows;
  }, [selectedTeacherId, teacherClasses, teacherStudents]);

  const selectedTeacher = selectedTeacherId ? teachers.find((teacher) => teacher.id === selectedTeacherId) : null;
  const selectedClass = selectedClassId ? selectedTeacherClassRows.find((row) => row.classId === selectedClassId) : null;
  const normalizedSearch = normalizeSearch(searchQuery);
  const filteredTeachers = useMemo(() => {
    if (!normalizedSearch) return teachers;

    return teachers.filter((teacher) => {
      const groups = overviewClassRows.filter((row) => row.teacherId === teacher.id);
      const haystack = [
        teacher.name,
        ...groups.flatMap((group) => [
          group.cls.class_name,
          group.cls.class_code,
          group.cls.level,
          ...group.students.map(getStudentSearchText),
        ]),
      ].filter(Boolean).join(' ');

      return normalizeSearch(haystack).includes(normalizedSearch);
    });
  }, [normalizedSearch, overviewClassRows, teachers]);
  const selectedTeacherClasses = selectedTeacherId
    ? selectedTeacherClassRows
      .filter((row) => row.teacherId === selectedTeacherId)
      .filter((row) => {
        if (!normalizedSearch) return true;
        const haystack = [
          row.cls.class_name,
          row.cls.class_code,
          row.cls.level,
          ...row.students.map(getStudentSearchText),
        ].filter(Boolean).join(' ');
        return normalizeSearch(haystack).includes(normalizedSearch);
      })
      .sort((a, b) => String(a.cls.class_name || '').localeCompare(String(b.cls.class_name || '')))
    : [];
  const selectableClassIds = selectedTeacherClasses.filter((row) => row.classId > 0).map((row) => row.classId);
  const selectedVisibleClassCount = selectableClassIds.filter((id) => selectedClassIds.has(id)).length;
  const allVisibleClassesSelected = selectableClassIds.length > 0 && selectedVisibleClassCount === selectableClassIds.length;

  useEffect(() => {
    setSelectedClassIds(new Set());
    setBulkTargetTeacherId('');
  }, [selectedTeacherId, searchQuery]);

  useEffect(() => {
    if (!selectedTeacherId) {
      setTeacherClasses([]);
      setTeacherStudents([]);
      return;
    }

    let alive = true;
    setTeacherLoading(true);
    setSelectedClassId(null);
    setSelectedClassStudents([]);
    Promise.all([
      classAPI.getAll({ teacher_id: selectedTeacherId, page: 1, limit: 100 }),
      studentAPI.getAll({ teacher_id: selectedTeacherId, page: 1, limit: 100 }),
    ])
      .then(([classesResponse, studentsResponse]) => {
        if (!alive) return;
        setTeacherClasses(getRows<Class>(classesResponse));
        setTeacherStudents(getRows<Student>(studentsResponse));
      })
      .catch((error: any) => {
        if (!alive) return;
        setTeacherClasses([]);
        setTeacherStudents([]);
        showToast.error(error?.response?.data?.error || error?.response?.data?.details || 'Failed to load teacher groups.');
      })
      .finally(() => {
        if (alive) setTeacherLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedTeacherId]);

  const openTeacher = (teacherId: number) => {
    setSelectedTeacherId(teacherId);
    setSelectedClassId(null);
    setSelectedClassStudents([]);
  };

  const openClass = async (classId: number) => {
    const row = selectedTeacherClassRows.find((item) => item.classId === classId);
    setSelectedClassId(classId);
    setSelectedClassStudents([]);

    setClassLoading(true);
    try {
      const expectedCount = Math.max(100, Number(row?.studentCount || row?.students.length || 0));
      const fetchClassStudents = async () => {
        try {
          const response = await studentAPI.getByClassWithTransfers(classId, { _fresh: Date.now() });
          const rows = getRows<Student>(response);
          if (rows.length > 0 || Number(row?.studentCount || 0) === 0) return rows;
        } catch {
          // Older deployed backends may not have /students/class/:classId yet.
        }

        const fallbackResponse = await studentAPI.getAll({
          class_id: classId,
          page: 1,
          limit: Math.min(100, expectedCount),
          _fresh: Date.now(),
        });
        return getRows<Student>(fallbackResponse);
      };

      const [studentsResponse, paymentsResponse] = await Promise.all([
        fetchClassStudents(),
        paymentAPI.getAll({ page: 1, limit: 200 }).catch(() => ({ data: [] })),
      ]);
      const classStudents = Array.isArray(studentsResponse) ? studentsResponse : getRows<Student>(studentsResponse);
      const currentPayments = getRows<PaymentRow>(paymentsResponse);
      setSelectedClassStudents(mergeMonthlyPayments(classStudents, currentPayments));
    } catch (error: any) {
      setSelectedClassStudents([]);
      showToast.error(error?.response?.data?.error || error?.response?.data?.details || 'Failed to load class students.');
    } finally {
      setClassLoading(false);
    }
  };

  const applySearch = () => {
    setSearchQuery(searchDraft.trim());
    setSelectedClassId(null);
  };

  const clearSearch = () => {
    setSearchDraft('');
    setSearchQuery('');
    setSelectedClassId(null);
  };

  const saveTransfer = async (classId: number) => {
    const teacherId = Number(targetTeachers[classId]);
    if (!teacherId) return;
    setSavingClassId(classId);
    try {
      await onTransferGroup(classId, teacherId);
      setTargetTeachers((current) => ({ ...current, [classId]: '' }));
      openTeacher(teacherId);
      setSelectedClassId(null);
    } finally {
      setSavingClassId(null);
    }
  };

  const toggleClass = (classId: number, checked: boolean) => {
    setSelectedClassIds((current) => {
      const next = new Set(current);
      if (checked) next.add(classId);
      else next.delete(classId);
      return next;
    });
  };

  const toggleAllVisibleClasses = (checked: boolean) => {
    setSelectedClassIds((current) => {
      const next = new Set(current);
      for (const classId of selectableClassIds) {
        if (checked) next.add(classId);
        else next.delete(classId);
      }
      return next;
    });
  };

  const deleteSelectedGroups = async () => {
    if (!onDeleteGroups || selectedClassIds.size === 0) return;
    setBulkSaving(true);
    try {
      await onDeleteGroups(Array.from(selectedClassIds));
      setTeacherClasses((current) => current.filter((cls) => !selectedClassIds.has(toId(cls.class_id || cls.id) || 0)));
      setSelectedClassIds(new Set());
      setSelectedClassId(null);
    } finally {
      setBulkSaving(false);
    }
  };

  const transferSelectedGroups = async () => {
    const teacherId = Number(bulkTargetTeacherId);
    const classIds = Array.from(selectedClassIds).filter((id) => id > 0);
    if (!teacherId || classIds.length === 0) return;
    setBulkSaving(true);
    try {
      for (const classId of classIds) {
        await onTransferGroup(classId, teacherId);
      }
      setSelectedClassIds(new Set());
      setBulkTargetTeacherId('');
      openTeacher(teacherId);
      setSelectedClassId(null);
    } finally {
      setBulkSaving(false);
    }
  };

  const goBackToTeachers = () => {
    setSelectedTeacherId(null);
    setSelectedClassId(null);
    setSelectedClassStudents([]);
  };

  const goBackToClasses = () => {
    setSelectedClassId(null);
    setSelectedClassStudents([]);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading teachers and groups...
        </CardContent>
      </Card>
    );
  }

  if (selectedClass) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" size="sm" className="h-7 w-fit gap-1.5 text-xs" onClick={goBackToClasses}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to classes
          </Button>
          <div className="text-xs text-muted-foreground">
            {selectedTeacher?.name || 'Teacher'} / {selectedClass.cls.class_name || `Class #${selectedClass.classId}`}
          </div>
        </div>
        <StudentsTableView
          students={selectedClassStudents}
          loading={classLoading}
          hasActiveFilters={false}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onTransfer={onTransfer}
          onBulkDelete={onBulkDelete}
          onPasswordUpdate={onPasswordUpdate}
          onCoinsUpdated={onCoinsUpdated}
          classOptions={classes}
          hideTeacherGroup
          showMonthlyPaymentStatus
          viewMode="list"
        />
      </div>
    );
  }

  if (selectedTeacher) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" size="sm" className="h-7 w-fit gap-1.5 text-xs" onClick={goBackToTeachers}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to teachers
          </Button>
          <div className="text-xs text-muted-foreground">{selectedTeacher.name}</div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-card sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applySearch();
              }}
              placeholder="Search groups or students..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button type="button" size="sm" className="h-8 gap-1.5 bg-sky-600 px-3 text-xs text-white hover:bg-sky-700" onClick={applySearch}>
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
          {searchQuery && (
            <Button type="button" size="sm" className="h-8 gap-1.5 bg-rose-600 px-3 text-xs text-white hover:bg-rose-700" onClick={clearSearch}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {selectedClassIds.size > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-sky-100 bg-sky-50/80 p-2 text-sm dark:border-border dark:bg-muted/40 sm:flex-row sm:items-center">
            <span className="font-medium">{selectedClassIds.size} selected</span>
            <Select value={bulkTargetTeacherId} onValueChange={setBulkTargetTeacherId} disabled={bulkSaving}>
              <SelectTrigger className="h-8 bg-white text-xs dark:bg-background sm:ml-auto sm:w-[240px]">
                <SelectValue placeholder="Transfer selected to..." />
              </SelectTrigger>
              <SelectContent>
                {teachers
                  .filter((teacher) => teacher.id !== selectedTeacherId)
                  .map((teacher) => (
                    <SelectItem key={teacher.id} value={String(teacher.id)}>
                      {teacher.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" className="h-8 gap-1.5 bg-sky-600 px-3 text-xs text-white hover:bg-sky-700" onClick={transferSelectedGroups} disabled={bulkSaving || !bulkTargetTeacherId}>
              {bulkSaving && bulkTargetTeacherId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
              Transfer
            </Button>
            {onDeleteGroups && (
              <Button type="button" size="sm" className="h-8 gap-1.5 bg-rose-600 px-3 text-xs text-white hover:bg-rose-700" onClick={deleteSelectedGroups} disabled={bulkSaving}>
                {bulkSaving && !bulkTargetTeacherId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedClassIds(new Set())} disabled={bulkSaving}>
              Clear
            </Button>
          </div>
        )}

        {teacherLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading this teacher...
            </CardContent>
          </Card>
        ) : selectedTeacherClasses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No groups or students match this search.' : 'No groups assigned to this teacher.'}
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <div className="grid grid-cols-[32px_minmax(0,1fr)_100px_minmax(260px,320px)] items-center gap-3 border-b bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-muted-foreground dark:bg-muted/40">
              <span>
                <input
                  type="checkbox"
                  checked={allVisibleClassesSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = selectedVisibleClassCount > 0 && !allVisibleClassesSelected;
                  }}
                  onChange={(event) => toggleAllVisibleClasses(event.target.checked)}
                  aria-label="Select all visible groups"
                  className="h-3.5 w-3.5"
                />
              </span>
              <span>Group</span>
              <span className="text-center">Students</span>
              <span className="text-right">Teacher transfer</span>
            </div>
            {selectedTeacherClasses.map(({ cls, classId, teacherId, studentCount }, index) => (
              <div key={classId} className="grid gap-2 border-b px-3 py-2 last:border-b-0 lg:grid-cols-[32px_minmax(0,1fr)_100px_minmax(260px,320px)] lg:items-center">
                <div>
                  <input
                    type="checkbox"
                    checked={selectedClassIds.has(classId)}
                    onChange={(event) => toggleClass(classId, event.target.checked)}
                    aria-label={`Select ${cls.class_name || `Class #${classId}`}`}
                    className="h-3.5 w-3.5"
                  />
                </div>
                <div className="flex min-w-0 items-center gap-2.5">
                  <button type="button" className={`${getTone(index)} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm`} onClick={() => openClass(classId)} aria-label={`Open ${cls.class_name || `Class #${classId}`}`}>
                    <Users className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <button type="button" className="truncate text-left text-sm font-semibold text-slate-950 hover:text-sky-700 dark:text-foreground" onClick={() => openClass(classId)}>
                      {cls.class_name || `Class #${classId}`}
                    </button>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{[cls.class_code, cls.level ? `Level ${cls.level}` : null].filter(Boolean).join(' / ') || 'Group'}</p>
                  </div>
                </div>

                <button type="button" className="w-fit rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 lg:mx-auto" onClick={() => openClass(classId)}>
                  {studentCount} students
                </button>

                <div className="flex flex-col gap-1.5 sm:flex-row" onClick={(event) => event.stopPropagation()}>
                  <Select
                    value={targetTeachers[classId] || ''}
                    onValueChange={(value) => setTargetTeachers((current) => ({ ...current, [classId]: value }))}
                    disabled={savingClassId === classId}
                  >
                    <SelectTrigger className="h-7 bg-white text-xs dark:bg-background">
                      <SelectValue placeholder="Transfer teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers
                        .filter((teacher) => teacher.id !== teacherId)
                        .map((teacher) => (
                          <SelectItem key={teacher.id} value={String(teacher.id)}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" className={`${getTone(index)} h-7 gap-1.5 px-2 text-xs text-white`} onClick={() => saveTransfer(classId)} disabled={!targetTeachers[classId] || savingClassId === classId}>
                    {savingClassId === classId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
                    Transfer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">No teachers found.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-card sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applySearch();
            }}
            placeholder="Search teacher, group, student..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Button type="button" size="sm" className="h-8 gap-1.5 bg-sky-600 px-3 text-xs text-white hover:bg-sky-700" onClick={applySearch}>
          <Search className="h-3.5 w-3.5" />
          Search
        </Button>
        {searchQuery && (
          <Button type="button" size="sm" className="h-8 gap-1.5 bg-rose-600 px-3 text-xs text-white hover:bg-rose-700" onClick={clearSearch}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground sm:ml-auto">{filteredTeachers.length} teachers</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_100px_110px_86px] items-center gap-3 border-b bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-muted-foreground dark:bg-muted/40">
          <span>Teacher</span>
          <span className="text-center">Groups</span>
          <span className="text-center">Students</span>
          <span className="text-right">Open</span>
        </div>
        {filteredTeachers.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">No teachers, groups, or students match this search.</div>
        ) : (
          filteredTeachers.map((teacher, index) => {
            const groups = overviewClassRows.filter((row) => row.teacherId === teacher.id);
            const studentCount = teacher.studentCount ?? groups.reduce((sum, group) => sum + group.studentCount, 0);
            const groupCount = teacher.classCount ?? groups.length;
            return (
              <div key={teacher.id} className="grid gap-2 border-b px-3 py-2 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_100px_110px_86px] lg:items-center">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button type="button" className={`${getTone(index)} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm`} onClick={() => openTeacher(teacher.id)} aria-label={`Open ${teacher.name}`}>
                    <BookOpen className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <button type="button" className="truncate text-left text-sm font-semibold text-slate-950 hover:text-sky-700 dark:text-foreground" onClick={() => openTeacher(teacher.id)}>
                      {teacher.name}
                    </button>
                    <p className="mt-0.5 text-xs text-muted-foreground">Teacher groups and students</p>
                  </div>
                </div>
                <button type="button" className="w-fit rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 lg:mx-auto" onClick={() => openTeacher(teacher.id)}>
                  {groupCount} groups
                </button>
                <button type="button" className="w-fit rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 lg:mx-auto" onClick={() => openTeacher(teacher.id)}>
                  {studentCount} students
                </button>
                <Button type="button" size="sm" className={`${getTone(index)} h-7 gap-1 px-2 text-xs text-white`} onClick={() => openTeacher(teacher.id)}>
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
