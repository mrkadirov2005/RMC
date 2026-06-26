import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gradeAPI, studentAPI, teacherAPI } from '@/shared/api/api';
import { showToast } from '@/utils/toast';
import { generateTempPassword } from '@/utils/password';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchTeachers, fetchTeachersForce } from '@/slices/teachersSlice';
import { fetchClasses, fetchClassesForce } from '@/slices/classesSlice';
import { fetchStudents, fetchStudentsForce } from '@/slices/studentsSlice';
import { fetchSubjects, fetchSubjectsForce } from '@/slices/subjectsSlice';
import { fetchAssignments, fetchAssignmentsForce } from '@/slices/assignmentsSlice';
import { fetchPayments, fetchPaymentsForce } from '@/slices/paymentsSlice';
import {
  calculateGradeLetter,
  compareStudentsByName,
  getGradeBadgeClasses,
  getTeacherInitials,
  getTeacherStatusClasses,
  type GradeEntry,
  type TeacherStudent,
} from '../utils/teacherDetailUtils';

export const useTeacherDetailPage = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const teacher = useAppSelector((state) =>
    state.teachers.items.find((item) => String(item.teacher_id || item.id) === String(teacherId))
  );
  const allClasses = useAppSelector((state) => state.classes.items);
  const classes = useAppSelector((state) =>
    state.classes.items.filter((classItem) => String(classItem.teacher_id) === String(teacherId))
  );
  const storeStudents = useAppSelector((state) => state.students.items as TeacherStudent[]);
  const subjects = useAppSelector((state) =>
    state.subjects.items.filter((subject) => classes.some((classItem) => (classItem.class_id || classItem.id) === subject.class_id))
  );
  const assignments = useAppSelector((state) =>
    state.assignments.items.filter((assignment) => String(assignment.teacher_id) === String(teacherId))
  );
  const payments = useAppSelector((state) => state.payments.items);
  const loading = useAppSelector((state) =>
    state.teachers.loading ||
    state.classes.loading ||
    state.students.loading ||
    state.subjects.loading ||
    state.assignments.loading ||
    state.payments.loading
  );
  const error = useAppSelector((state) =>
    state.teachers.error ||
    state.classes.error ||
    state.students.error ||
    state.subjects.error ||
    state.assignments.error ||
    state.payments.error
  );

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
    () => new Set(classes.map((classItem) => Number(classItem.class_id || classItem.id)).filter(Boolean)),
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
  const teacherStudents = useMemo(
    () =>
      studentsSource.filter((student) =>
        Number(student.teacher_id) === teacherIdNum ||
        (student.class_id != null && teacherClassIds.has(Number(student.class_id)))
      ),
    [studentsSource, teacherClassIds, teacherIdNum]
  );
  const directAssignedStudents = useMemo(
    () =>
      teacherStudents
        .filter((student) => Number(student.teacher_id) === teacherIdNum && !student.class_id)
      .sort(compareStudentsByName),
    [teacherIdNum, teacherStudents]
  );
  const classStudentsByClassId = useMemo(() => {
    const map = new Map<number, TeacherStudent[]>();
    for (const student of teacherStudents) {
      const classId = Number(student.class_id);
      if (!classId) continue;
      if (!map.has(classId)) map.set(classId, []);
      map.get(classId)?.push(student);
    }
    for (const list of map.values()) {
      list.sort(compareStudentsByName);
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
        const classItem = classById.get(classId) || fallbackClass || { class_id: classId, class_name: `Group #${classId}`, level: null };
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

  const handleRefreshAll = () => {
    const teacherStudentParams = { teacher_id: Number(teacherId), page: 1, limit: 100 };
    dispatch(fetchTeachersForce());
    dispatch(fetchClassesForce());
    dispatch(fetchStudentsForce(teacherStudentParams));
    dispatch(fetchSubjectsForce());
    dispatch(fetchAssignmentsForce());
    dispatch(fetchPaymentsForce());
  };

  useEffect(() => {
    const teacherStudentParams = { teacher_id: Number(teacherId), page: 1, limit: 100 };
    dispatch(fetchTeachers());
    dispatch(fetchClasses());
    dispatch(fetchStudents(teacherStudentParams));
    dispatch(fetchSubjects());
    dispatch(fetchAssignments());
    dispatch(fetchPayments());
  }, [dispatch, teacherId]);

  useEffect(() => {
    let cancelled = false;
    setDetailStudentsLoading(true);
    studentAPI.getAll({ teacher_id: Number(teacherId), page: 1, limit: 100 })
      .then((response) => {
        const payload = (response as any).data ?? response;
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        if (!cancelled) setDetailStudents(rows);
      })
      .catch((error) => {
        console.error('Error loading all students for teacher detail:', error);
        if (!cancelled) setDetailStudents([]);
      })
      .finally(() => {
        if (!cancelled) setDetailStudentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  const getStudentsByClass = (classId: number | undefined) =>
    classId ? classStudentsByClassId.get(Number(classId)) || [] : [];

  const handleOpenGradeModal = () => {
    setSelectedClassId(null);
    setSelectedSubjectId(null);
    setSelectedTerm('Q1');
    setGradeEntries([]);
    setIsGradeModalOpen(true);
  };

  const handleCloseGradeModal = () => {
    setIsGradeModalOpen(false);
    setSelectedClassId(null);
    setSelectedSubjectId(null);
    setGradeEntries([]);
  };

  const handleClassSelect = (classId: number) => {
    setSelectedClassId(classId);
    setGradeEntries(
      getStudentsByClass(classId).map((student) => ({
        student_id: student.student_id || student.id || 0,
        percentage: 0,
        grade_letter: 'F',
      }))
    );
  };

  const handlePercentageChange = (index: number, percentage: number) => {
    const nextEntries = [...gradeEntries];
    nextEntries[index].percentage = percentage;
    nextEntries[index].grade_letter = calculateGradeLetter(percentage);
    setGradeEntries(nextEntries);
  };

  const handleSaveGrades = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      showToast.error('Please select class and subject');
      return;
    }

    setIsSavingGrades(true);
    try {
      const subjectIdNum = Number(selectedSubjectId);
      await Promise.all(
        gradeEntries.map((entry) =>
          gradeAPI.create({
            student_id: entry.student_id,
            teacher_id: teacherIdNum,
            subject: subjectIdNum,
            percentage: entry.percentage,
            grade_letter: entry.grade_letter,
            term: selectedTerm,
          })
        )
      );
      showToast.success('Grades saved successfully');
      handleCloseGradeModal();
      handleRefreshAll();
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast.error(err.message || 'Failed to save grades');
    } finally {
      setIsSavingGrades(false);
    }
  };

  const handleResetPassword = async () => {
    if (!teacherId || !teacher) return;
    const username = String(teacher.username || '').trim() || (window.prompt('Enter username for password reset') || '').trim();
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

  const handleCopyTempPassword = async () => {
    if (!resetTempPassword) return;
    try {
      await navigator.clipboard.writeText(resetTempPassword);
      showToast.success('Temporary password copied.');
    } catch {
      showToast.error('Failed to copy password.');
    }
  };

  const handleSetPaymentPassword = async () => {
    if (!teacherId || !teacher) return;
    const password = paymentTempPassword.trim();
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

  const handleCopyPaymentPassword = async () => {
    if (!paymentTempPassword) return;
    try {
      await navigator.clipboard.writeText(paymentTempPassword);
      showToast.success('Payment password copied.');
    } catch {
      showToast.error('Failed to copy password.');
    }
  };

  const toggleClassExpanded = (classId: number) => {
    setExpandedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  };

  return {
    navigate,
    teacher,
    classes,
    subjects,
    assignments,
    payments,
    loading,
    error,
    isGradeModalOpen,
    setIsGradeModalOpen,
    selectedClassId,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedTerm,
    setSelectedTerm,
    gradeEntries,
    isSavingGrades,
    tabValue,
    setTabValue,
    expandedClassIds,
    resetPasswordOpen,
    setResetPasswordOpen,
    resetTempPassword,
    resettingPassword,
    newPassword,
    setNewPassword,
    settingPassword,
    paymentPasswordOpen,
    setPaymentPasswordOpen,
    paymentTempPassword,
    setPaymentTempPassword,
    settingPaymentPassword,
    selectedPaymentMonth,
    setSelectedPaymentMonth,
    detailStudentsLoading,
    teacherStudents,
    directAssignedStudents,
    studentClassGroups,
    handleRefreshAll,
    handleOpenGradeModal,
    handleCloseGradeModal,
    handleClassSelect,
    handlePercentageChange,
    handleSaveGrades,
    handleResetPassword,
    handleSetPassword,
    handleCopyTempPassword,
    handleSetPaymentPassword,
    handleCopyPaymentPassword,
    toggleClassExpanded,
    getInitials: getTeacherInitials,
    getStatusClasses: getTeacherStatusClasses,
    getGradeBadgeClasses,
  };
};
