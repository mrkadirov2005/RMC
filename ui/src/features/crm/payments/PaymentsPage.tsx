// Page component for the payments screen in the crm feature.

import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, X, ArrowLeft, Folder, Search, Filter, User, BookOpen, Plus, DollarSign, CreditCard, Users, Loader2, BarChart3 } from 'lucide-react';
import {
  createPayment,
  deletePayment,
  fetchPayments,
  fetchPaymentsForce,
  updatePayment,
} from '../../../slices/paymentsSlice';
import { fetchTeachers as fetchTeachersThunk } from '../../../slices/teachersSlice';
import { fetchClasses as fetchClassesThunk } from '../../../slices/classesSlice';
import { fetchStudents as fetchStudentsThunk } from '../../../slices/studentsSlice';
import { fetchCenters as fetchCentersThunk } from '../../../slices/centersSlice';
import { useAppDispatch, useAppSelector } from '../hooks';
import { initializePaymentAccess, paymentLogout } from '../../../slices/paymentAccessSlice';
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
} from '../../../slices/pagesUiSlice';
import { getStoredPaymentAuth } from '../../../shared/auth/paymentAuthStorage';
import { PaymentAccessGate } from './components/PaymentAccessGate';
import { SelectField } from '../students/components/SelectField';
import { paymentMethodOptions, paymentStatusOptions, paymentTypeOptions } from '../../../utils/dropdownOptions';
import {
  selectCenterOptions,
  selectPaymentsHasActiveFilters,
  selectPaymentsPageUi,
  selectStudentOptions,
} from '../../../store/selectors';
import { getResolvedCenterId } from '../../../shared/auth/centerScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Payment {
  payment_id?: number;
  id?: number;
  student_id: number;
  center_id?: number;
  payment_date?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  payment_type?: string;
  status?: string;
  payment_status?: string;
  receipt_number?: string;
  reference_number?: string;
  notes?: string;
}

interface Teacher {
  teacher_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
  teacher_id?: number;
}

interface Student {
  student_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  class_id?: number;
  teacher_id?: number;
}

type FolderType = 'teacher' | 'class' | 'student';
type TeacherDetailView = 'groups' | 'total';

// Renders the payments page screen.
const PaymentsPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const paymentAccess = useAppSelector((state) => state.paymentAccess);
  const isTeacher = user?.userType === 'teacher';
// Handles is owner.
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
    currency: 'USD',
    payment_method: 'Cash',
    payment_type: 'Tuition',
    status: 'Completed',
  });
  const [teacherDetailView, setTeacherDetailView] = useState<TeacherDetailView>('groups');

// Runs side effects for this component.
  useEffect(() => {
    dispatch(initializePaymentAccess());
  }, [dispatch]);

// Runs side effects for this component.
  useEffect(() => {
    if (paymentAccess.isAuthenticated && !getStoredPaymentAuth().token) {
      dispatch(paymentLogout());
    }
  }, [paymentAccess.isAuthenticated, dispatch]);

// Runs side effects for this component.
  useEffect(() => {
    const isTeacher = user?.userType === 'teacher';
    if (isTeacher && !paymentAccess.isAuthenticated) {
      return;
    }
    dispatch(fetchPayments());
    dispatch(fetchTeachersThunk());
    dispatch(fetchClassesThunk());
    dispatch(fetchStudentsThunk());
    if (isOwner) {
      dispatch(fetchCentersThunk());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userType, paymentAccess.isAuthenticated, isOwner]);

// Runs side effects for this component.
  useEffect(() => {
// Handles active center changed.
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

// Handles open modal.
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
        currency: 'USD',
        payment_method: 'Cash',
        payment_type: 'Tuition',
        status: 'Completed',
      });
    }
    dispatch(setPaymentsModalOpen(true));
  };

// Handles close modal.
  const handleCloseModal = () => {
    dispatch(setPaymentsModalOpen(false));
    dispatch(setPaymentsEditingId(null));
    setFormData({
      center_id: getResolvedCenterId(user) ?? 0,
      currency: 'USD',
      payment_method: 'Cash',
      payment_type: 'Tuition',
      status: 'Completed',
    });
  };

// Handles submit.
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

// Handles delete.
  const handleDelete = async (id: number) => {
    if (user?.userType === 'teacher') {
      return;
    }
    if (window.confirm('Are you sure you want to delete this payment?')) {
      await dispatch(deletePayment(id));
    }
  };

// Returns normalized status.
  const getNormalizedStatus = (payment: Payment): string =>
    String(payment.status || payment.payment_status || '').trim().toLowerCase();

// Handles is paid payment.
  const isPaidPayment = (payment: Payment): boolean => {
    const status = getNormalizedStatus(payment);
    return status === 'completed' || status === 'paid';
  };

// Returns payment amount.
  const getPaymentAmount = (payment: Payment): number => Number(payment.amount || 0);

  // Get student IDs for a teacher
  const getStudentIdsForTeacher = (teacherId: number): number[] => {
    return students
      .filter((s) => Number(s.teacher_id) === Number(teacherId))
      .map((s) => s.student_id || s.id || 0);
  };

  // Get student IDs for a class
  const getStudentIdsForClass = (classId: number): number[] => {
    return students
      .filter((s) => Number(s.class_id) === Number(classId))
      .map((s) => s.student_id || s.id || 0);
  };

// Returns payments for student ids.
  const getPaymentsForStudentIds = (studentIds: number[]): Payment[] => {
    const idSet = new Set(studentIds.map((id) => Number(id)));
    return state.items.filter((payment) => idSet.has(Number(payment.student_id)));
  };

// Returns teacher payment stats.
  const getTeacherPaymentStats = (teacherId: number) => {
    const studentIds = getStudentIdsForTeacher(teacherId);
    const payments = getPaymentsForStudentIds(studentIds);
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

  // Get payments count for teacher
  const getPaymentCountForTeacher = (teacherId: number): number => {
    const studentIds = getStudentIdsForTeacher(teacherId);
    return getPaymentsForStudentIds(studentIds).length;
  };

  // Get payments count for class
  const getPaymentCountForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    return state.items.filter((p) => studentIds.includes(p.student_id)).length;
  };

  // Get total amount for class
  const getTotalAmountForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    return getPaymentsForStudentIds(studentIds)
      .filter(isPaidPayment)
      .reduce((sum, payment) => sum + getPaymentAmount(payment), 0);
  };

  // Get payments count for student
  const getPaymentCountForStudent = (studentId: number): number => {
    return state.items.filter((p) => p.student_id === studentId).length;
  };

  // Get total amount for student
  const getTotalAmountForStudent = (studentId: number): number => {
    return state.items
      .filter((p) => Number(p.student_id) === Number(studentId) && isPaidPayment(p))
      .reduce((sum, payment) => sum + getPaymentAmount(payment), 0);
  };

// Memoizes the selected folder student ids derived value.
  const selectedFolderStudentIds = useMemo(() => {
    if (!selectedFolder) return [];
    if (selectedFolder.type === 'teacher') return getStudentIdsForTeacher(selectedFolder.id);
    if (selectedFolder.type === 'class') return getStudentIdsForClass(selectedFolder.id);
    return [selectedFolder.id];
  }, [selectedFolder, students]);

// Memoizes the selected folder payments derived value.
  const selectedFolderPayments = useMemo(() => {
    if (!selectedFolder) return state.items;
    const idSet = new Set(selectedFolderStudentIds.map((id) => Number(id)));
    return state.items.filter((payment) => idSet.has(Number(payment.student_id)));
  }, [selectedFolder, selectedFolderStudentIds, state.items]);

// Memoizes the teacher overall stats derived value.
  const teacherOverallStats = useMemo(
    () =>
      teachers
        .map((teacher) => {
          const teacherId = teacher.teacher_id || teacher.id || 0;
          const stats = getTeacherPaymentStats(teacherId);
          return { teacher, teacherId, stats };
        })
        .sort((a, b) => b.stats.totalWorked - a.stats.totalWorked),
    [teachers, students, state.items]
  );

// Memoizes the selected teacher classes derived value.
  const selectedTeacherClasses = useMemo(() => {
    if (!selectedFolder || selectedFolder.type !== 'teacher') return [];
    return classes.filter((cls) => Number(cls.teacher_id) === Number(selectedFolder.id));
  }, [selectedFolder, classes]);

// Memoizes the selected teacher stats derived value.
  const selectedTeacherStats = useMemo(() => {
    if (!selectedFolder || selectedFolder.type !== 'teacher') return null;
    return getTeacherPaymentStats(selectedFolder.id);
  }, [selectedFolder, students, state.items]);

// Memoizes the selected teacher progress derived value.
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

// Memoizes the overall payment stats derived value.
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
  }, [state.items]);

  const pageTitle = !selectedFolder
    ? 'Payments Management'
    : selectedFolder.type === 'teacher'
      ? `${selectedFolder.name} - ${teacherDetailView === 'groups' ? 'Groups' : 'Total'}`
      : `${selectedFolder.name} - Payments`;

  // Apply search and filters
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

  const totalAmount = displayedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

// Handles clear filters.
  const clearFilters = () => {
    dispatch(clearPaymentsFilters());
  };

// Handles folder click.
  const handleFolderClick = (type: FolderType, id: number, name: string) => {
    dispatch(setPaymentsSelectedFolder({ type, id, name }));
    if (type === 'teacher') {
      setTeacherDetailView('groups');
    }
    clearFilters();
  };

// Handles back to folders.
  const handleBackToFolders = () => {
    dispatch(setPaymentsSelectedFolder(null));
    setTeacherDetailView('groups');
    clearFilters();
  };

// Returns student name.
  const getStudentName = (studentId: number): string => {
    const student = students.find((s) => (s.student_id || s.id) === studentId);
    return student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
  };

// Returns status badge classes.
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

  if (isTeacher && !paymentAccess.isAuthenticated) {
    return <PaymentAccessGate />;
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {selectedFolder && (
            <Button variant="outline" size="sm" onClick={handleBackToFolders}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
        </div>
        {!isTeacher && (
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" /> Add Payment
          </Button>
        )}
      </div>

      {isTeacher && (
        <Alert className="mb-4">
          <AlertDescription>
            Teacher view is limited to payment status only.
          </AlertDescription>
        </Alert>
      )}

      {state.error && (
        <Alert className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {!selectedFolder ? (
        <>
          {/* Tab Navigation */}
          <div className="border-b border-border mb-6">
            <div className="flex space-x-1">
              <Button
                variant={activeTab === 'students' ? 'default' : 'ghost'}
                onClick={() => dispatch(setPaymentsActiveTab('students'))}
                className="rounded-b-none"
              >
                <Users className="h-4 w-4 mr-2" />
                By Students
              </Button>
              <Button
                variant={activeTab === 'classes' ? 'default' : 'ghost'}
                onClick={() => dispatch(setPaymentsActiveTab('classes'))}
                className="rounded-b-none"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                By Classes
              </Button>
              <Button
                variant={activeTab === 'teachers' ? 'default' : 'ghost'}
                onClick={() => dispatch(setPaymentsActiveTab('teachers'))}
                className="rounded-b-none"
              >
                <User className="h-4 w-4 mr-2" />
                By Teachers
              </Button>
              {!isTeacher && (
                <Button
                  variant={activeTab === 'statistics' ? 'default' : 'ghost'}
                  onClick={() => dispatch(setPaymentsActiveTab('statistics'))}
                  className="rounded-b-none"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Statistics
                </Button>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {/* By Students Tab */}
            {activeTab === 'students' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingData ? (
                  <div className="col-span-full text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading students...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground">No students found</p>
                  </div>
                ) : (
                  students.map((student) => {
                    const studentId = student.student_id || student.id || 0;
                    const paymentCount = getPaymentCountForStudent(studentId);
                    const totalAmount = getTotalAmountForStudent(studentId);
                    return (
                      <Card
                        key={studentId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleFolderClick('student', studentId, `${student.first_name} ${student.last_name}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Folder className="h-9 w-9 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold">{student.first_name} {student.last_name}</h3>
                            <p className="text-sm text-muted-foreground">ID: {studentId}</p>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>{paymentCount} payments</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>${totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* By Classes Tab */}
            {activeTab === 'classes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingData ? (
                  <div className="col-span-full text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading classes...</p>
                  </div>
                ) : classes.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground">No classes found</p>
                  </div>
                ) : (
                  classes.map((cls) => {
                    const classId = cls.class_id || cls.id || 0;
                    const paymentCount = getPaymentCountForClass(classId);
                    const totalAmount = getTotalAmountForClass(classId);
                    return (
                      <Card
                        key={classId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleFolderClick('class', classId, cls.class_name)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Folder className="h-9 w-9 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold">{cls.class_name}</h3>
                            <p className="text-sm text-muted-foreground">{cls.class_code} • Level {cls.level}</p>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>{paymentCount} payments</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>${totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* By Teachers Tab */}
            {activeTab === 'teachers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingData ? (
                  <div className="col-span-full text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading teachers...</p>
                  </div>
                ) : teachers.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground">No teachers found</p>
                  </div>
                ) : (
                  teachers.map((teacher) => {
                    const teacherId = teacher.teacher_id || teacher.id || 0;
                    const paymentCount = getPaymentCountForTeacher(teacherId);
                    const teacherStats = getTeacherPaymentStats(teacherId);
                    return (
                      <Card
                        key={teacherId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleFolderClick('teacher', teacherId, `${teacher.first_name} ${teacher.last_name}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Folder className="h-9 w-9 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold">{teacher.first_name} {teacher.last_name}</h3>
                            <p className="text-sm text-muted-foreground">{teacher.employee_id}</p>
                          </div>
                          {isTeacher ? (
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Users className="h-3.5 w-3.5" />
                                <span>{teacherStats.totalStudents} students</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                                <CreditCard className="h-3.5 w-3.5" />
                                <span>{paymentCount} payments</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t text-xs">
                                <div className="rounded-md bg-muted/40 p-2">
                                  <p className="text-muted-foreground">Worked</p>
                                  <p className="font-semibold">${teacherStats.totalWorked.toLocaleString()}</p>
                                </div>
                                <div className="rounded-md bg-green-50 p-2">
                                  <p className="text-green-700">Paid</p>
                                  <p className="font-semibold text-green-700">${teacherStats.paidAmount.toLocaleString()}</p>
                                </div>
                                <div className="rounded-md bg-red-50 p-2">
                                  <p className="text-red-700">Unpaid</p>
                                  <p className="font-semibold text-red-700">${teacherStats.unpaidAmount.toLocaleString()}</p>
                                </div>
                                <div className="rounded-md bg-muted/40 p-2">
                                  <p className="text-muted-foreground">Students</p>
                                  <p className="font-semibold">{teacherStats.paidStudents}/{teacherStats.totalStudents} paid</p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                                <span>{teacherStats.unpaidStudents} unpaid students</span>
                                <span>{paymentCount} payments</span>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'statistics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Payments</p>
                      <p className="text-lg font-semibold">{overallPaymentStats.totalPayments}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-semibold">${overallPaymentStats.totalAmount.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Paid Amount</p>
                      <p className="text-lg font-semibold text-emerald-700">${overallPaymentStats.paidAmount.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Unpaid Amount</p>
                      <p className="text-lg font-semibold text-rose-700">${overallPaymentStats.unpaidAmount.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Paid Share</p>
                      <p className="text-lg font-semibold">{overallPaymentStats.paidPercent}%</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium">Paid vs Unpaid</p>
                      <p className="text-xs text-muted-foreground">Relative payment amount across all records</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{overallPaymentStats.paidPercent}% paid</p>
                      <p>{overallPaymentStats.unpaidPercent}% unpaid</p>
                    </div>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                    <div className="flex h-full w-full">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${overallPaymentStats.paidPercent}%` }}
                      />
                      <div
                        className="h-full bg-rose-500 transition-all duration-300"
                        style={{ width: `${overallPaymentStats.unpaidPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {!isTeacher && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Teacher</TableHead>
                          <TableHead>Students</TableHead>
                          <TableHead>Worked</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Unpaid</TableHead>
                          <TableHead>Paid Students</TableHead>
                          <TableHead>Unpaid Students</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingData ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                              <p className="text-muted-foreground">Loading statistics...</p>
                            </TableCell>
                          </TableRow>
                        ) : teacherOverallStats.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No teachers found
                            </TableCell>
                          </TableRow>
                        ) : (
                          teacherOverallStats.map(({ teacher, teacherId, stats }) => (
                            <TableRow
                              key={teacherId}
                              className="cursor-pointer hover:bg-muted/40"
                              onClick={() =>
                                handleFolderClick('teacher', teacherId, `${teacher.first_name} ${teacher.last_name}`)
                              }
                            >
                              <TableCell>
                                <div>
                                  <p className="font-semibold">{teacher.first_name} {teacher.last_name}</p>
                                  <p className="text-xs text-muted-foreground">{teacher.employee_id}</p>
                                </div>
                              </TableCell>
                              <TableCell>{stats.totalStudents}</TableCell>
                              <TableCell className="font-semibold">${stats.totalWorked.toLocaleString()}</TableCell>
                              <TableCell className="text-emerald-700 font-medium">${stats.paidAmount.toLocaleString()}</TableCell>
                              <TableCell className="text-rose-700 font-medium">${stats.unpaidAmount.toLocaleString()}</TableCell>
                              <TableCell>{stats.paidStudents}</TableCell>
                              <TableCell>{stats.unpaidStudents}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : selectedFolder.type === 'teacher' ? (
        <>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Teacher view</p>
              <h2 className="text-2xl font-bold">
                {selectedFolder.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {teacherDetailView === 'groups'
                  ? `${selectedTeacherClasses.length} groups available`
                  : 'Teacher payment summary'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={teacherDetailView === 'groups' ? 'default' : 'outline'}
                onClick={() => setTeacherDetailView('groups')}
              >
                <Folder className="h-4 w-4 mr-2" />
                Groups
              </Button>
              <Button
                variant={teacherDetailView === 'total' ? 'default' : 'outline'}
                onClick={() => setTeacherDetailView('total')}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Total
              </Button>
            </div>
          </div>

          {teacherDetailView === 'groups' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingData ? (
                <div className="col-span-full text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading groups...</p>
                </div>
              ) : selectedTeacherClasses.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">No groups found for this teacher</p>
                </div>
              ) : (
                selectedTeacherClasses.map((cls) => {
                  const classId = cls.class_id || cls.id || 0;
                  const paymentCount = getPaymentCountForClass(classId);
                  const totalAmount = getTotalAmountForClass(classId);
                  return (
                    <Card
                      key={classId}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleFolderClick('class', classId, cls.class_name)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Folder className="h-9 w-9 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold">{cls.class_name}</h3>
                          <p className="text-sm text-muted-foreground">{cls.class_code} • Level {cls.level}</p>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>{paymentCount} payments</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>${totalAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          ) : (
            <>
              {selectedTeacherStats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Groups</p>
                      <p className="text-lg font-semibold">{selectedTeacherClasses.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Worked</p>
                      <p className="text-lg font-semibold">${selectedTeacherStats.totalWorked.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Paid Amount</p>
                      <p className="text-lg font-semibold text-green-700">${selectedTeacherStats.paidAmount.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Unpaid Amount</p>
                      <p className="text-lg font-semibold text-red-700">${selectedTeacherStats.unpaidAmount.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Students Paid</p>
                      <p className="text-lg font-semibold">
                        {selectedTeacherStats.paidStudents}/{selectedTeacherStats.totalStudents}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
              {selectedTeacherStats && (
                <div className="rounded-2xl border bg-card p-4 mb-6 shadow-sm">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Paid vs Unpaid</p>
                        <p className="text-xs text-muted-foreground">Rounded payment share for this teacher</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{selectedTeacherProgress.paidPercent}% paid</p>
                        <p>{selectedTeacherProgress.unpaidPercent}% unpaid</p>
                      </div>
                    </div>

                    <div className="h-4 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                      <div className="flex h-full w-full">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${selectedTeacherProgress.paidPercent}%` }}
                        />
                        <div
                          className="h-full bg-rose-500 transition-all duration-300"
                          style={{ width: `${selectedTeacherProgress.unpaidPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">Paid amount</p>
                        <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                          ${selectedTeacherStats.paidAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-500/10">
                        <p className="text-xs text-rose-700 dark:text-rose-300">Unpaid amount</p>
                        <p className="text-lg font-semibold text-rose-700 dark:text-rose-300">
                          ${selectedTeacherStats.unpaidAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="text-sm text-muted-foreground mb-4">
                Open a group to see the existing payment list.
              </div>
            </>
          )}
        </>
      ) : (
        // PAYMENT LIST VIEW
        <>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by student, receipt, reference..."
                value={searchTerm}
                onChange={(e) => dispatch(setPaymentsSearchTerm(e.target.value))}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => dispatch(setPaymentsSearchTerm(''))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => dispatch(setPaymentsShowFilters(!showFilters))}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {(filterStatus ? 1 : 0) + (filterMethod ? 1 : 0)}
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" /> Clear All
              </Button>
            )}

            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <span>{displayedPayments.length} payments</span>
              {!isTeacher && (
                <span className="font-semibold">Total: ${totalAmount.toLocaleString()}</span>
              )}
            </div>
          </div>

          {!isTeacher && selectedFolder.type === 'teacher' && selectedTeacherStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Worked</p>
                  <p className="text-lg font-semibold">${selectedTeacherStats.totalWorked.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Paid Amount</p>
                  <p className="text-lg font-semibold text-green-700">${selectedTeacherStats.paidAmount.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Unpaid Amount</p>
                  <p className="text-lg font-semibold text-red-700">${selectedTeacherStats.unpaidAmount.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Students Paid</p>
                  <p className="text-lg font-semibold">{selectedTeacherStats.paidStudents}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Students Unpaid</p>
                  <p className="text-lg font-semibold">{selectedTeacherStats.unpaidStudents}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg mb-6">
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={filterStatus} onValueChange={(value) => dispatch(setPaymentsFilterStatus(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    {paymentStatusOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isTeacher && (
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={filterMethod} onValueChange={(value) => dispatch(setPaymentsFilterMethod(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Methods</SelectItem>
                      {paymentMethodOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Payments Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {!isTeacher && <TableHead>Receipt #</TableHead>}
                  <TableHead>Student</TableHead>
                  <TableHead>Date</TableHead>
                  {!isTeacher && <TableHead>Amount</TableHead>}
                  {!isTeacher && <TableHead>Method</TableHead>}
                  {!isTeacher && <TableHead>Type</TableHead>}
                  <TableHead>Status</TableHead>
                  {!isTeacher && <TableHead className="w-24">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={isTeacher ? 4 : 8} className="text-center py-6">Loading...</TableCell>
                  </TableRow>
                ) : displayedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isTeacher ? 4 : 8} className="text-center py-6 text-muted-foreground">
                      {hasActiveFilters ? 'No payments match your criteria' : 'No payments found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedPayments.map((payment) => (
                    <TableRow key={payment.payment_id || payment.id}>
                      {!isTeacher && (
                        <TableCell className="font-mono">{payment.receipt_number}</TableCell>
                      )}
                      <TableCell>{getStudentName(payment.student_id)}</TableCell>
                      <TableCell>
                        {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '—'}
                      </TableCell>
                      {!isTeacher && (
                        <TableCell className="font-semibold">
                          ${Number(payment.amount || 0).toFixed(2)}
                        </TableCell>
                      )}
                      {!isTeacher && <TableCell>{payment.payment_method}</TableCell>}
                      {!isTeacher && <TableCell>{payment.payment_type}</TableCell>}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClasses(payment.status || payment.payment_status || 'Pending')}
                        >
                          {payment.status || payment.payment_status || 'Pending'}
                        </Badge>
                      </TableCell>
                      {!isTeacher && (
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(payment)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(payment.payment_id || payment.id || 0)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (open) {
            dispatch(setPaymentsModalOpen(true));
            return;
          }
          handleCloseModal();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isOwner && (
              <SelectField
                label="Center"
                name="center_id"
                value={formData.center_id || ''}
                onChange={(value) =>
                  setFormData({ ...formData, center_id: Number(value) })
                }
                options={centerOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a center"
              />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Student"
                name="student_id"
                value={formData.student_id || ''}
                onChange={(value) =>
                  setFormData({ ...formData, student_id: Number(value) })
                }
                options={studentOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a student"
              />
              <SelectField
                label="Payment Method"
                name="payment_method"
                value={formData.payment_method || ''}
                onChange={(value) =>
                  setFormData({ ...formData, payment_method: value })
                }
                options={paymentMethodOptions}
                required
                placeholder="Select method"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  type="number"
                  id="amount"
                  required
                  step="0.01"
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  type="date"
                  id="payment_date"
                  required
                  value={formData.payment_date || ''}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Payment Type"
                name="payment_type"
                value={formData.payment_type || ''}
                onChange={(value) =>
                  setFormData({ ...formData, payment_type: value })
                }
                options={paymentTypeOptions}
                required
                placeholder="Select type"
              />
              <SelectField
                label="Status"
                name="status"
                value={formData.status || ''}
                onChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                options={paymentStatusOptions}
                required
                placeholder="Select status"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receipt_number">Receipt Number *</Label>
                <Input
                  type="text"
                  id="receipt_number"
                  required
                  value={formData.receipt_number || ''}
                  onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  type="text"
                  id="reference_number"
                  value={formData.reference_number || ''}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={state.loading} onClick={handleSubmit}>
              {state.loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsPage;
