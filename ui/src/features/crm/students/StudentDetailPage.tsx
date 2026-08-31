// Page component for the students screen in the crm feature.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  ClipboardList,
  Coins,
  FileText,
  GraduationCap,
  KeyRound,
  Loader2,
  PencilLine,
  Receipt,
  Save,
  Trash2,
  User,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { studentAPI, classAPI, teacherAPI } from './api';
import { AttendanceTab, PaymentsTab, AssignmentsTab, IndividualTasksTab, GradesTab } from './tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { getListRowBackground } from '../settings/listAppearance';
import { StudentOverviewCards } from './components/StudentOverviewCards';
import { buildStudentOverviewRows, buildStudentOverviewUpdate, createStudentOverviewDraft, getNextStudentAccountStatus, splitStudentOverviewRows, STUDENT_OVERVIEW_EDIT_FIELDS, type StudentOverviewDraft } from './studentOverview';

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
  teacher_id?: number;
  coins?: number;
  username?: string;
  school_name?: string | null;
  school_class?: string | null;
  created_at?: string;
  createdAt?: string;
}

interface Teacher {
  teacher_id?: number;
  id?: number;
  first_name?: string;
  last_name?: string;
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

// const getInitials = (firstName?: string, lastName?: string) =>
//   `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'ST';

// const getStatusClasses = (status?: string) => {
//   switch (status?.toLowerCase()) {
//     case 'active':
//       return 'border-emerald-200 bg-emerald-50 text-emerald-700';
//     case 'inactive':
//       return 'border-rose-200 bg-rose-50 text-rose-700';
//     case 'suspended':
//       return 'border-amber-200 bg-amber-50 text-amber-700';
//     default:
//       return 'border-slate-200 bg-slate-50 text-slate-700';
//   }
// };

// Renders the student detail page screen.
const StudentDetailPage = () => {
  const dispatch = useAppDispatch();
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [classData, setClassData] = useState<Class | null>(null);
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
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
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewDraft, setOverviewDraft] = useState<StudentOverviewDraft | null>(null);
  const [savingOverview, setSavingOverview] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  // for hiding the password field
  const [isUpdatePassword, setIsUpdatePassword] = useState(false);
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
    setClassData(null);
    setTeacherData(null);
    try {
      const studentResponse = await studentAPI.getById(Number(studentId));
      const studentData = studentResponse.data || studentResponse;
      setStudent(studentData);

      if (studentData.class_id) {
        try {
          const classResponse = await classAPI.getById(studentData.class_id);
          const classDataResponse = classResponse.data || classResponse;
          setClassData(classDataResponse);
          const teacherId = Number(classDataResponse?.teacher_id || studentData.teacher_id || 0);
          if (teacherId) {
            try {
              const teacherResponse = await teacherAPI.getById(teacherId);
              setTeacherData(teacherResponse.data || teacherResponse);
            } catch (err) {
              console.error('Error loading teacher data:', err);
            }
          }
        } catch (err) {
          console.error('Error loading class data:', err);
        }
      } else if (studentData.teacher_id) {
        try {
          const teacherResponse = await teacherAPI.getById(studentData.teacher_id);
          setTeacherData(teacherResponse.data || teacherResponse);
        } catch (err) {
          console.error('Error loading teacher data:', err);
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

  const startOverviewEdit = () => {
    if (!student) return;
    setOverviewDraft(createStudentOverviewDraft(student));
    setIsEditingOverview(true);
  };

  const cancelOverviewEdit = () => {
    setOverviewDraft(null);
    setIsEditingOverview(false);
  };

  const saveOverview = async () => {
    if (!studentId || !overviewDraft) return;
    if (!overviewDraft.first_name.trim() || !overviewDraft.last_name.trim()) {
      showToast.error('First name and last name are required.');
      return;
    }
    setSavingOverview(true);
    try {
      await studentAPI.update(Number(studentId), buildStudentOverviewUpdate(overviewDraft));
      await loadStudentDetails();
      setOverviewDraft(null);
      setIsEditingOverview(false);
      showToast.success('Student information updated successfully.');
    } catch (error: unknown) {
      showToast.error(getErrorMessage(error) || 'Failed to update student information.');
    } finally {
      setSavingOverview(false);
    }
  };

  const toggleStudentStatus = async () => {
    if (!studentId || !student) return;
    const nextStatus = getNextStudentAccountStatus(student.status);
    setChangingStatus(true);
    try {
      await studentAPI.update(Number(studentId), { status: nextStatus });
      await loadStudentDetails();
      showToast.success(`Student account is now ${nextStatus.toLowerCase()}.`);
    } catch (error: unknown) {
      showToast.error(getErrorMessage(error) || 'Failed to change student status.');
    } finally {
      setChangingStatus(false);
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

  const studentFullName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
  const teacherName = teacherData ? [teacherData.first_name, teacherData.last_name].filter(Boolean).join(' ').trim() : '';
  const groupName = classData?.class_name || '';
  const overviewRows = buildStudentOverviewRows({ student, groupName, teacherName, coinBalance });
  const overviewColumns = splitStudentOverviewRows(overviewRows);
  const tabItems = [
    { value: 'overview', label: 'Overview', icon: User },
    { value: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { value: 'payments', label: 'Payments', icon: Receipt },
    { value: 'assignments', label: 'Assignments', icon: ClipboardList },
    { value: 'individual-tasks', label: 'Individual Tasks', icon: FileText },
    { value: 'grades', label: 'Grades', icon: GraduationCap },
    { value: 'coins', label: 'Coins', icon: Coins },
  ];

  return (
    <div className="owner-palette-scope min-h-full space-y-3 bg-slate-50 p-3 dark:bg-background md:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          size="sm"
          className="h-8 w-fit rounded-lg bg-sky-600 text-xs text-white shadow-sm hover:bg-sky-700"
          onClick={() => navigate('/students')}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Students
        </Button>
        <Button
          size="sm"
          className="h-8 w-fit rounded-lg bg-emerald-600 text-xs text-white shadow-sm hover:bg-emerald-700"
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
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      <Card className="owner-tertiary-card overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="flex flex-col gap-2 p-3 lg:flex-row lg:items-center lg:justify-between">
              <h1 className="truncate text-base font-bold text-slate-950 dark:text-foreground">{studentFullName}</h1>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={String(student.status).toLowerCase() === 'active' ? 'destructive' : 'default'}
              className={String(student.status).toLowerCase() === 'active' ? 'h-8 text-xs' : 'h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700'}
              onClick={toggleStudentStatus}
              disabled={changingStatus}
            >
              {changingStatus ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : String(student.status).toLowerCase() === 'active' ? <UserX className="mr-1.5 h-3.5 w-3.5" /> : <UserCheck className="mr-1.5 h-3.5 w-3.5" />}
              {changingStatus ? 'Updating...' : String(student.status).toLowerCase() === 'active' ? 'Set inactive' : 'Set active'}
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={()=>setIsUpdatePassword((prev)=>!prev)}>Update student password</Button>
          </div>

        </CardContent>
      </Card>


      {activeTab === 'overview' && (
        <>
         {isUpdatePassword && <Card className="owner-tertiary-card rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <KeyRound className="h-4 w-4" />
                {/* Account Password */}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-3 pt-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="space-y-1">
                <Label htmlFor="student-new-password" className="text-xs">New Password</Label>
                <Input
                  id="student-new-password"
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
          </Card>}


        </>
      )}

      <div className="owner-tertiary-card overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-slate-200 bg-white px-2 py-2 dark:border-border dark:bg-muted/40">
            <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0">
              {tabItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="p-3">
            {activeTab === 'overview' && (
              <div className="space-y-3">
                <div className="flex justify-end gap-2">
                  {isEditingOverview ? (
                    <>
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={cancelOverviewEdit} disabled={savingOverview}>
                        <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
                      </Button>
                      <Button type="button" size="sm" className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={saveOverview} disabled={savingOverview}>
                        {savingOverview ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                        {savingOverview ? 'Saving...' : 'Save changes'}
                      </Button>
                    </>
                  ) : (
                    <Button type="button" size="sm" className="h-8 bg-sky-600 text-xs text-white hover:bg-sky-700" onClick={startOverviewEdit}>
                      <PencilLine className="mr-1.5 h-3.5 w-3.5" /> Edit information
                    </Button>
                  )}
                </div>
                {!isEditingOverview ? (
                  <StudentOverviewCards
                    student={student}
                    groupName={groupName}
                    teacherName={teacherName}
                    coinBalance={coinBalance}
                  />
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
                    {[
                      { title: 'Main information', rows: overviewColumns.main },
                      { title: 'Contact & additional information', rows: overviewColumns.additional },
                    ].map((section) => (
                    <section key={section.title} className="overflow-hidden rounded-md border border-slate-200 dark:border-border">
                      <div className="border-b bg-slate-50 px-3 py-2 dark:border-border dark:bg-muted/40">
                        <h2 className="text-sm font-bold text-slate-950 dark:text-card-foreground">{section.title}</h2>
                      </div>
                      <dl data-alternating-list="true" className="divide-y divide-slate-200 text-sm dark:divide-border">
                        {section.rows.map((item, index) => (
                          <div
                            key={item.label}
                            data-list-row="true"
                            className="grid min-h-9 grid-cols-[125px_minmax(0,1fr)] items-center gap-3 px-3 py-2 sm:grid-cols-[170px_minmax(0,1fr)]"
                            style={{ backgroundColor: getListRowBackground(index) }}
                          >
                            <dt className="font-medium text-muted-foreground">{item.label}</dt>
                            <dd className="min-w-0 break-words font-semibold text-slate-950 dark:text-card-foreground">
                              {overviewDraft && STUDENT_OVERVIEW_EDIT_FIELDS[item.label] ? (
                                <Input
                                  type={STUDENT_OVERVIEW_EDIT_FIELDS[item.label] === 'date_of_birth' ? 'date' : 'text'}
                                  value={overviewDraft[STUDENT_OVERVIEW_EDIT_FIELDS[item.label]]}
                                  onChange={(event) => setOverviewDraft((current) => current ? ({ ...current, [STUDENT_OVERVIEW_EDIT_FIELDS[item.label]]: event.target.value }) : current)}
                                  className="h-8 bg-white text-xs dark:bg-slate-900"
                                  aria-label={item.label}
                                />
                              ) : item.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                    ))}
                  </div>
                )}
              </div>
            )}

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
              <div className="space-y-3">
                <Card className="border-0 bg-amber-500 text-white shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between p-3">
                    <CardTitle className="text-base">Coin Balance</CardTitle>
                    <Button size="sm" className="h-8 bg-white text-xs text-amber-700 hover:bg-white/90" onClick={() => setCoinDialogOpen(true)}>
                      Update Coins
                    </Button>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-2xl font-semibold">{coinBalance.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-white/80">Latest balance for this student.</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm dark:border-border">
                  <CardHeader className="p-3">
                    <CardTitle className="text-base">Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {coinTransactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No coin transactions yet.</p>
                    ) : (
                      <Table className="text-xs">
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
