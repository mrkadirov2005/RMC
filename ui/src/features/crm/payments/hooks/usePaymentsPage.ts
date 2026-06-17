import { useState, useEffect, useMemo, useRef } from 'react';
import {
  createPayment,
  deletePayment,
  fetchPayments,
  fetchPaymentsForce,
  updatePayment,
} from '../../../../slices/paymentsSlice';
import { fetchTeachers as fetchTeachersThunk } from '../../../../slices/teachersSlice';
import { fetchClasses as fetchClassesThunk } from '../../../../slices/classesSlice';
import { fetchStudents as fetchStudentsThunk } from '../../../../slices/studentsSlice';
import { fetchCenters as fetchCentersThunk } from '../../../../slices/centersSlice';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  clearPaymentsFilters,
  setPaymentsActiveTab,
  setPaymentsEditingId,
  setPaymentsFilterMethod,
  setPaymentsFilterStatus,
  setPaymentsModalOpen,
  setPaymentsSearchTerm,
  setPaymentsSelectedFolder,
  setPaymentsShowFilters,
} from '../../../../slices/pagesUiSlice';
import type { ViewMode } from '@/components/common/ViewModeToggle';
import {
  selectCenterOptions,
  selectPaymentsHasActiveFilters,
  selectPaymentsPageUi,
  selectStudentOptions,
} from '../../../../store/selectors';
import { getResolvedCenterId } from '../../../../shared/auth/centerScope';
import { paginateItems } from '@/components/common/pagination';
import type { Payment, Teacher, Class, Student, FolderType, TeacherDetailView } from '../types';

const folderPageSizeOptions = [12, 24, 48];
const paymentPageSizeOptions = [10, 25, 50, 100];

export const usePaymentsPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const isTeacher = user?.userType === 'teacher';
  const isOwner = (user?.role || '').toLowerCase() === 'owner';
  const paymentItems = useAppSelector((state) => state.payments.items) as Payment[];
  const paymentsLoading = useAppSelector((state) => state.payments.loading);
  const paymentsError = useAppSelector((state) => state.payments.error);
  const state = { items: paymentItems, loading: paymentsLoading, error: paymentsError };

  const teachers = useAppSelector((state) => state.teachers.items) as Teacher[];
  const classes = useAppSelector((state) => state.classes.items) as Class[];
  const students = useAppSelector((state) => state.students.items) as Student[];
  const studentOptions = useAppSelector(selectStudentOptions);
  const allCenterOptions = useAppSelector(selectCenterOptions);
  const centerOptions = isOwner ? allCenterOptions : [];
  const isLoadingOptions = useAppSelector(
    (state) =>
      state.students.loading || state.teachers.loading || state.classes.loading || (isOwner && state.centers.loading)
  );
  const loadingData = useAppSelector(
    (state) => state.teachers.loading || state.classes.loading || state.students.loading
  );
  const paymentsUi = useAppSelector(selectPaymentsPageUi);
  const {
    activeTab,
    selectedFolder,
    isModalOpen,
    editingId,
    searchTerm,
    filterStatus,
    filterMethod,
    showFilters,
  } = paymentsUi;
  const hasActiveFilters = useAppSelector(selectPaymentsHasActiveFilters);

  const [formData, setFormData] = useState<Partial<Payment>>({
    currency: 'UZS',
    payment_method: 'Cash',
    payment_type: 'Tuition',
    status: 'Completed',
  });
  const [teacherDetailView, setTeacherDetailView] = useState<TeacherDetailView>('groups');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isImporting, setIsImporting] = useState(false);
  const [folderPage, setFolderPage] = useState(1);
  const [folderPageSize, setFolderPageSize] = useState(12);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPageSize, setPaymentsPageSize] = useState(25);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    dispatch(fetchPayments());
    dispatch(fetchTeachersThunk());
    dispatch(fetchClassesThunk());
    dispatch(fetchStudentsThunk());
    if (isOwner) {
      dispatch(fetchCentersThunk());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isOwner]);

  useEffect(() => {
    setFolderPage(1);
  }, [activeTab, searchTerm, selectedFolder?.type, selectedFolder?.id, teacherDetailView, viewMode]);

  useEffect(() => {
    setPaymentsPage(1);
  }, [searchTerm, filterStatus, filterMethod, selectedFolder?.type, selectedFolder?.id]);

  useEffect(() => {
    const handleActiveCenterChanged = () => {
      dispatch(fetchPaymentsForce());
      dispatch(fetchTeachersThunk());
      dispatch(fetchClassesThunk());
      dispatch(fetchStudentsThunk());
      if (isOwner) {
        dispatch(fetchCentersThunk());
      }
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch, isOwner]);

  // --- handlers ---

  const handleOpenModal = (payment?: Payment) => {
    if (user?.userType === 'teacher') {
      return;
    }
    const defaultCenterId = getResolvedCenterId(user) ?? 0;
    if (payment) {
      dispatch(setPaymentsEditingId(payment.payment_id || payment.id || null));
      setFormData({ ...payment, center_id: payment.center_id ?? defaultCenterId });
    } else {
      dispatch(setPaymentsEditingId(null));
      setFormData({
        center_id: defaultCenterId,
        currency: 'UZS',
        payment_method: 'Cash',
        payment_type: 'Tuition',
        status: 'Completed',
      });
    }
    dispatch(setPaymentsModalOpen(true));
  };

  const handleCloseModal = () => {
    dispatch(setPaymentsModalOpen(false));
    dispatch(setPaymentsEditingId(null));
    setFormData({
      center_id: getResolvedCenterId(user) ?? 0,
      currency: 'UZS',
      payment_method: 'Cash',
      payment_type: 'Tuition',
      status: 'Completed',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      center_id: formData.center_id ?? (getResolvedCenterId(user) ?? 0),
    };
    if (editingId) {
      await dispatch(updatePayment({ id: editingId, data: payload }));
    } else {
      await dispatch(createPayment(payload));
    }
    handleCloseModal();
  };

  const handleDelete = async (id: number) => {
    if (user?.userType === 'teacher') {
      return;
    }
    if (window.confirm('Are you sure you want to delete this payment?')) {
      await dispatch(deletePayment(id));
    }
  };

  const handleImportPayments = async (file?: File) => {
    const { importCsvEntity } = await import('@/shared/dataCsv');
    setIsImporting(true);
    const imported = await importCsvEntity('payments', 'Payments', file);
    if (imported) await dispatch(fetchPaymentsForce());
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportPayments = async () => {
    const { exportCsvEntity } = await import('@/shared/dataCsv');
    exportCsvEntity('payments', 'Payments');
  };

  // --- helpers ---

  const getNormalizedStatus = (payment: Payment): string =>
    String(payment.status || payment.payment_status || '').trim().toLowerCase();

  const isPaidPayment = (payment: Payment): boolean => {
    const status = getNormalizedStatus(payment);
    return status === 'completed' || status === 'paid';
  };

  const getPaymentAmount = (payment: Payment): number => Number(payment.amount || 0);

  const getStudentIdsForTeacher = (teacherId: number): number[] => {
    return students
      .filter((s) => Number(s.teacher_id) === Number(teacherId))
      .map((s) => s.student_id || s.id || 0);
  };

  const getStudentIdsForClass = (classId: number): number[] => {
    return students
      .filter((s) => Number(s.class_id) === Number(classId))
      .map((s) => s.student_id || s.id || 0);
  };

  const getPaymentsForTeacher = (teacherId: number): Payment[] => {
    const studentIds = new Set(getStudentIdsForTeacher(teacherId).map((id) => Number(id)));
    return state.items.filter(
      (payment) =>
        Number(payment.student_teacher_id || 0) === Number(teacherId) || studentIds.has(Number(payment.student_id))
    );
  };

  const getPaymentsForClass = (classId: number): Payment[] => {
    const studentIds = new Set(getStudentIdsForClass(classId).map((id) => Number(id)));
    return state.items.filter(
      (payment) =>
        Number(payment.student_class_id || 0) === Number(classId) || studentIds.has(Number(payment.student_id))
    );
  };

  const getTeacherPaymentStats = (teacherId: number) => {
    const studentIds = getStudentIdsForTeacher(teacherId);
    const payments = getPaymentsForTeacher(teacherId);
    const paidPayments = payments.filter(isPaidPayment);
    const unpaidPayments = payments.filter((payment) => !isPaidPayment(payment));

    const paidStudentIdSet = new Set<number>();
    paidPayments.forEach((payment) => paidStudentIdSet.add(Number(payment.student_id)));

    return {
      totalStudents: studentIds.length,
      paidStudents: paidStudentIdSet.size,
      unpaidStudents: Math.max(studentIds.length - paidStudentIdSet.size, 0),
      paymentCount: payments.length,
      totalWorked: payments.reduce((sum, payment) => sum + getPaymentAmount(payment), 0),
      paidAmount: paidPayments.reduce((sum, payment) => sum + getPaymentAmount(payment), 0),
      unpaidAmount: unpaidPayments.reduce((sum, payment) => sum + getPaymentAmount(payment), 0),
    };
  };

  const getPaymentCountForTeacher = (teacherId: number): number => {
    return getPaymentsForTeacher(teacherId).length;
  };

  const getPaymentCountForClass = (classId: number): number => {
    return getPaymentsForClass(classId).length;
  };

  const getTotalAmountForClass = (classId: number): number => {
    return getPaymentsForClass(classId)
      .filter(isPaidPayment)
      .reduce((sum, payment) => sum + getPaymentAmount(payment), 0);
  };

  const getPaymentCountForStudent = (studentId: number): number => {
    return state.items.filter((p) => p.student_id === studentId).length;
  };

  const getTotalAmountForStudent = (studentId: number): number => {
    return state.items
      .filter((p) => Number(p.student_id) === Number(studentId) && isPaidPayment(p))
      .reduce((sum, payment) => sum + getPaymentAmount(payment), 0);
  };

  // --- memos ---

  const selectedFolderStudentIds = useMemo(() => {
    if (!selectedFolder) return [];
    if (selectedFolder.type === 'teacher') return getStudentIdsForTeacher(selectedFolder.id);
    if (selectedFolder.type === 'class') return getStudentIdsForClass(selectedFolder.id);
    return [selectedFolder.id];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, students]);

  const selectedFolderPayments = useMemo(() => {
    if (!selectedFolder) return state.items;
    if (selectedFolder.type === 'teacher') return getPaymentsForTeacher(selectedFolder.id);
    if (selectedFolder.type === 'class') return getPaymentsForClass(selectedFolder.id);
    const idSet = new Set(selectedFolderStudentIds.map((id) => Number(id)));
    return state.items.filter((payment) => idSet.has(Number(payment.student_id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, selectedFolderStudentIds, state.items]);

  const teacherOverallStats = useMemo(
    () =>
      teachers
        .map((teacher) => {
          const teacherId = teacher.teacher_id || teacher.id || 0;
          const stats = getTeacherPaymentStats(teacherId);
          return { teacher, teacherId, stats };
        })
        .sort((a, b) => b.stats.totalWorked - a.stats.totalWorked),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teachers, students, state.items]
  );

  const rootSearch = searchTerm.trim().toLowerCase();

  const filteredRootStudents = useMemo(() => {
    if (!rootSearch) return students;
    return students.filter((student) =>
      [
        `${student.first_name || ''} ${student.last_name || ''}`,
        student.first_name,
        student.last_name,
        student.student_id,
        student.id,
      ]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(rootSearch))
    );
  }, [rootSearch, students]);

  const filteredRootClasses = useMemo(() => {
    if (!rootSearch) return classes;
    return classes.filter((cls) =>
      [cls.class_name, cls.class_code, cls.level, cls.class_id, cls.id]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(rootSearch))
    );
  }, [classes, rootSearch]);

  const filteredRootTeachers = useMemo(() => {
    if (!rootSearch) return teachers;
    return teachers.filter((teacher) =>
      [
        `${teacher.first_name || ''} ${teacher.last_name || ''}`,
        teacher.first_name,
        teacher.last_name,
        teacher.employee_id,
        teacher.teacher_id,
        teacher.id,
      ]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(rootSearch))
    );
  }, [rootSearch, teachers]);

  const filteredTeacherOverallStats = useMemo(() => {
    if (!rootSearch) return teacherOverallStats;
    const teacherIds = new Set(filteredRootTeachers.map((teacher) => Number(teacher.teacher_id || teacher.id)));
    return teacherOverallStats.filter(({ teacherId }) => teacherIds.has(Number(teacherId)));
  }, [filteredRootTeachers, rootSearch, teacherOverallStats]);

  const paginatedRootStudents = useMemo(
    () => paginateItems(filteredRootStudents, folderPage, folderPageSize),
    [filteredRootStudents, folderPage, folderPageSize]
  );

  const paginatedRootClasses = useMemo(
    () => paginateItems(filteredRootClasses, folderPage, folderPageSize),
    [filteredRootClasses, folderPage, folderPageSize]
  );

  const paginatedRootTeachers = useMemo(
    () => paginateItems(filteredRootTeachers, folderPage, folderPageSize),
    [filteredRootTeachers, folderPage, folderPageSize]
  );

  const selectedTeacherClasses = useMemo(() => {
    if (!selectedFolder || selectedFolder.type !== 'teacher') return [];
    return classes.filter((cls) => Number(cls.teacher_id) === Number(selectedFolder.id));
  }, [selectedFolder, classes]);

  const paginatedSelectedTeacherClasses = useMemo(
    () => paginateItems(selectedTeacherClasses, folderPage, folderPageSize),
    [selectedTeacherClasses, folderPage, folderPageSize]
  );

  const selectedTeacherStats = useMemo(() => {
    if (!selectedFolder || selectedFolder.type !== 'teacher') return null;
    return getTeacherPaymentStats(selectedFolder.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, students, state.items]);

  const selectedTeacherProgress = useMemo(() => {
    if (!selectedTeacherStats) {
      return { paidPercent: 0, unpaidPercent: 0 };
    }
    const total = selectedTeacherStats.paidAmount + selectedTeacherStats.unpaidAmount;
    if (total <= 0) {
      return { paidPercent: 0, unpaidPercent: 0 };
    }
    const paidPercent = Math.round((selectedTeacherStats.paidAmount / total) * 100);
    return {
      paidPercent,
      unpaidPercent: Math.max(100 - paidPercent, 0),
    };
  }, [selectedTeacherStats]);

  const overallPaymentStats = useMemo(() => {
    const totalPayments = state.items.length;
    const paidPayments = state.items.filter(isPaidPayment);
    const unpaidPayments = state.items.filter((payment) => !isPaidPayment(payment));
    const totalAmount = state.items.reduce((sum, payment) => sum + getPaymentAmount(payment), 0);
    const paidAmount = paidPayments.reduce((sum, payment) => sum + getPaymentAmount(payment), 0);
    const unpaidAmount = unpaidPayments.reduce((sum, payment) => sum + getPaymentAmount(payment), 0);
    const paidPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

    return {
      totalPayments,
      totalAmount,
      paidAmount,
      unpaidAmount,
      paidPercent,
      unpaidPercent: Math.max(100 - paidPercent, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.items]);

  const displayedPayments = useMemo(() => {
    let payments = [...selectedFolderPayments];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      payments = payments.filter((p) => {
        const student = students.find((s) => (s.student_id || s.id) === p.student_id);
        const studentName = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return (
          studentName.includes(search) ||
          (p.receipt_number && p.receipt_number.toLowerCase().includes(search)) ||
          (p.reference_number && p.reference_number.toLowerCase().includes(search))
        );
      });
    }

    if (filterStatus) {
      payments = payments.filter((p) => (p.status || p.payment_status) === filterStatus);
    }

    if (filterMethod) {
      payments = payments.filter((p) => p.payment_method === filterMethod);
    }

    return payments;
  }, [searchTerm, filterStatus, filterMethod, selectedFolderPayments, students]);

  const paginatedDisplayedPayments = useMemo(
    () => paginateItems(displayedPayments, paymentsPage, paymentsPageSize),
    [displayedPayments, paymentsPage, paymentsPageSize]
  );

  const totalAmount = displayedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const displayedPaidAmount = displayedPayments
    .filter(isPaidPayment)
    .reduce((sum, p) => sum + getPaymentAmount(p), 0);
  const displayedPendingAmount = Math.max(totalAmount - displayedPaidAmount, 0);

  const folderGridClass =
    viewMode === 'list'
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'
      : viewMode === 'compact'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3'
        : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';

  const clearFilters = () => {
    dispatch(clearPaymentsFilters());
  };

  const handleFolderClick = (type: FolderType, id: number, name: string) => {
    dispatch(setPaymentsSelectedFolder({ type, id, name }));
    if (type === 'teacher') {
      setTeacherDetailView('groups');
    }
    clearFilters();
  };

  const handleBackToFolders = () => {
    dispatch(setPaymentsSelectedFolder(null));
    setTeacherDetailView('groups');
    clearFilters();
  };

  const getStudentName = (studentId: number): string => {
    const student = students.find((s) => (s.student_id || s.id) === studentId);
    if (student) return `${student.first_name} ${student.last_name}`;
    const payment = state.items.find((p) => Number(p.student_id) === Number(studentId));
    const fallbackName = `${payment?.student_first_name || ''} ${payment?.student_last_name || ''}`.trim();
    return fallbackName || 'Unknown Student';
  };

  const getStatusBadgeClasses = (status: string): string => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return {
    // dispatch helpers
    dispatch,
    setPaymentsSearchTerm,
    setPaymentsActiveTab,
    setPaymentsFilterStatus,
    setPaymentsFilterMethod,
    setPaymentsShowFilters,

    // auth / role
    isTeacher,
    isOwner,
    user,

    // raw data
    state,
    teachers,
    classes,
    students,

    // UI state
    activeTab,
    selectedFolder,
    isModalOpen,
    editingId,
    searchTerm,
    filterStatus,
    filterMethod,
    showFilters,
    hasActiveFilters,
    formData,
    setFormData,
    teacherDetailView,
    setTeacherDetailView,
    viewMode,
    setViewMode,
    isImporting,
    fileInputRef,
    folderPage,
    setFolderPage,
    folderPageSize,
    setFolderPageSize,
    paymentsPage,
    setPaymentsPage,
    paymentsPageSize,
    setPaymentsPageSize,

    // options
    studentOptions,
    centerOptions,
    isLoadingOptions,
    loadingData,

    // handlers
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handleImportPayments,
    handleExportPayments,
    handleFolderClick,
    handleBackToFolders,
    clearFilters,

    // computed helpers
    getPaymentCountForTeacher,
    getPaymentCountForClass,
    getPaymentCountForStudent,
    getTotalAmountForClass,
    getTotalAmountForStudent,
    getTeacherPaymentStats,
    getStudentName,
    getStatusBadgeClasses,

    // memos
    overallPaymentStats,
    selectedFolderPayments,
    teacherOverallStats,
    filteredRootStudents,
    filteredRootClasses,
    filteredRootTeachers,
    filteredTeacherOverallStats,
    paginatedRootStudents,
    paginatedRootClasses,
    paginatedRootTeachers,
    selectedTeacherClasses,
    paginatedSelectedTeacherClasses,
    selectedTeacherStats,
    selectedTeacherProgress,
    displayedPayments,
    paginatedDisplayedPayments,
    totalAmount,
    displayedPaidAmount,
    displayedPendingAmount,

    // layout
    folderGridClass,
    folderPageSizeOptions,
    paymentPageSizeOptions,
  };
};

export type UsePaymentsPageReturn = ReturnType<typeof usePaymentsPage>;
