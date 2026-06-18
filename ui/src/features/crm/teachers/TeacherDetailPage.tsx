// Page component for the teachers screen in the crm feature.

import { useState, useEffect, useMemo } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { useParams, useNavigate } from 'react-router-dom';
import { gradeAPI, studentAPI, teacherAPI } from '../../../shared/api/api';
import { AssignmentSectionTeacher } from './components/AssignmentSectionTeacher';
import { showToast } from '../../../utils/toast';
import {
  ArrowLeft,
  X,
  Plus,
  Mail,
  Phone,
  GraduationCap,
  BadgeCheck,
  Calendar,
  ChevronDown,
  User,
  BookOpen,
  ClipboardList,
  FileQuestion,
  Loader2,
  KeyRound,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/utils/errorMessage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { generateTempPassword } from '@/utils/password';
import { fetchTeachers, fetchTeachersForce } from '@/slices/teachersSlice';
import { fetchClasses, fetchClassesForce } from '@/slices/classesSlice';
import { fetchStudents, fetchStudentsForce } from '@/slices/studentsSlice';
import { fetchSubjects, fetchSubjectsForce } from '@/slices/subjectsSlice';
import { fetchAssignments, fetchAssignmentsForce } from '@/slices/assignmentsSlice';
import { fetchPayments, fetchPaymentsForce } from '@/slices/paymentsSlice';

interface GradeEntry {
  student_id: number;
  percentage: number;
  grade_letter: string;
}

interface TeacherStudent {
  student_id?: number;
  id?: number;
  teacher_id?: number;
  class_id?: number;
  enrollment_number?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: string;
}

// Renders the teacher detail page screen.
const TeacherDetailPage = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  // Redux selectors for business data
  const teacher = useAppSelector((state) =>
    state.teachers.items.find((t) => String(t.teacher_id || t.id) === String(teacherId))
  );
  const allClasses = useAppSelector((state) => state.classes.items);
  const classes = useAppSelector((state) =>
    state.classes.items.filter((c) => String(c.teacher_id) === String(teacherId))
  );
  const storeStudents = useAppSelector((state) => state.students.items as TeacherStudent[]);
  const subjects = useAppSelector((state) =>
    state.subjects.items.filter((s) => classes.some((c) => (c.class_id || c.id) === s.class_id))
  );
  const assignments = useAppSelector((state) =>
    state.assignments.items.filter((a) => String(a.teacher_id) === String(teacherId))
  );
  const payments = useAppSelector((state) => state.payments.items);
  const dataLoading = useAppSelector((state) => state.teachers.loading || state.classes.loading || state.students.loading || state.subjects.loading || state.assignments.loading || state.payments.loading);
  const error = useAppSelector((state) => state.teachers.error || state.classes.error || state.students.error || state.subjects.error || state.assignments.error || state.payments.error);
  // UI state only
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTerm, setSelectedTerm] = useState('Q1');
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [tabValue, setTabValue] = useState('info');
  const [expandedClassIds, setExpandedClassIds] = useState<Set<number>>(new Set());
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetTempPassword, setResetTempPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const [paymentPasswordOpen, setPaymentPasswordOpen] = useState(false);
  const [paymentTempPassword, setPaymentTempPassword] = useState('');
  const [settingPaymentPassword, setSettingPaymentPassword] = useState(false);
  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [detailStudents, setDetailStudents] = useState<TeacherStudent[]>([]);
  const [detailStudentsLoading, setDetailStudentsLoading] = useState(false);
  const loading = dataLoading;
  const teacherIdNum = Number(teacherId);
  const studentsSource = useMemo(() => {
    const byId = new Map<number, TeacherStudent>();
    for (const student of storeStudents) {
      const id = Number(student.student_id || student.id);
      if (id) byId.set(id, student);
    }
    for (const student of detailStudents) {
      const id = Number(student.student_id || student.id);
      if (id) byId.set(id, { ...byId.get(id), ...student });
    }
    return Array.from(byId.values());
  }, [detailStudents, storeStudents]);
  const teacherClassIds = useMemo(
    () => new Set(classes.map((c) => Number(c.class_id || c.id)).filter(Boolean)),
    [classes]
  );
  const classById = useMemo(() => {
    const map = new Map<number, any>();
    for (const classItem of allClasses) {
      const id = Number(classItem.class_id || classItem.id);
      if (id) map.set(id, classItem);
    }
    return map;
  }, [allClasses]);
  const teacherStudents = useMemo(() => {
    return studentsSource.filter((student) =>
      Number(student.teacher_id) === teacherIdNum ||
      (student.class_id != null && teacherClassIds.has(Number(student.class_id)))
    );
  }, [studentsSource, teacherClassIds, teacherIdNum]);
  const directAssignedStudents = useMemo(() => {
    return teacherStudents
      .filter((student) =>
        Number(student.teacher_id) === teacherIdNum &&
        !student.class_id
      )
      .sort((a, b) =>
        `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`)
      );
  }, [teacherIdNum, teacherStudents]);
  const classStudentsByClassId = useMemo(() => {
    const map = new Map<number, TeacherStudent[]>();
    for (const student of teacherStudents) {
      const classId = Number(student.class_id);
      if (!classId) continue;
      if (!map.has(classId)) map.set(classId, []);
      map.get(classId)?.push(student);
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`)
      );
    }
    return map;
  }, [teacherStudents]);
  const studentClassGroups = useMemo(() => {
    const ids = new Set<number>();
    for (const classItem of classes) {
      const id = Number(classItem.class_id || classItem.id);
      if (id) ids.add(id);
    }
    for (const student of teacherStudents) {
      const id = Number(student.class_id);
      if (id) ids.add(id);
    }

    return Array.from(ids)
      .map((classId) => {
        const fallbackClass = classes.find((classItem) => Number(classItem.class_id || classItem.id) === classId);
        const classItem = classById.get(classId) || fallbackClass || {
          class_id: classId,
          class_name: `Group #${classId}`,
          level: null,
        };
        return {
          classId,
          classItem,
          students: classStudentsByClassId.get(classId) || [],
          isTeacherOwned: teacherClassIds.has(classId),
        };
      })
      .sort((a, b) =>
        Number(b.isTeacherOwned) - Number(a.isTeacherOwned) ||
        String(a.classItem.class_name || '').localeCompare(String(b.classItem.class_name || ''))
      );
  }, [classById, classStudentsByClassId, classes, teacherClassIds, teacherStudents]);

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchTeachers());
    dispatch(fetchClasses());
    dispatch(fetchStudents());
    dispatch(fetchSubjects());
    dispatch(fetchAssignments());
    dispatch(fetchPayments());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, teacherId]);

// Runs side effects for this component.
  useEffect(() => {
    let cancelled = false;
    setDetailStudentsLoading(true);
    studentAPI.getAll()
      .then((response) => {
        const payload = (response as any).data ?? response;
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        if (!cancelled) {
          setDetailStudents(rows);
        }
      })
      .catch((error) => {
        console.error('Error loading all students for teacher detail:', error);
        if (!cancelled) {
          setDetailStudents([]);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailStudentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

// Returns students by class.
  const getStudentsByClass = (classId: number | undefined) => {
    if (!classId) return [];
    return classStudentsByClassId.get(Number(classId)) || [];
  };

// Handles calculate grade letter.
  const calculateGradeLetter = (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

// Handles open grade modal.
  const handleOpenGradeModal = () => {
    setSelectedClassId(null);
    setSelectedSubjectId(null);
    setSelectedTerm('Q1');
    setGradeEntries([]);
    setIsGradeModalOpen(true);
  };

// Handles close grade modal.
  const handleCloseGradeModal = () => {
    setIsGradeModalOpen(false);
    setSelectedClassId(null);
    setSelectedSubjectId(null);
    setGradeEntries([]);
  };

// Handles class select.
  const handleClassSelect = (classId: number) => {
    setSelectedClassId(classId);
    const classStudents = getStudentsByClass(classId);
    setGradeEntries(
      classStudents.map((s) => ({
        student_id: s.student_id || s.id || 0,
        percentage: 0,
        grade_letter: 'F',
      }))
    );
  };

// Handles percentage change.
  const handlePercentageChange = (index: number, percentage: number) => {
    const newEntries = [...gradeEntries];
    newEntries[index].percentage = percentage;
    newEntries[index].grade_letter = calculateGradeLetter(percentage);
    setGradeEntries(newEntries);
  };

// Handles save grades.
  const handleSaveGrades = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      showToast.error('Please select class and subject');
      return;
    }

    setIsSavingGrades(true);
    try {
      const teacherIdNum = Number(teacherId);
      const subjectIdNum = Number(selectedSubjectId);
      // Save grades for all students
      const gradePromises = gradeEntries.map((entry) =>
        gradeAPI.create({
          student_id: entry.student_id,
          teacher_id: teacherIdNum,
          subject: subjectIdNum,
          percentage: entry.percentage,
          grade_letter: entry.grade_letter,
          term: selectedTerm,
        })
      );

      await Promise.all(gradePromises);
      showToast.success('Grades saved successfully');
      handleCloseGradeModal();
      // Refresh Redux data after saving grades
      dispatch(fetchTeachersForce());
      dispatch(fetchClassesForce());
      dispatch(fetchStudentsForce());
      dispatch(fetchSubjectsForce());
      dispatch(fetchAssignmentsForce());
      dispatch(fetchPaymentsForce());
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast.error(err.message || 'Failed to save grades');
    } finally {
      setIsSavingGrades(false);
    }
  };

// Handles reset password.
  const handleResetPassword = async () => {
    if (!teacherId || !teacher) return;
    const username = String(teacher.username || '').trim() ||
      (window.prompt('Enter username for password reset') || '').trim();
    if (!username) {
      showToast.error('Username is required to reset the password.');
      return;
    }
    const tempPassword = generateTempPassword();
    setResettingPassword(true);
    try {
      await teacherAPI.setPassword(Number(teacherId), { username, password: tempPassword });
      setResetTempPassword(tempPassword);
      setResetPasswordOpen(true);
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast.error(err.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

// Handles set password.
  const handleSetPassword = async () => {
    if (!teacherId || !teacher) return;
    const username = String(teacher.username || '').trim();
    const password = newPassword.trim();
    if (!username) {
      showToast.error('Username is required to update the password.');
      return;
    }
    if (password.length < 6) {
      showToast.error('Password must be at least 6 characters.');
      return;
    }

    setSettingPassword(true);
    try {
      await teacherAPI.setPassword(Number(teacherId), { username, password });
      setNewPassword('');
      showToast.success('Password updated successfully.');
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast.error(err.message || 'Failed to update password');
    } finally {
      setSettingPassword(false);
    }
  };

// Handles copy temp password.
  const handleCopyTempPassword = async () => {
    if (!resetTempPassword) return;
    try {
      await navigator.clipboard.writeText(resetTempPassword);
      showToast.success('Temporary password copied.');
    } catch {
      showToast.error('Failed to copy password.');
    }
  };

// Handles set payment password (separate login for payments).
  const handleSetPaymentPassword = async () => {
    if (!teacherId || !teacher) return;
    const password = (paymentTempPassword || '').trim();
    if (password.length < 6) {
      showToast.error('Payment password must be at least 6 characters.');
      return;
    }
    setSettingPaymentPassword(true);
    try {
      await teacherAPI.setPaymentPassword(Number(teacherId), { password });
      showToast.success('Payment access password set successfully.');
      setPaymentPasswordOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast.error(err.message || 'Failed to set payment password');
    } finally {
      setSettingPaymentPassword(false);
    }
  };

// Handles copy payment password.
  const handleCopyPaymentPassword = async () => {
    if (!paymentTempPassword) return;
    try {
      await navigator.clipboard.writeText(paymentTempPassword);
      showToast.success('Payment password copied.');
    } catch {
      showToast.error('Failed to copy password.');
    }
  };

// Toggles class expanded.
  const toggleClassExpanded = (classId: number) => {
    setExpandedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-6 text-center">
        <Alert variant="destructive">
          <AlertDescription>Teacher not found</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/teachers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teachers
        </Button>
      </div>
    );
  }

// Returns initials.
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

// Returns status classes.
  const getStatusClasses = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-300';
      case 'on leave': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

// Returns grade badge classes.
  const getGradeBadgeClasses = (letter: string) => {
    switch (letter) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-sky-100 text-sky-800';
      case 'D': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="min-h-full space-y-3 bg-slate-50 p-3 dark:bg-background md:p-4">
      {/* Header */}
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <Button
          size="sm"
          className="h-8 w-fit rounded-lg bg-sky-600 text-xs text-white shadow-sm hover:bg-sky-700"
          onClick={() => navigate('/teachers')}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Teachers
        </Button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 rounded-lg bg-cyan-600 px-2.5 text-xs text-white shadow-sm hover:bg-cyan-700"
            onClick={handleResetPassword}
            disabled={resettingPassword}
          >
            {resettingPassword ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            )}
            Reset Password
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-lg bg-emerald-600 px-2.5 text-xs text-white shadow-sm hover:bg-emerald-700"
            onClick={() => {
              setPaymentTempPassword(generateTempPassword());
              setPaymentPasswordOpen(true);
            }}
          >
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Set Payment Password
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-lg bg-fuchsia-600 px-2.5 text-xs text-white shadow-sm hover:bg-fuchsia-700"
            onClick={handleOpenGradeModal}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Grades
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      {/* Teacher Profile Card */}
      <Card className="overflow-hidden rounded-lg border-0 bg-indigo-600 text-white shadow-sm dark:border dark:border-border dark:bg-slate-950">
        <CardContent className="relative p-0">
          <div className="relative flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/20 text-xl font-bold shadow-inner">
                {getInitials(teacher.first_name, teacher.last_name)}
              </div>
              <div className="min-w-0 space-y-2">
                <div>
                  <p className="text-xs font-semibold text-white/70">Teacher Profile</p>
                  <h1 className="break-words text-xl font-bold tracking-normal text-white md:text-2xl">
                    {teacher.first_name} {teacher.last_name}
                  </h1>
                  {teacher.specialization && <p className="text-xs font-semibold text-white/80">{teacher.specialization}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn('inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-semibold', getStatusClasses(teacher.status))}>
                    {teacher.status}
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                    {teacher.employee_id || 'No employee ID'}
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-fuchsia-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                    Username: {teacher.username || '-'}
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-cyan-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                    Share: {Number(teacher.salary_percentage ?? 50)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:w-[330px]">
              <div className="rounded-lg border border-white/25 bg-blue-600 p-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
                  <BookOpen className="h-3.5 w-3.5" />
                  Classes
                </div>
                <p className="mt-1 text-lg font-bold text-white">{classes.length}</p>
              </div>
              <div className="rounded-lg border border-white/25 bg-emerald-600 p-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
                  <User className="h-3.5 w-3.5" />
                  Students
                </div>
                <p className="mt-1 text-lg font-bold text-white">
                  {teacherStudents.length}
                </p>
              </div>
              {teacher.email && <div className="rounded-lg border border-white/25 bg-cyan-600 p-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-white">{teacher.email}</p>
              </div>}
              {teacher.phone && <div className="rounded-lg border border-white/25 bg-rose-600 p-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-white">{teacher.phone}</p>
              </div>}
              <div className="rounded-lg border border-white/25 bg-fuchsia-600 p-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
                  <Wallet className="h-3.5 w-3.5" />
                  Teacher Share
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-white">{Number(teacher.salary_percentage ?? 50)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardHeader className="p-3 pb-1">
          <CardTitle className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <KeyRound className="h-4 w-4" />
            Account Password
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 p-3 pt-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="teacher-new-password" className="text-xs">New Password</Label>
            <Input
              id="teacher-new-password"
              type="password"
              className="h-8 text-xs"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSetPassword();
              }}
              placeholder="Enter new password"
              disabled={settingPassword}
            />
          </div>
          <Button className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={handleSetPassword} disabled={settingPassword || !newPassword.trim()}>
            {settingPassword ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <KeyRound className="mr-1.5 h-3.5 w-3.5" />}
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Payment Password Dialog */}
      <Dialog open={paymentPasswordOpen} onOpenChange={setPaymentPasswordOpen}>
        <DialogContent className="rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Set Payment Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Alert className="py-3">
              <AlertDescription>
                This password is used for the teacher&apos;s separate Payments login (required to access the Payments tab).
              </AlertDescription>
            </Alert>
            <div className="space-y-1">
              <Label htmlFor="payment-password" className="text-xs">Payment Password</Label>
              <Input
                id="payment-password"
                type="text"
                className="h-8 text-xs"
                value={paymentTempPassword}
                onChange={(e) => setPaymentTempPassword(e.target.value)}
                placeholder="Enter or generate a password"
                disabled={settingPaymentPassword}
              />
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-amber-500 text-xs text-white hover:bg-amber-600"
                  onClick={() => setPaymentTempPassword(generateTempPassword())}
                  disabled={settingPaymentPassword}
                >
                  Generate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-cyan-600 text-xs text-white hover:bg-cyan-700"
                  onClick={handleCopyPaymentPassword}
                  disabled={!paymentTempPassword || settingPaymentPassword}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="h-8 bg-slate-700 text-xs text-white hover:bg-slate-800" onClick={() => setPaymentPasswordOpen(false)} disabled={settingPaymentPassword}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={handleSetPaymentPassword} disabled={settingPaymentPassword}>
              {settingPaymentPassword ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <Tabs value={tabValue} onValueChange={setTabValue}>
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-slate-200 bg-white px-2 py-2 dark:border-border dark:bg-muted/40">
            <TabsTrigger value="info" className="min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground">
              <User className="h-3.5 w-3.5" />
              Information
            </TabsTrigger>
            <TabsTrigger value="classes" className="min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Classes & Students
            </TabsTrigger>
            <TabsTrigger value="assignments" className="min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="tests" className="min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground">
              <FileQuestion className="h-3.5 w-3.5" />
              Tests
            </TabsTrigger>
            <TabsTrigger value="payments" className="min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground">
              <Wallet className="h-3.5 w-3.5" />
              Payments
            </TabsTrigger>
          </TabsList>

          <div className="p-3">
            {/* Tab: Information */}
            <TabsContent value="info">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Card className="h-full rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm text-indigo-700 dark:text-indigo-300">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 p-3 pt-1">
                    <div className="flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-600 text-white"><User className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Username</p>
                        <p className="truncate text-xs font-semibold">{teacher.username || '-'}</p>
                      </div>
                    </div>
                    <div className="flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-600 text-white"><Mail className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Email</p>
                        <p className="break-all text-xs font-semibold">{teacher.email || '-'}</p>
                      </div>
                    </div>
                    <div className="flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white"><Phone className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Phone</p>
                        <p className="truncate text-xs font-semibold">{teacher.phone || '-'}</p>
                      </div>
                    </div>
                    <div className="flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white"><Calendar className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Date of Birth</p>
                        <p className="text-xs font-semibold">
                          {teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="h-full rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm text-emerald-700 dark:text-emerald-300">Professional Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 p-3 pt-1">
                    <div className="flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white"><BadgeCheck className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Employee ID</p>
                        <p className="truncate text-xs font-semibold">{teacher.employee_id || '-'}</p>
                      </div>
                    </div>
                    <div className="flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white"><GraduationCap className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Qualification</p>
                        <p className="truncate text-xs font-semibold">{teacher.qualification || '-'}</p>
                      </div>
                    </div>
                    <div className="flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white"><GraduationCap className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Specialization</p>
                        <p className="truncate text-xs font-semibold">{teacher.specialization || '-'}</p>
                      </div>
                    </div>
                    <div className="flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-600 text-white"><Wallet className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Teacher Share</p>
                        <p className="truncate text-xs font-semibold">{Number(teacher.salary_percentage ?? 50)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Classes & Students */}
            <TabsContent value="classes">
              {studentClassGroups.length === 0 && directAssignedStudents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-16 w-16 mx-auto opacity-30 mb-4" />
                  <h3 className="text-lg font-semibold">No classes or students assigned to this teacher</h3>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentClassGroups.map(({ classId, classItem, students: classStudents, isTeacherOwned }) => {
                    const isExpanded = expandedClassIds.has(classId);
                    return (
                      <div
                        key={classId}
                          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card"
                      >
                        {/* Accordion Header */}
                        <button
                          type="button"
                          onClick={() => toggleClassExpanded(classId)}
                          className="flex w-full items-center gap-2 bg-white p-2.5 text-left transition-colors hover:bg-sky-50 dark:bg-muted/40 dark:hover:bg-muted/60"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="flex-grow">
                            <h3 className="text-sm font-semibold">{classItem.class_name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {isTeacherOwned ? 'Teacher group' : 'Student group'} / Level: {classItem.level || 'N/A'}
                            </p>
                          </div>
                          <Badge className="bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-600">
                            {classStudents.length} Students
                          </Badge>
                          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                        </button>
                        {/* Accordion Content */}
                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-white p-2.5 dark:border-border dark:bg-card">
                            {detailStudentsLoading && classStudents.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">Loading students...</div>
                            ) : classStudents.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">No students in this class</div>
                            ) : (
                              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {classStudents.map((student, index) => (
                                  <div
                                    key={student.student_id || student.id}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70"
                                  >
                                    <div className={cn(
                                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-sm',
                                      index % 4 === 0 && 'bg-sky-600',
                                      index % 4 === 1 && 'bg-emerald-600',
                                      index % 4 === 2 && 'bg-amber-500',
                                      index % 4 === 3 && 'bg-fuchsia-600'
                                    )}>
                                      {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                    </div>
                                    <span className="truncate text-xs font-semibold">
                                      {[student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unnamed student'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {directAssignedStudents.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
                      <div className="flex w-full items-center gap-2 bg-white p-2.5 text-left dark:bg-muted/40">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="text-sm font-semibold">Directly assigned students</h3>
                          <p className="text-xs text-muted-foreground">Students connected to this teacher without a group</p>
                        </div>
                        <Badge className="bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-600">
                          {directAssignedStudents.length} Students
                        </Badge>
                      </div>
                      <div className="border-t border-slate-200 bg-white p-2.5 dark:border-border dark:bg-card">
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {directAssignedStudents.map((student, index) => (
                            <div
                              key={student.student_id || student.id}
                              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70"
                            >
                              <div className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-sm',
                                index % 4 === 0 && 'bg-sky-600',
                                index % 4 === 1 && 'bg-emerald-600',
                                index % 4 === 2 && 'bg-amber-500',
                                index % 4 === 3 && 'bg-fuchsia-600'
                              )}>
                                {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                              </div>
                              <span className="truncate text-xs font-semibold">
                                {[student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unnamed student'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Tab: Assignments */}
            <TabsContent value="assignments">
              <AssignmentSectionTeacher
                assignments={assignments}
                teacherId={teacher?.teacher_id || teacher?.id}
                onRefresh={() => {
                  dispatch(fetchTeachersForce());
                  dispatch(fetchClassesForce());
                  dispatch(fetchStudentsForce());
                  dispatch(fetchSubjectsForce());
                  dispatch(fetchAssignmentsForce());
                  dispatch(fetchPaymentsForce());
                }}
              />
            </TabsContent>

            {/* Tab: Tests */}
            <TabsContent value="tests">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Tests Management</h3>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-8 rounded-lg bg-cyan-600 text-xs text-white hover:bg-cyan-700"
                      onClick={() => navigate('/tests')}
                    >
                      <FileQuestion className="mr-1.5 h-3.5 w-3.5" />
                      View All Tests
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 rounded-lg bg-fuchsia-600 text-xs text-white hover:bg-fuchsia-700"
                      onClick={() => navigate('/tests/create')}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Create New Test
                    </Button>
                  </div>
                </div>
                <Alert className="rounded-lg border-blue-200 bg-blue-50 py-3 text-blue-800">
                  <AlertDescription>
                    Navigate to the Tests section to create, assign, and manage tests for your classes and students.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* Tab: Payments */}
            <TabsContent value="payments">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Wallet className="h-4 w-4 text-indigo-500" />
                    Student Payments
                  </h3>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="payment-month" className="whitespace-nowrap text-xs font-semibold">Select Month:</Label>
                    <div className="relative">
                      <Input
                        id="payment-month"
                        type="month"
                        value={selectedPaymentMonth}
                        onChange={(e) => setSelectedPaymentMonth(e.target.value)}
                        className="h-8 w-[160px] pl-8 text-xs"
                      />
                      <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {studentClassGroups.length === 0 && directAssignedStudents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="h-16 w-16 mx-auto opacity-30 mb-4" />
                    <h3 className="text-lg font-semibold">No classes or students assigned to this teacher</h3>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentClassGroups.map(({ classId, classItem, students: classStudents, isTeacherOwned }) => {
                      return (
                        <div key={classId} className="overflow-hidden rounded-lg border border-slate-200 bg-card text-card-foreground shadow-sm">
                          <div className="relative border-b bg-white p-3 dark:bg-card">
                            <h4 className="relative z-10 flex items-center justify-between text-sm font-bold text-foreground">
                              <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-indigo-600 p-2 text-white shadow-sm">
                                  <BookOpen className="h-4 w-4" />
                                </div>
                                <span>
                                  {classItem.class_name}
                                  <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
                                    ({isTeacherOwned ? 'teacher group' : 'student group'}{classItem.level ? `, level ${classItem.level}` : ''})
                                  </span>
                                </span>
                              </div>
                              <Badge className="border-0 bg-emerald-600 text-xs text-white hover:bg-emerald-600">{classStudents.length} Students</Badge>
                            </h4>
                          </div>
                          <div className="p-0">
                            <Table className="text-xs">
                              <TableHeader className="bg-muted/30">
                                <TableRow className="border-b-border">
                                  <TableHead className="h-8 pl-3 font-semibold text-foreground">Student</TableHead>
                                  <TableHead className="hidden h-8 font-semibold text-foreground sm:table-cell">Enrollment #</TableHead>
                                  <TableHead className="h-8 pr-3 text-right font-semibold text-foreground">Payment Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {classStudents.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">No students</TableCell>
                                  </TableRow>
                                ) : (
                                  classStudents.map((student) => {
                                    const studentId = student.student_id || student.id;
                                    const [year, month] = selectedPaymentMonth.split('-');
                                    const hasPaid = payments.some(p => {
                                      if (p.student_id !== studentId) return false;
                                      if (p.payment_status?.toLowerCase() !== 'completed') return false;
                                      const pDate = new Date(p.payment_date);
                                      return pDate.getFullYear() === parseInt(year) && (pDate.getMonth() + 1) === parseInt(month);
                                    });

                                    return (
                                      <TableRow key={studentId} className="hover:bg-muted/50 transition-colors border-b-border">
                                        <TableCell className="py-2 pl-3 font-medium">
                                          <div className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-sm">
                                              {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                            </div>
                                            <div>
                                              <p>{student.first_name} {student.last_name}</p>
                                              <p className="text-xs text-muted-foreground font-normal sm:hidden">{student.enrollment_number}</p>
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell className="hidden py-2 text-muted-foreground sm:table-cell">{student.enrollment_number}</TableCell>
                                        <TableCell className="py-2 pr-3 text-right">
                                          {hasPaid ? (
                                            <Badge className="border-0 bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-600">
                                              Paid
                                            </Badge>
                                          ) : (
                                            <Badge className="border-0 bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-rose-600">
                                              Unpaid
                                            </Badge>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })}
                    {directAssignedStudents.length > 0 && (
                      <div className="overflow-hidden rounded-lg border border-slate-200 bg-card text-card-foreground shadow-sm">
                        <div className="relative border-b bg-white p-3 dark:bg-card">
                          <h4 className="relative z-10 flex items-center justify-between text-sm font-bold text-foreground">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-emerald-600 p-2 text-white shadow-sm">
                                <User className="h-4 w-4" />
                              </div>
                              <span>Directly assigned students</span>
                            </div>
                            <Badge className="border-0 bg-emerald-600 text-xs text-white hover:bg-emerald-600">{directAssignedStudents.length} Students</Badge>
                          </h4>
                        </div>
                        <div className="p-0">
                          <Table className="text-xs">
                            <TableHeader className="bg-muted/30">
                              <TableRow className="border-b-border">
                                <TableHead className="h-8 pl-3 font-semibold text-foreground">Student</TableHead>
                                <TableHead className="hidden h-8 font-semibold text-foreground sm:table-cell">Enrollment #</TableHead>
                                <TableHead className="h-8 pr-3 text-right font-semibold text-foreground">Payment Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {directAssignedStudents.map((student) => {
                                const studentId = student.student_id || student.id;
                                const [year, month] = selectedPaymentMonth.split('-');
                                const hasPaid = payments.some(p => {
                                  if (p.student_id !== studentId) return false;
                                  if (p.payment_status?.toLowerCase() !== 'completed') return false;
                                  const pDate = new Date(p.payment_date);
                                  return pDate.getFullYear() === parseInt(year) && (pDate.getMonth() + 1) === parseInt(month);
                                });

                                return (
                                  <TableRow key={studentId} className="hover:bg-muted/50 transition-colors border-b-border">
                                    <TableCell className="py-2 pl-3 font-medium">
                                      <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-sm">
                                          {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                        </div>
                                        <div>
                                          <p>{student.first_name} {student.last_name}</p>
                                          <p className="text-xs text-muted-foreground font-normal sm:hidden">{student.enrollment_number}</p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="hidden py-2 text-muted-foreground sm:table-cell">{student.enrollment_number}</TableCell>
                                    <TableCell className="py-2 pr-3 text-right">
                                      {hasPaid ? (
                                        <Badge className="border-0 bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-600">
                                          Paid
                                        </Badge>
                                      ) : (
                                        <Badge className="border-0 bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-rose-600">
                                          Unpaid
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Temporary Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="teacher-temp-password" className="text-xs">Share this password with the teacher.</Label>
            <div className="flex gap-2">
              <Input
                id="teacher-temp-password"
                className="h-8 text-xs"
                value={resetTempPassword}
                readOnly
              />
              <Button size="sm" className="h-8 bg-cyan-600 text-xs text-white hover:bg-cyan-700" onClick={handleCopyTempPassword}>
                Copy
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={() => setResetPasswordOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grade Modal */}
      <Dialog open={isGradeModalOpen} onOpenChange={(open) => { if (!open) handleCloseGradeModal(); }}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto rounded-lg p-0">
          <DialogHeader className="bg-fuchsia-600 p-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold text-white">
                Add Grades to Students
              </DialogTitle>
              <button onClick={handleCloseGradeModal} className="text-white hover:text-white/80">
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Select Class</Label>
                <Select value={String(selectedClassId || '')} onValueChange={(value) => handleClassSelect(Number(value))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.class_id || cls.id} value={String(cls.class_id || cls.id)}>
                        {cls.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Select Subject</Label>
                <Select value={String(selectedSubjectId || '')} onValueChange={(value) => setSelectedSubjectId(Number(value))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.subject_id || subject.id} value={String(subject.subject_id || subject.id)}>
                        {subject.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Select Term</Label>
                <Select value={selectedTerm} onValueChange={(value) => setSelectedTerm(value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1</SelectItem>
                    <SelectItem value="Q2">Q2</SelectItem>
                    <SelectItem value="Q3">Q3</SelectItem>
                    <SelectItem value="Q4">Q4</SelectItem>
                    <SelectItem value="Semester 1">Semester 1</SelectItem>
                    <SelectItem value="Semester 2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedClassId && gradeEntries.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold">Enter Grades for Students</h3>
                <div className="overflow-hidden rounded-lg border">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="h-8 font-semibold">Enrollment #</TableHead>
                        <TableHead className="h-8 font-semibold">Student Name</TableHead>
                        <TableHead className="h-8 font-semibold">Percentage</TableHead>
                        <TableHead className="h-8 font-semibold">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeEntries.map((entry, index) => {
                        const student = teacherStudents.find((s) => (s.student_id || s.id) === entry.student_id);
                        return (
                          <TableRow key={entry.student_id} className="hover:bg-muted/50">
                            <TableCell>{student?.enrollment_number}</TableCell>
                            <TableCell>{student?.first_name} {student?.last_name}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={entry.percentage}
                                onChange={(e) => handlePercentageChange(index, Number(e.target.value))}
                                className="h-8 w-20 text-xs"
                              />
                            </TableCell>
                            <TableCell>
                              <span className={cn('inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold min-w-[2.5rem]', getGradeBadgeClasses(entry.grade_letter))}>
                                {entry.grade_letter}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 pt-0">
            <Button size="sm" className="h-8 rounded-lg bg-slate-700 text-xs text-white hover:bg-slate-800" onClick={handleCloseGradeModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-lg bg-fuchsia-600 px-5 text-xs text-white hover:bg-fuchsia-700"
              onClick={handleSaveGrades}
              disabled={isSavingGrades || !selectedClassId || !selectedSubjectId || gradeEntries.length === 0}
            >
              {isSavingGrades ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Grades'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDetailPage;
