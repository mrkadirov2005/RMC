// Page component for the students screen in the crm feature.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Coins,
  FileText,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Receipt,
  School,
  Trash2,
  User,
} from 'lucide-react';
import { studentAPI, classAPI } from '../../../shared/api/api';
import { StudentInfoSection } from './components/StudentInfoSection';
import { StatisticsSection } from './components/StatisticsSection';
import { AttendanceTab, PaymentsTab, AssignmentsTab, IndividualTasksTab, GradesTab } from './tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getErrorMessage } from '@/utils/errorMessage';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StudentCoinsDialog } from '@/shared/components/StudentCoinsDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showToast } from '@/utils/toast';
import { generateTempPassword } from '@/utils/password';
import { useAppDispatch } from '../hooks';
import { fetchAttendanceForce } from '../../../slices/attendanceSlice';
import { fetchPaymentsForce } from '../../../slices/paymentsSlice';
import { fetchAssignmentsForce } from '../../../slices/assignmentsSlice';
import { fetchGradesForce } from '../../../slices/gradesSlice';
import { cn } from '@/lib/utils';

interface Class {
  class_id?: number;
  id?: number;
  payment_amount?: number;
  class_name?: string;
  teacher_id?: number;
}

interface Student {
  student_id?: number;
  id?: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  gender: string;
  status: string;
  class_id?: number;
  center_id?: number;
  coins?: number;
  username?: string;
}

interface Attendance {
  attendance_id?: number;
  id?: number;
  attendance_date: string;
  status: string;
  remarks?: string;
}

interface Payment {
  payment_id?: number;
  id?: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: string;
  payment_status: string;
  receipt_number: string;
}

interface Assignment {
  assignment_id?: number;
  id?: number;
  assignment_title: string;
  due_date: string;
  status: string;
  grade?: number;
}

interface Grade {
  grade_id?: number;
  id?: number;
  percentage: number;
  grade_letter: string;
  term: string;
  subject_name?: string;
}

interface CoinTransaction {
  transaction_id?: number;
  delta: number;
  reason?: string | null;
  created_by_type?: string | null;
  created_at?: string;
}

const getInitials = (firstName?: string, lastName?: string) =>
  `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'ST';

const getStatusClasses = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'inactive':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'suspended':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};

// Renders the student detail page screen.
const StudentDetailPage = () => {
  const dispatch = useAppDispatch();
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [classData, setClassData] = useState<Class | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([]);
  const [coinDialogOpen, setCoinDialogOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetTempPassword, setResetTempPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('attendance');

// Runs side effects for this component.
  useEffect(() => {
    loadStudentDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

// Loads student details.
  const loadStudentDetails = async () => {
    setLoading(true);
    setError(null);
    setCoinBalance(0);
    setCoinTransactions([]);
    try {
      const studentResponse = await studentAPI.getById(Number(studentId));
      const studentData = studentResponse.data || studentResponse;
      setStudent(studentData);

      if (studentData.class_id) {
        try {
          const classResponse = await classAPI.getById(studentData.class_id);
          const classDataResponse = classResponse.data || classResponse;
          setClassData(classDataResponse);
        } catch (err) {
          console.error('Error loading class data:', err);
        }
      }

      const [attendanceRes, paymentRes, assignmentRes, gradeRes, coinsRes] = await Promise.all([
        dispatch(fetchAttendanceForce()).unwrap(),
        dispatch(fetchPaymentsForce()).unwrap(),
        dispatch(fetchAssignmentsForce()).unwrap(),
        dispatch(fetchGradesForce()).unwrap(),
        studentAPI.getCoins(Number(studentId)).catch(() => null),
      ]);

      const attendanceData = Array.isArray(attendanceRes) ? attendanceRes : [];
      const paymentData = Array.isArray(paymentRes) ? paymentRes : [];
      const assignmentData = Array.isArray(assignmentRes) ? assignmentRes : [];
      const gradeData = Array.isArray(gradeRes) ? gradeRes : [];
// Handles coins data.
      const coinsData = (coinsRes as any)?.data || (coinsRes as any) || null;

      const studentIdNum = Number(studentId);
      const studentClassId = Number(studentData.class_id);

      setAttendance(
        Array.isArray(attendanceData)
          ? attendanceData.filter((a: Record<string, unknown>) => a.student_id === studentIdNum)
          : []
      );
      setPayments(
        Array.isArray(paymentData)
          ? paymentData.filter((p: Record<string, unknown>) => p.student_id === studentIdNum)
          : []
      );
      setAssignments(
        Array.isArray(assignmentData)
          ? assignmentData.filter((a: Record<string, unknown>) =>
              Number(a.class_id) === studentClassId || Number(a.student_id) === studentIdNum
            )
          : []
      );
      setGrades(
        Array.isArray(gradeData)
          ? gradeData.filter((g: Record<string, unknown>) => g.student_id === studentIdNum)
          : []
      );
      if (coinsData) {
        setCoinBalance(Number(coinsData.balance || 0));
        setCoinTransactions(Array.isArray(coinsData.transactions) ? coinsData.transactions : []);
        setStudent((prev) => (prev ? { ...prev, coins: Number(coinsData.balance || 0) } : prev));
      }
    } catch (err) {
      console.error('Error loading student details:', err);
      setError('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

// Handles refresh coins.
  const refreshCoins = async () => {
    try {
      const coinsRes = await studentAPI.getCoins(Number(studentId));
// Handles coins data.
      const coinsData = (coinsRes as any)?.data || coinsRes || null;
      if (coinsData) {
        setCoinBalance(Number(coinsData.balance || 0));
        setCoinTransactions(Array.isArray(coinsData.transactions) ? coinsData.transactions : []);
        setStudent((prev) => (prev ? { ...prev, coins: Number(coinsData.balance || 0) } : prev));
      }
    } catch (err) {
      console.error('Error loading coins:', err);
    }
  };

// Handles delete transaction.
  const handleDeleteTransaction = async (transactionId?: number) => {
    if (!transactionId || !studentId) return;
    try {
      await studentAPI.deleteCoinTransaction(Number(studentId), transactionId);
      await refreshCoins();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

// Handles reset password.
  const handleResetPassword = async () => {
    if (!studentId || !student) return;
    const username = String(student.username || '').trim() ||
      (window.prompt('Enter username for password reset') || '').trim();
    if (!username) {
      showToast.error('Username is required to reset the password.');
      return;
    }
    const tempPassword = generateTempPassword();
    setResettingPassword(true);
    try {
      await studentAPI.setPassword(Number(studentId), { username, password: tempPassword });
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
    if (!studentId || !student) return;
    const username = String(student.username || '').trim();
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
      await studentAPI.setPassword(Number(studentId), { username, password });
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 text-center py-16 text-muted-foreground">
        <h3 className="text-lg font-semibold">Student not found</h3>
      </div>
    );
  }

  const attendanceStats = {
    total: attendance.length,
    present: attendance.filter((a) => a.status === 'Present').length,
    absent: attendance.filter((a) => a.status === 'Absent').length,
    late: attendance.filter((a) => a.status === 'Late').length,
  };

  const paymentStats = {
    total: payments.length,
    completed: payments.filter((p) => p.payment_status === 'Completed').length,
    pending: payments.filter((p) => p.payment_status === 'Pending').length,
    totalAmount: payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
  };

  const assignmentStats = {
    total: assignments.length,
    submitted: assignments.filter((a) => a.status === 'Submitted').length,
    pending: assignments.filter((a) => a.status === 'Pending').length,
  };

  const gradeAverage =
    grades.length > 0
      ? (grades.reduce((sum, g) => sum + (Number(g.percentage) || 0), 0) / grades.length).toFixed(2)
      : 'N/A';
  const studentFullName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
  const tabItems = [
    { value: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { value: 'payments', label: 'Payments', icon: Receipt },
    { value: 'assignments', label: 'Assignments', icon: ClipboardList },
    { value: 'individual-tasks', label: 'Individual Tasks', icon: FileText },
    { value: 'grades', label: 'Grades', icon: GraduationCap },
    { value: 'coins', label: 'Coins', icon: Coins },
  ];

  return (
    <div className="min-h-full space-y-6 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 dark:bg-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          size="sm"
          className="w-fit rounded-lg border-sky-200 bg-white/80 text-sky-900 shadow-sm hover:bg-sky-50 dark:border-border dark:bg-background dark:text-foreground dark:shadow-none"
          onClick={() => navigate('/students')}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Students
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-fit rounded-lg border-emerald-200 bg-white/80 text-emerald-900 shadow-sm hover:bg-emerald-50 dark:border-border dark:bg-background dark:text-foreground dark:shadow-none"
          onClick={handleResetPassword}
          disabled={resettingPassword}
        >
          {resettingPassword ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-1.5 h-4 w-4" />
          )}
          Reset Password
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden rounded-lg border-0 bg-gradient-to-br from-indigo-600 via-sky-500 to-emerald-500 text-white shadow-[0_24px_70px_-35px_rgba(14,165,233,0.9)] dark:border dark:border-border dark:bg-slate-950 dark:bg-none dark:shadow-lg">
        <CardContent className="relative p-0">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-white/80 to-fuchsia-300 dark:hidden" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-amber-300/35 via-white/10 to-transparent dark:from-cyan-500/20 dark:via-emerald-500/10" />
          <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between lg:p-8">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-white/40 bg-white/20 text-3xl font-bold shadow-inner">
                {getInitials(student.first_name, student.last_name)}
              </div>
              <div className="min-w-0 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white/70">Student Profile</p>
                  <h1 className="break-words text-3xl font-bold tracking-normal text-white md:text-4xl">
                    {studentFullName}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('border text-xs font-semibold', getStatusClasses(student.status))}>
                    {student.status || 'Unknown'}
                  </Badge>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90">
                    <User className="h-3.5 w-3.5" />
                    Username: {student.username || '-'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90">
                    <School className="h-3.5 w-3.5" />
                    {student.enrollment_number || 'No enrollment'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90">
                    <BookOpen className="h-3.5 w-3.5" />
                    {classData?.class_name || (student.class_id ? `Class #${student.class_id}` : 'Unassigned')}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:w-[360px]">
              <div className="rounded-lg border border-white/30 bg-white/15 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-white">{student.email || '-'}</p>
              </div>
              <div className="rounded-lg border border-white/30 bg-white/15 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Phone className="h-4 w-4" />
                  Phone
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-white">{student.phone || '-'}</p>
              </div>
              <div className="rounded-lg border border-white/30 bg-white/15 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <User className="h-4 w-4" />
                  Parent
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-white">{student.parent_name || '-'}</p>
              </div>
              <div className="rounded-lg border border-white/30 bg-white/15 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Coins className="h-4 w-4" />
                  Coins
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-white">{coinBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <StudentInfoSection student={student} />

      <Card className="rounded-lg border-emerald-100 bg-white/90 shadow-sm dark:border-border dark:bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <KeyRound className="h-5 w-5" />
            Account Password
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="student-new-password">New Password</Label>
            <Input
              id="student-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSetPassword();
              }}
              placeholder="Enter new password"
              disabled={settingPassword}
            />
          </div>
          <Button onClick={handleSetPassword} disabled={settingPassword || !newPassword.trim()}>
            {settingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Update Password
          </Button>
        </CardContent>
      </Card>

      <StatisticsSection
        attendanceStats={attendanceStats}
        paymentStats={paymentStats}
        assignmentStats={assignmentStats}
        gradeAverage={gradeAverage}
      />

      <div className="overflow-hidden rounded-lg border border-sky-100 bg-white/90 shadow-[0_20px_55px_-40px_rgba(14,165,233,0.7)] dark:border-border dark:bg-card dark:shadow-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-3 py-2 dark:border-border dark:bg-muted/40 dark:bg-none">
            <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0">
              {tabItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="min-h-10 shrink-0 gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 data-[state=active]:bg-white data-[state=active]:text-sky-900 data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === 'attendance' && (
              <AttendanceTab
                attendance={attendance}
                studentId={student.student_id || student.id}
                studentClassId={student.class_id}
                centerId={student.center_id}
                teacherId={classData?.teacher_id}
                onRefresh={loadStudentDetails}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsTab payments={payments} student={student} classData={classData} onRefresh={loadStudentDetails} />
            )}

            {activeTab === 'assignments' && (
              <AssignmentsTab
                assignments={assignments}
                studentClassId={student.class_id}
                studentId={student.student_id || student.id}
                centerId={student.center_id}
                onRefresh={loadStudentDetails}
              />
            )}

            {activeTab === 'individual-tasks' && (
              <IndividualTasksTab
                assignments={assignments}
                studentId={student.student_id || student.id}
                centerId={student.center_id}
                studentClassId={student.class_id}
                onRefresh={loadStudentDetails}
              />
            )}

            {activeTab === 'grades' && (
              <GradesTab
                grades={grades}
                onRefresh={loadStudentDetails}
                studentId={student.student_id || student.id}
                classId={student.class_id}
                teacherId={classData?.teacher_id}
                centerId={student.center_id}
              />
            )}

            {activeTab === 'coins' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Coin Balance</CardTitle>
                    <Button size="sm" onClick={() => setCoinDialogOpen(true)}>
                      Update Coins
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">{coinBalance.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Latest balance for this student.</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {coinTransactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No coin transactions yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Delta</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>By</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {coinTransactions.map((tx) => (
                            <TableRow key={tx.transaction_id}>
                              <TableCell>
                                {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell className={tx.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {tx.delta >= 0 ? '+' : ''}{tx.delta}
                              </TableCell>
                              <TableCell>{tx.reason || '-'}</TableCell>
                              <TableCell className="capitalize">{tx.created_by_type || '-'}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500"
                                  onClick={() => handleDeleteTransaction(tx.transaction_id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <StudentCoinsDialog
                  open={coinDialogOpen}
                  onOpenChange={setCoinDialogOpen}
                  studentId={student.student_id || student.id}
                  studentName={`${student.first_name} ${student.last_name}`}
                  currentCoins={coinBalance}
                  onSaved={refreshCoins}
                />
              </div>
            )}
          </div>
        </Tabs>
      </div>

      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Temporary Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="student-temp-password">Share this password with the student.</Label>
            <div className="flex gap-2">
              <Input
                id="student-temp-password"
                value={resetTempPassword}
                readOnly
              />
              <Button variant="outline" onClick={handleCopyTempPassword}>
                Copy
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetPasswordOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentDetailPage;
