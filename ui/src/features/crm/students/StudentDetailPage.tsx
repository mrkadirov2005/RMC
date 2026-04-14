import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2, KeyRound } from 'lucide-react';
import { studentAPI, attendanceAPI, paymentAPI, assignmentAPI, gradeAPI, classAPI } from '../../../shared/api/api';
import { StudentInfoSection } from './components/StudentInfoSection';
import { StatisticsSection } from './components/StatisticsSection';
import { AttendanceTab, PaymentsTab, AssignmentsTab, IndividualTasksTab, GradesTab } from './tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StudentCoinsDialog } from '@/shared/components/StudentCoinsDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showToast } from '@/utils/toast';
import { generateTempPassword } from '@/utils/password';

interface Class {
  class_id?: number;
  id?: number;
  payment_amount?: number;
  class_name?: string;
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

const StudentDetailPage = () => {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('attendance');

  useEffect(() => {
    loadStudentDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

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
        attendanceAPI.getAll(),
        paymentAPI.getAll(),
        assignmentAPI.getAll(),
        gradeAPI.getAll(),
        studentAPI.getCoins(Number(studentId)).catch(() => null),
      ]);

      const attendanceData = attendanceRes.data || attendanceRes;
      const paymentData = paymentRes.data || paymentRes;
      const assignmentData = assignmentRes.data || assignmentRes;
      const gradeData = gradeRes.data || gradeRes;
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
          ? assignmentData.filter((a: Record<string, unknown>) => Number(a.class_id) === studentClassId || studentId)
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

  const refreshCoins = async () => {
    try {
      const coinsRes = await studentAPI.getCoins(Number(studentId));
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

  const handleDeleteTransaction = async (transactionId?: number) => {
    if (!transactionId || !studentId) return;
    try {
      await studentAPI.deleteCoinTransaction(Number(studentId), transactionId);
      await refreshCoins();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Students
        </Button>
        <h1 className="text-3xl font-bold text-foreground flex-grow">
          {student.first_name} {student.last_name}
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetPassword}
          disabled={resettingPassword}
        >
          {resettingPassword ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4 mr-1.5" />
          )}
          Reset Password
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <StudentInfoSection student={student} />

      <StatisticsSection
        attendanceStats={attendanceStats}
        paymentStats={paymentStats}
        assignmentStats={assignmentStats}
        gradeAverage={gradeAverage}
      />

      {/* Tab Menu */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="individual-tasks">Individual Tasks</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="coins">Coins</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab Content */}
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
              <p className="text-xs text-muted-foreground mt-1">Latest balance for this student.</p>
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
