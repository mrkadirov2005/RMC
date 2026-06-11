// Page component for the payments screen in the crm feature.

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Pencil,
  Trash2,
  X,
  ArrowLeft,
  Folder,
  Search,
  Filter,
  User,
  BookOpen,
  Plus,
  DollarSign,
  CreditCard,
  Users,
  Loader2,
  BarChart3,
  Wallet,
  ReceiptText,
  TrendingUp,
  ShieldCheck,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
import { SelectField } from '../students/components/SelectField';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { PageHeader } from '@/components/common/PageHeader';
import { MetricCard } from '@/components/common/MetricCard';
import { PageToolbar } from '@/components/common/PageToolbar';
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
import { cn } from '@/lib/utils';
import { exportCsvEntity, importCsvEntity } from '@/shared/dataCsv';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';

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
  student_first_name?: string;
  student_last_name?: string;
  student_class_id?: number;
  student_teacher_id?: number;
  student_status?: string;
  student_deleted_at?: string;
  student_class_name?: string;
  coverage_days?: number;
  coverage_total_days?: number;
  transfer_effective_date?: string;
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

const paymentSurfaceClass =
  'overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm';

const paymentStatCardClass =
  'overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card';

const folderCardClass =
  'cursor-pointer overflow-hidden border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-border dark:bg-card dark:hover:shadow-sm';

const folderPageSizeOptions = [12, 24, 48];
const paymentPageSizeOptions = [10, 25, 50, 100];

const clampPage = (page: number, totalPages: number) => Math.min(Math.max(page, 1), Math.max(totalPages, 1));

const paginateItems = <T,>(items: T[], page: number, pageSize: number) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = clampPage(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    currentPage,
    totalPages,
    start,
    end: Math.min(start + pageSize, items.length),
    items: items.slice(start, start + pageSize),
  };
};

const buildPageNumbers = (currentPage: number, totalPages: number) => {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
};

const PaginationBar = ({
  total,
  currentPage,
  totalPages,
  start,
  end,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  currentPage: number;
  totalPages: number;
  start: number;
  end: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) => {
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-border dark:bg-card sm:flex-row sm:items-center sm:justify-between">
      <div className="text-muted-foreground">
        Showing {start + 1}-{end} of {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-8 w-[92px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <div className="flex items-center gap-1">
          {buildPageNumbers(currentPage, totalPages).map((page, index, pages) => (
            <div key={page} className="flex items-center gap-1">
              {index > 0 && page - pages[index - 1] > 1 && (
                <span className="px-1 text-muted-foreground">...</span>
              )}
              <Button
                type="button"
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                className="h-8 min-w-8 px-2"
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Renders the payments page screen.
const PaymentsPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { t } = useLanguage();
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

// Runs side effects for this component.
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

// Resets paginated folder pages when the grouping context changes.
  useEffect(() => {
    setFolderPage(1);
  }, [activeTab, searchTerm, selectedFolder?.type, selectedFolder?.id, teacherDetailView, viewMode]);

// Resets paginated payment rows when payment filters or folder context changes.
  useEffect(() => {
    setPaymentsPage(1);
  }, [searchTerm, filterStatus, filterMethod, selectedFolder?.type, selectedFolder?.id]);

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
        currency: 'UZS',
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
      currency: 'UZS',
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

  const handleImportPayments = async (file?: File) => {
    setIsImporting(true);
    const imported = await importCsvEntity('payments', 'Payments', file);
    if (imported) await dispatch(fetchPaymentsForce());
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportPayments = () => exportCsvEntity('payments', 'Payments');

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

// Returns teacher payment stats.
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

  // Get payments count for teacher
  const getPaymentCountForTeacher = (teacherId: number): number => {
    return getPaymentsForTeacher(teacherId).length;
  };

  // Get payments count for class
  const getPaymentCountForClass = (classId: number): number => {
    return getPaymentsForClass(classId).length;
  };

  // Get total amount for class
  const getTotalAmountForClass = (classId: number): number => {
    return getPaymentsForClass(classId)
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
    if (selectedFolder.type === 'teacher') return getPaymentsForTeacher(selectedFolder.id);
    if (selectedFolder.type === 'class') return getPaymentsForClass(selectedFolder.id);
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

// Memoizes the selected teacher classes derived value.
  const selectedTeacherClasses = useMemo(() => {
    if (!selectedFolder || selectedFolder.type !== 'teacher') return [];
    return classes.filter((cls) => Number(cls.teacher_id) === Number(selectedFolder.id));
  }, [selectedFolder, classes]);

  const paginatedSelectedTeacherClasses = useMemo(
    () => paginateItems(selectedTeacherClasses, folderPage, folderPageSize),
    [selectedTeacherClasses, folderPage, folderPageSize]
  );

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

  const paginatedDisplayedPayments = useMemo(
    () => paginateItems(displayedPayments, paymentsPage, paymentsPageSize),
    [displayedPayments, paymentsPage, paymentsPageSize]
  );

  const totalAmount = displayedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const displayedPaidAmount = displayedPayments.filter(isPaidPayment).reduce((sum, p) => sum + getPaymentAmount(p), 0);
  const displayedPendingAmount = Math.max(totalAmount - displayedPaidAmount, 0);
  const folderGridClass =
    viewMode === 'list'
      ? 'space-y-2 [&_.folder-icon]:h-8 [&_.folder-icon]:w-8 [&_.folder-card-content]:p-3 [&_.folder-meta-grid]:hidden'
      : viewMode === 'compact'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
        : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

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
    if (student) return `${student.first_name} ${student.last_name}`;
    const payment = state.items.find((p) => Number(p.student_id) === Number(studentId));
    const fallbackName = `${payment?.student_first_name || ''} ${payment?.student_last_name || ''}`.trim();
    return fallbackName || 'Unknown Student';
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

  return (
    <div className="container mx-auto space-y-6">
      <PageHeader
        title={pageTitle}
        description="Organize payments by student, class, teacher, and collection status."
        icon={Wallet}
        actions={
          <>
            {selectedFolder && (
              <Button variant="outline" size="sm" onClick={handleBackToFolders}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            {!isTeacher && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => handleImportPayments(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {isImporting ? t('Importing...') : t('Import CSV')}
                </Button>
                <Button type="button" variant="outline" onClick={handleExportPayments}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('Export CSV')}
                </Button>
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="mr-2 h-4 w-4" /> Add Payment
                </Button>
              </>
            )}
          </>
        }
      />

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Payment Records" value={overallPaymentStats.totalPayments} detail="All visible records" icon={ReceiptText} tone="green" />
        <MetricCard label="Total Amount" value={formatMoney(overallPaymentStats.totalAmount)} detail="Across current scope" icon={DollarSign} tone="blue" />
        <MetricCard label="Paid Share" value={`${overallPaymentStats.paidPercent}%`} detail="Completed payments" icon={TrendingUp} tone="neutral" />
        <MetricCard label="Collected" value={formatMoney(overallPaymentStats.paidAmount)} detail="Completed amount" icon={ShieldCheck} tone="amber" />
      </div>

      {!selectedFolder ? (
        <>
          <PageToolbar>
            <div className="space-y-4">
              <div className="relative max-w-2xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={
                    activeTab === 'classes'
                      ? 'Search classes by name, code, level...'
                      : activeTab === 'teachers' || activeTab === 'statistics'
                        ? 'Search teachers by name or employee ID...'
                        : 'Search students by name or ID...'
                  }
                  value={searchTerm}
                  onChange={(e) => dispatch(setPaymentsSearchTerm(e.target.value))}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => dispatch(setPaymentsSearchTerm(''))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-2">
              <Button
                variant={activeTab === 'students' ? 'default' : 'ghost'}
                onClick={() => dispatch(setPaymentsActiveTab('students'))}
                className={cn(activeTab === 'students' && 'bg-emerald-600 text-white hover:bg-emerald-700')}
              >
                <Users className="h-4 w-4 mr-2" />
                By Students
              </Button>
              <Button
                variant={activeTab === 'classes' ? 'default' : 'ghost'}
                onClick={() => dispatch(setPaymentsActiveTab('classes'))}
                className={cn(activeTab === 'classes' && 'bg-cyan-600 text-white hover:bg-cyan-700')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                By Classes
              </Button>
              <Button
                variant={activeTab === 'teachers' ? 'default' : 'ghost'}
                onClick={() => dispatch(setPaymentsActiveTab('teachers'))}
                className={cn(activeTab === 'teachers' && 'bg-indigo-600 text-white hover:bg-indigo-700')}
              >
                <User className="h-4 w-4 mr-2" />
                By Teachers
              </Button>
              {!isTeacher && (
                <Button
                  variant={activeTab === 'statistics' ? 'default' : 'ghost'}
                  onClick={() => dispatch(setPaymentsActiveTab('statistics'))}
                  className={cn(activeTab === 'statistics' && 'bg-slate-800 text-white hover:bg-slate-900')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Statistics
                </Button>
              )}
              </div>
            </div>
          </PageToolbar>

          {/* Tab Content */}
          <div>
            {/* By Students Tab */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                <div className={folderGridClass}>
                  {loadingData ? (
                    <div className="col-span-full text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading students...</p>
                    </div>
                  ) : filteredRootStudents.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">{searchTerm ? 'No students match your search' : 'No students found'}</p>
                    </div>
                  ) : (
                    paginatedRootStudents.items.map((student) => {
                      const studentId = student.student_id || student.id || 0;
                      const paymentCount = getPaymentCountForStudent(studentId);
                      const totalAmount = getTotalAmountForStudent(studentId);
                      return (
                        <Card
                          key={studentId}
                          className={cn(folderCardClass, 'border-emerald-100 dark:border-border')}
                          onClick={() => handleFolderClick('student', studentId, `${student.first_name} ${student.last_name}`)}
                        >
                          <div className="h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 dark:hidden" />
                          <CardContent className="folder-card-content p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="folder-icon flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-muted dark:text-muted-foreground">
                                <Folder className="h-5 w-5" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <h3 className="font-semibold">{student.first_name} {student.last_name}</h3>
                              <p className="text-sm text-muted-foreground">ID: {studentId}</p>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t pt-3">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <CreditCard className="h-3.5 w-3.5" />
                                <span>{paymentCount} payments</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-primary">
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>{formatMoney(totalAmount)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
                <PaginationBar
                  total={filteredRootStudents.length}
                  currentPage={paginatedRootStudents.currentPage}
                  totalPages={paginatedRootStudents.totalPages}
                  start={paginatedRootStudents.start}
                  end={paginatedRootStudents.end}
                  pageSize={folderPageSize}
                  pageSizeOptions={folderPageSizeOptions}
                  onPageChange={setFolderPage}
                  onPageSizeChange={(value) => {
                    setFolderPageSize(value);
                    setFolderPage(1);
                  }}
                />
              </div>
            )}

            {/* By Classes Tab */}
            {activeTab === 'classes' && (
              <div className="space-y-4">
                <div className={folderGridClass}>
                  {loadingData ? (
                    <div className="col-span-full text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading classes...</p>
                    </div>
                  ) : filteredRootClasses.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">{searchTerm ? 'No classes match your search' : 'No classes found'}</p>
                    </div>
                  ) : (
                    paginatedRootClasses.items.map((cls) => {
                      const classId = cls.class_id || cls.id || 0;
                      const paymentCount = getPaymentCountForClass(classId);
                      const totalAmount = getTotalAmountForClass(classId);
                      return (
                        <Card
                          key={classId}
                          className={cn(folderCardClass, 'border-cyan-100 dark:border-border')}
                          onClick={() => handleFolderClick('class', classId, cls.class_name)}
                        >
                          <div className="h-1 bg-gradient-to-r from-cyan-500 to-sky-500 dark:hidden" />
                          <CardContent className="folder-card-content p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="folder-icon flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-muted dark:text-muted-foreground">
                                <Folder className="h-5 w-5" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <h3 className="font-semibold">{cls.class_name}</h3>
                              <p className="text-sm text-muted-foreground">{cls.class_code} • Level {cls.level}</p>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t pt-3">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <CreditCard className="h-3.5 w-3.5" />
                                <span>{paymentCount} payments</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm font-semibold text-cyan-700 dark:text-primary">
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>{formatMoney(totalAmount)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
                <PaginationBar
                  total={filteredRootClasses.length}
                  currentPage={paginatedRootClasses.currentPage}
                  totalPages={paginatedRootClasses.totalPages}
                  start={paginatedRootClasses.start}
                  end={paginatedRootClasses.end}
                  pageSize={folderPageSize}
                  pageSizeOptions={folderPageSizeOptions}
                  onPageChange={setFolderPage}
                  onPageSizeChange={(value) => {
                    setFolderPageSize(value);
                    setFolderPage(1);
                  }}
                />
              </div>
            )}

            {/* By Teachers Tab */}
            {activeTab === 'teachers' && (
              <div className="space-y-4">
                <div className={folderGridClass}>
                  {loadingData ? (
                    <div className="col-span-full text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading teachers...</p>
                    </div>
                  ) : filteredRootTeachers.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">{searchTerm ? 'No teachers match your search' : 'No teachers found'}</p>
                    </div>
                  ) : (
                    paginatedRootTeachers.items.map((teacher) => {
                      const teacherId = teacher.teacher_id || teacher.id || 0;
                      const paymentCount = getPaymentCountForTeacher(teacherId);
                      const teacherStats = getTeacherPaymentStats(teacherId);
                      return (
                        <Card
                          key={teacherId}
                          className={cn(folderCardClass, 'border-indigo-100 dark:border-border')}
                          onClick={() => handleFolderClick('teacher', teacherId, `${teacher.first_name} ${teacher.last_name}`)}
                        >
                          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500 dark:hidden" />
                          <CardContent className="folder-card-content p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="folder-icon flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-muted dark:text-muted-foreground">
                                <Folder className="h-5 w-5" />
                              </div>
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
                                    <p className="font-semibold">{formatMoney(teacherStats.totalWorked)}</p>
                                  </div>
                                  <div className="rounded-md bg-green-50 p-2">
                                    <p className="text-green-700">Paid</p>
                                    <p className="font-semibold text-green-700">{formatMoney(teacherStats.paidAmount)}</p>
                                  </div>
                                  <div className="rounded-md bg-red-50 p-2">
                                    <p className="text-red-700">Unpaid</p>
                                    <p className="font-semibold text-red-700">{formatMoney(teacherStats.unpaidAmount)}</p>
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
                <PaginationBar
                  total={filteredRootTeachers.length}
                  currentPage={paginatedRootTeachers.currentPage}
                  totalPages={paginatedRootTeachers.totalPages}
                  start={paginatedRootTeachers.start}
                  end={paginatedRootTeachers.end}
                  pageSize={folderPageSize}
                  pageSizeOptions={folderPageSizeOptions}
                  onPageChange={setFolderPage}
                  onPageSizeChange={(value) => {
                    setFolderPageSize(value);
                    setFolderPage(1);
                  }}
                />
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'statistics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                  <Card className={paymentStatCardClass}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Payments</p>
                      <p className="text-lg font-semibold">{overallPaymentStats.totalPayments}</p>
                    </CardContent>
                  </Card>
                  <Card className={paymentStatCardClass}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-semibold">{formatMoney(overallPaymentStats.totalAmount)}</p>
                    </CardContent>
                  </Card>
                  <Card className={paymentStatCardClass}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Paid Amount</p>
                      <p className="text-lg font-semibold text-emerald-700">{formatMoney(overallPaymentStats.paidAmount)}</p>
                    </CardContent>
                  </Card>
                  <Card className={paymentStatCardClass}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Unpaid Amount</p>
                      <p className="text-lg font-semibold text-rose-700">{formatMoney(overallPaymentStats.unpaidAmount)}</p>
                    </CardContent>
                  </Card>
                  <Card className={paymentStatCardClass}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Paid Share</p>
                      <p className="text-lg font-semibold">{overallPaymentStats.paidPercent}%</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm dark:border-border dark:bg-card dark:bg-none">
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
                  <div className={cn(paymentSurfaceClass, 'rounded-lg')}>
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
                        ) : filteredTeacherOverallStats.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              {searchTerm ? 'No teachers match your search' : 'No teachers found'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTeacherOverallStats.map(({ teacher, teacherId, stats }) => (
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
                              <TableCell className="font-semibold">{formatMoney(stats.totalWorked)}</TableCell>
                              <TableCell className="font-medium text-emerald-700">{formatMoney(stats.paidAmount)}</TableCell>
                              <TableCell className="font-medium text-rose-700">{formatMoney(stats.unpaidAmount)}</TableCell>
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
          <Card className={paymentSurfaceClass}>
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-cyan-500 dark:hidden" />
            <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
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
            </CardContent>
          </Card>

          {teacherDetailView === 'groups' ? (
            <div className="space-y-4">
              <div className={folderGridClass}>
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
                  paginatedSelectedTeacherClasses.items.map((cls) => {
                    const classId = cls.class_id || cls.id || 0;
                    const paymentCount = getPaymentCountForClass(classId);
                    const totalAmount = getTotalAmountForClass(classId);
                    return (
                      <Card
                        key={classId}
                        className={cn(folderCardClass, 'border-cyan-100 dark:border-border')}
                        onClick={() => handleFolderClick('class', classId, cls.class_name)}
                      >
                        <div className="h-1 bg-gradient-to-r from-cyan-500 to-sky-500 dark:hidden" />
                        <CardContent className="folder-card-content p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="folder-icon flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-muted dark:text-muted-foreground">
                              <Folder className="h-5 w-5" />
                            </div>
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
                            <div className="flex items-center gap-1 text-sm font-semibold text-cyan-700 dark:text-primary">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>{formatMoney(totalAmount)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
              <PaginationBar
                total={selectedTeacherClasses.length}
                currentPage={paginatedSelectedTeacherClasses.currentPage}
                totalPages={paginatedSelectedTeacherClasses.totalPages}
                start={paginatedSelectedTeacherClasses.start}
                end={paginatedSelectedTeacherClasses.end}
                pageSize={folderPageSize}
                pageSizeOptions={folderPageSizeOptions}
                onPageChange={setFolderPage}
                onPageSizeChange={(value) => {
                  setFolderPageSize(value);
                  setFolderPage(1);
                }}
              />
            </div>
          ) : (
            <>
              {selectedTeacherStats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                  <Card className={paymentStatCardClass}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Groups</p>
                      <p className="text-lg font-semibold">{selectedTeacherClasses.length}</p>
                    </CardContent>
                  </Card>
                  <Card className={paymentStatCardClass}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Worked</p>
                      <p className="text-lg font-semibold">{formatMoney(selectedTeacherStats.totalWorked)}</p>
                    </CardContent>
                  </Card>
                  <Card className={paymentStatCardClass}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Paid Amount</p>
                      <p className="text-lg font-semibold text-green-700">{formatMoney(selectedTeacherStats.paidAmount)}</p>
                    </CardContent>
                  </Card>
                  <Card className={paymentStatCardClass}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Unpaid Amount</p>
                      <p className="text-lg font-semibold text-red-700">{formatMoney(selectedTeacherStats.unpaidAmount)}</p>
                    </CardContent>
                  </Card>
                  <Card className={paymentStatCardClass}>
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
                <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm dark:border-border dark:bg-card dark:bg-none">
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
                          {formatMoney(selectedTeacherStats.paidAmount)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-500/10">
                        <p className="text-xs text-rose-700 dark:text-rose-300">Unpaid amount</p>
                        <p className="text-lg font-semibold text-rose-700 dark:text-rose-300">
                          {formatMoney(selectedTeacherStats.unpaidAmount)}
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
          <Card className={paymentSurfaceClass}>
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 dark:hidden" />
            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-border dark:bg-muted/20">
                  <p className="text-xs text-emerald-700 dark:text-muted-foreground">Visible Records</p>
                  <p className="text-xl font-semibold text-emerald-800 dark:text-foreground">{displayedPayments.length}</p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3 dark:border-border dark:bg-muted/20">
                  <p className="text-xs text-sky-700 dark:text-muted-foreground">Visible Total</p>
                  <p className="text-xl font-semibold text-sky-800 dark:text-foreground">{formatMoney(totalAmount)}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 dark:border-border dark:bg-muted/20">
                  <p className="text-xs text-amber-700 dark:text-muted-foreground">Pending or Unpaid</p>
                  <p className="text-xl font-semibold text-amber-800 dark:text-foreground">{formatMoney(displayedPendingAmount)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                      onClick={() => dispatch(setPaymentsSearchTerm(''))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  onClick={() => dispatch(setPaymentsShowFilters(!showFilters))}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {(filterStatus ? 1 : 0) + (filterMethod ? 1 : 0)}
                    </span>
                  )}
                </Button>

                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" /> Clear All
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Teacher totals are shown in the dedicated teacher view above. */}

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/20 md:grid-cols-2">
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
          <div className={cn(paymentSurfaceClass, 'rounded-lg')}>
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
                  paginatedDisplayedPayments.items.map((payment) => (
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
                          {formatMoney(payment.amount || 0)}
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
          <PaginationBar
            total={displayedPayments.length}
            currentPage={paginatedDisplayedPayments.currentPage}
            totalPages={paginatedDisplayedPayments.totalPages}
            start={paginatedDisplayedPayments.start}
            end={paginatedDisplayedPayments.end}
            pageSize={paymentsPageSize}
            pageSizeOptions={paymentPageSizeOptions}
            onPageChange={setPaymentsPage}
            onPageSizeChange={(value) => {
              setPaymentsPageSize(value);
              setPaymentsPage(1);
            }}
          />
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
