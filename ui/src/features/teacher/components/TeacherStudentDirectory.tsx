import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Eye,
  Mail,
  Phone,
  MoreVertical,
  Coins,
  CreditCard,
  Star,
  CalendarDays,
  FileQuestion,
  TrendingUp,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { studentAPI, gradeAPI, attendanceAPI, testAPI } from '../../../shared/api/api';
import { useNavigate } from 'react-router-dom';
import { StudentCoinsDialog } from '@/shared/components/StudentCoinsDialog';
import { useLanguage } from '../../../i18n/LanguageContext';

export interface TeacherStudentItem {
  student_id?: number;
  id?: number;
  center_id?: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  enrollment_number: string;
  date_of_birth?: string;
  parent_name?: string;
  parent_phone?: string;
  gender?: string;
  status: string;
  teacher_id?: number;
  class_id?: number;
  class_name?: string;
  created_at?: string;
  updated_at?: string;
  coins?: number;
  deleted_at?: string | null;
  paid_this_month?: boolean;
  payment_amount_this_month?: number | string | null;
  payment_count_this_month?: number;
  payment_status_this_month?: string | null;
  last_payment_date_this_month?: string | null;
}

interface StudentDetails {
  grades: any[];
  attendance: any[];
  testResults: any[];
  assignments: any[];
}

interface CoinTransaction {
  transaction_id?: number;
  delta: number;
  reason?: string | null;
  created_by_type?: string | null;
  created_at?: string;
}

interface TeacherStudentDirectoryProps {
  students: TeacherStudentItem[];
  title: string;
  loading?: boolean;
  emptyMessage?: string;
  defaultClassName?: string;
}

export default function TeacherStudentDirectory({
  students,
  title,
  loading = false,
  emptyMessage,
  defaultClassName,
}: TeacherStudentDirectoryProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudentItem | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [detailsTab, setDetailsTab] = useState('overview');
  const [studentDetails, setStudentDetails] = useState<StudentDetails>({
    grades: [],
    attendance: [],
    testResults: [],
    assignments: [],
  });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([]);
  const [coinDialogOpen, setCoinDialogOpen] = useState(false);

  const normalizedStudents = useMemo(
    () =>
      students
        .filter((student) => !student.deleted_at)
        .map((student) => ({
          ...student,
          class_name: student.class_name || defaultClassName,
        })),
    [defaultClassName, students]
  );

  const classOptions = useMemo(() => {
    return Array.from(
      new Set(
        normalizedStudents
          .map((student) => String(student.class_name || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [normalizedStudents]);

  const filteredStudents = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return normalizedStudents.filter((student) => {
      const matchesSearch =
        !query ||
        student.first_name.toLowerCase().includes(query) ||
        student.last_name.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query);

      const matchesPayment =
        paymentFilter === 'all' ||
        (paymentFilter === 'paid' && Boolean(student.paid_this_month)) ||
        (paymentFilter === 'unpaid' && !student.paid_this_month);

      const normalizedStatus = String(student.status || '').toLowerCase();
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;

      const matchesClass =
        classFilter === 'all' || String(student.class_name || '').trim() === classFilter;

      return matchesSearch && matchesPayment && matchesStatus && matchesClass;
    });
  }, [normalizedStudents, searchTerm, paymentFilter, statusFilter, classFilter]);

  const hasActiveFilters =
    paymentFilter !== 'all' || statusFilter !== 'all' || classFilter !== 'all';

  const selectedStudentId = Number(selectedStudent?.student_id || selectedStudent?.id || 0) || null;

  const loadStudentDetails = async (student: TeacherStudentItem) => {
    const studentId = Number(student.student_id || student.id || 0);
    if (!studentId) return;

    try {
      setDetailsLoading(true);
      setCoinBalance(Number(student.coins || 0));
      setCoinTransactions([]);
      const [gradesRes, attendanceRes, testsRes, coinsRes] = await Promise.all([
        gradeAPI.getByStudent(studentId).catch(() => ({ data: [] })),
        attendanceAPI.getByStudent(studentId).catch(() => ({ data: [] })),
        testAPI.getStudentResults(studentId).catch(() => ({ data: [] })),
        studentAPI.getCoins(studentId).catch(() => null),
      ]);

      setStudentDetails({
        grades: gradesRes.data || [],
        attendance: attendanceRes.data || [],
        testResults: testsRes.data || [],
        assignments: [],
      });

      const coinsData = (coinsRes as any)?.data || (coinsRes as any) || null;
      if (coinsData) {
        setCoinBalance(Number(coinsData.balance || 0));
        setCoinTransactions(Array.isArray(coinsData.transactions) ? coinsData.transactions : []);
      } else {
        setCoinBalance(Number(student.coins || 0));
        setCoinTransactions([]);
      }
    } catch (error) {
      console.error('Error loading student details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const refreshCoins = async () => {
    if (!selectedStudentId) return;
    try {
      const coinsRes = await studentAPI.getCoins(selectedStudentId).catch(() => null);
      const coinsData = (coinsRes as any)?.data || (coinsRes as any) || null;
      if (coinsData) {
        setCoinBalance(Number(coinsData.balance || 0));
        setCoinTransactions(Array.isArray(coinsData.transactions) ? coinsData.transactions : []);
      }
    } catch (error) {
      console.error('Error loading coins:', error);
    }
  };

  const handleDeleteTransaction = async (transactionId?: number) => {
    if (!selectedStudentId || !transactionId) return;
    try {
      await studentAPI.deleteCoinTransaction(selectedStudentId, transactionId);
      await refreshCoins();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleViewDetails = (student: TeacherStudentItem, tab = 'overview') => {
    setSelectedStudent(student);
    setDetailsDialog(true);
    setDetailsTab(tab);
    void loadStudentDetails(student);
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'destructive';
      case 'graduated':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const calculateAttendancePercentage = () => {
    if (studentDetails.attendance.length === 0) return 0;
    const present = studentDetails.attendance.filter(
      (attendance) => attendance.status === 'Present' || attendance.status === 'Late'
    ).length;
    return Math.round((present / studentDetails.attendance.length) * 100);
  };

  const calculateAverageGrade = () => {
    if (studentDetails.grades.length === 0) return 0;
    const total = studentDetails.grades.reduce((sum, grade) => sum + (grade.percentage || 0), 0);
    return Math.round(total / studentDetails.grades.length);
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

  const getPaymentLabel = (student: TeacherStudentItem) => {
    if (!student.paid_this_month) return t('Unpaid');
    const amount = formatMoney(student.payment_amount_this_month);
    return amount ? `${t('Paid')} ${amount}` : t('Paid');
  };

  const getPaymentTitle = (student: TeacherStudentItem) => {
    const date = formatDate(student.last_payment_date_this_month);
    const status = String(student.payment_status_this_month || '').trim();
    if (!student.paid_this_month) return t('No completed payment recorded this month');
    return [status || t('Completed'), date].filter(Boolean).join(' / ');
  };

  const renderPaymentChip = (student: TeacherStudentItem) => (
    <span
      className={`inline-flex h-6 max-w-full items-center gap-1 rounded-md px-2 text-[11px] font-bold leading-none ${
        student.paid_this_month ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
      }`}
      title={getPaymentTitle(student)}
    >
      <CreditCard className="h-3 w-3" />
      <span className="max-w-[150px] truncate">{getPaymentLabel(student)}</span>
    </span>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">
          {title} ({filteredStudents.length})
        </h3>
        <div className="relative min-w-[350px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('Search students by name or email...')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-muted/20">
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="h-9 w-[170px] bg-white dark:bg-background">
            <SelectValue placeholder={t('Payment Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All payments')}</SelectItem>
            <SelectItem value="paid">{t('Paid')}</SelectItem>
            <SelectItem value="unpaid">{t('Unpaid')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[150px] bg-white dark:bg-background">
            <SelectValue placeholder={t('Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All statuses')}</SelectItem>
            <SelectItem value="active">{t('Active')}</SelectItem>
            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
            <SelectItem value="graduated">{t('Graduated')}</SelectItem>
          </SelectContent>
        </Select>

        {classOptions.length > 1 ? (
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-9 w-[190px] bg-white dark:bg-background">
              <SelectValue placeholder={t('Class')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All classes')}</SelectItem>
              {classOptions.map((className) => (
                <SelectItem key={className} value={className}>
                  {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => {
              setPaymentFilter('all');
              setStatusFilter('all');
              setClassFilter('all');
            }}
          >
            <X className="mr-2 h-4 w-4" />
            {t('Clear filters')}
          </Button>
        ) : null}
      </div>

      {filteredStudents.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">{emptyMessage || t('No students found')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t('Student')}</TableHead>
                <TableHead>{t('Class')}</TableHead>
                <TableHead>{t('Payment Status')}</TableHead>
                <TableHead>{t('Contact')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead className="text-right">{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => {
                const studentId = Number(student.student_id || student.id || 0);
                return (
                  <TableRow
                    key={studentId}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => handleViewDetails(student)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
                          {student.first_name?.[0]}
                          {student.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {student.first_name} {student.last_name}
                          </p>
                          {student.email && <p className="text-xs text-muted-foreground">{student.email}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.class_name || t('Unassigned')}</Badge>
                    </TableCell>
                    <TableCell>{renderPaymentChip(student)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {student.email && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="rounded-md p-1.5 text-primary hover:bg-muted"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    window.location.href = `mailto:${student.email}`;
                                  }}
                                >
                                  <Mail className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{student.email}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {student.phone && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="rounded-md p-1.5 text-primary hover:bg-muted"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    window.location.href = `tel:${student.phone}`;
                                  }}
                                >
                                  <Phone className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{student.phone}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(student.status) as any}>
                        {t(student.status || 'Active')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="rounded-md p-1.5 hover:bg-muted"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(student)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('View Details')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStudent(student);
                              setCoinBalance(Number(student.coins || 0));
                              setCoinTransactions([]);
                              setCoinDialogOpen(true);
                            }}
                          >
                            <Coins className="mr-2 h-4 w-4" />
                            {t('Update Coins')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/student/${studentId}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('Full Profile')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(student, 'grades')}>
                            <Star className="mr-2 h-4 w-4" />
                            {t('View Grades')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(student, 'attendance')}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {t('View Attendance')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(student, 'tests')}>
                            <FileQuestion className="mr-2 h-4 w-4" />
                            {t('View Test Results')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-3">
        <p className="text-sm text-muted-foreground">
          {t('Showing')} {filteredStudents.length} {t('of')} {normalizedStudents.length} {t('students')}
        </p>
      </div>

      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-xl font-bold text-white">
                {selectedStudent?.first_name?.[0]}
                {selectedStudent?.last_name?.[0]}
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg">
                  {selectedStudent?.first_name} {selectedStudent?.last_name}
                </DialogTitle>
                <p className="truncate text-sm text-muted-foreground">{selectedStudent?.enrollment_number}</p>
              </div>
            </div>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Card className="bg-indigo-500/10 p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{calculateAverageGrade()}%</p>
                  <p className="text-xs text-muted-foreground">{t('Avg. Grade')}</p>
                </Card>
                <Card className="bg-emerald-500/10 p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-500">{calculateAttendancePercentage()}%</p>
                  <p className="text-xs text-muted-foreground">{t('Attendance')}</p>
                </Card>
                <Card className="bg-rose-500/10 p-4 text-center">
                  <p className="text-3xl font-bold text-rose-500">{studentDetails.testResults.length}</p>
                  <p className="text-xs text-muted-foreground">{t('Tests Taken')}</p>
                </Card>
                <Card className="bg-sky-500/10 p-4 text-center">
                  <p className="text-3xl font-bold text-sky-500">{studentDetails.grades.length}</p>
                  <p className="text-xs text-muted-foreground">{t('Grades')}</p>
                </Card>
              </div>

              <Tabs value={detailsTab} onValueChange={setDetailsTab}>
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="overview" className="gap-1.5">
                    <TrendingUp className="h-4 w-4" /> {t('Overview')}
                  </TabsTrigger>
                  <TabsTrigger value="grades" className="gap-1.5">
                    <Star className="h-4 w-4" /> {t('Grades')}
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="gap-1.5">
                    <CalendarDays className="h-4 w-4" /> {t('Attendance')}
                  </TabsTrigger>
                  <TabsTrigger value="tests" className="gap-1.5">
                    <FileQuestion className="h-4 w-4" /> {t('Test Results')}
                  </TabsTrigger>
                  <TabsTrigger value="coins" className="gap-1.5">
                    <Coins className="h-4 w-4" /> {t('Coins')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <h4 className="mb-3 font-semibold">{t('Personal Information')}</h4>
                  <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Email')}</p>
                      <p className="break-all text-sm leading-5">{selectedStudent?.email || 'N/A'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Phone')}</p>
                      <p className="break-words text-sm leading-5">{selectedStudent?.phone || 'N/A'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Date of Birth')}</p>
                      <p className="break-words text-sm leading-5">
                        {selectedStudent?.date_of_birth
                          ? new Date(selectedStudent.date_of_birth).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Gender')}</p>
                      <p className="break-words text-sm leading-5">{selectedStudent?.gender || 'N/A'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Parent/Guardian')}</p>
                      <p className="break-words text-sm leading-5">{selectedStudent?.parent_name || 'N/A'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Parent Phone')}</p>
                      <p className="break-words text-sm leading-5">{selectedStudent?.parent_phone || 'N/A'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Class')}</p>
                      <p className="break-words text-sm leading-5">{selectedStudent?.class_name || t('Unassigned')}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Status')}</p>
                      <Badge variant={getStatusVariant(selectedStudent?.status || '') as any}>
                        {t(selectedStudent?.status || 'Active')}
                      </Badge>
                    </div>
                  </div>

                  <h4 className="mb-3 font-semibold">{t('Recent Activity')}</h4>
                  {studentDetails.grades.length === 0 && studentDetails.attendance.length === 0 ? (
                    <p className="text-muted-foreground">{t('No activity recorded yet')}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {studentDetails.grades.slice(0, 3).map((grade, index) => (
                        <Card key={index} className="border p-3">
                          <p className="text-sm">
                            {t('Grade')}: <strong>{grade.marks_obtained}/{grade.total_marks}</strong> {t('in')} {grade.subject}
                          </p>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="grades">
                  {studentDetails.grades.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground">{t('No grades recorded')}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('Subject')}</TableHead>
                          <TableHead>{t('Score')}</TableHead>
                          <TableHead>{t('Percentage')}</TableHead>
                          <TableHead>{t('Grade')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentDetails.grades.map((grade, index) => (
                          <TableRow key={index}>
                            <TableCell>{grade.subject}</TableCell>
                            <TableCell>{grade.marks_obtained}/{grade.total_marks}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                                  <div className="h-full rounded-full bg-primary" style={{ width: `${grade.percentage || 0}%` }} />
                                </div>
                                <span className="text-sm">{grade.percentage}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge>{grade.grade_letter}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="attendance">
                  {studentDetails.attendance.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground">{t('No attendance records')}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('Date')}</TableHead>
                          <TableHead>{t('Status')}</TableHead>
                          <TableHead>{t('Notes')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentDetails.attendance.slice(0, 10).map((attendance, index) => (
                          <TableRow key={index}>
                            <TableCell>{new Date(attendance.attendance_date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  attendance.status === 'Present'
                                    ? 'success'
                                    : attendance.status === 'Late'
                                      ? 'warning'
                                      : 'destructive'
                                }
                              >
                                {attendance.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{attendance.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="tests">
                  {studentDetails.testResults.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground">{t('No test results')}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('Test')}</TableHead>
                          <TableHead>{t('Score')}</TableHead>
                          <TableHead>{t('Status')}</TableHead>
                          <TableHead>{t('Date')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentDetails.testResults.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>{result.test_name}</TableCell>
                            <TableCell>
                              {result.score !== null ? `${result.score}/${result.total_marks}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={result.status === 'graded' ? 'success' : 'warning'}>
                                {result.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {result.submitted_at ? new Date(result.submitted_at).toLocaleDateString() : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="coins">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('Current Balance')}</p>
                      <p className="text-2xl font-semibold">{coinBalance.toLocaleString()}</p>
                    </div>
                    <Button size="sm" onClick={() => setCoinDialogOpen(true)}>
                      {t('Update Coins')}
                    </Button>
                  </div>
                  {coinTransactions.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground">{t('No coin transactions yet')}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('Date')}</TableHead>
                          <TableHead>{t('Delta')}</TableHead>
                          <TableHead>{t('Reason')}</TableHead>
                          <TableHead>{t('By')}</TableHead>
                          <TableHead className="text-right">{t('Action')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coinTransactions.map((transaction) => (
                          <TableRow key={transaction.transaction_id}>
                            <TableCell>
                              {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell className={transaction.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {transaction.delta >= 0 ? '+' : ''}
                              {transaction.delta}
                            </TableCell>
                            <TableCell>{transaction.reason || '-'}</TableCell>
                            <TableCell className="capitalize">{transaction.created_by_type || '-'}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => handleDeleteTransaction(transaction.transaction_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog(false)}>
              {t('Close')}
            </Button>
            <Button onClick={() => navigate(`/student/${selectedStudentId}`)}>
              {t('View Full Profile')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudentCoinsDialog
        open={coinDialogOpen}
        onOpenChange={setCoinDialogOpen}
        studentId={selectedStudentId || undefined}
        studentName={selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : undefined}
        currentCoins={coinBalance}
        onSaved={refreshCoins}
      />
    </div>
  );
}
