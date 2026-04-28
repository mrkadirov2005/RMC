// Page component for the teachers screen in the crm feature.

import { useState, useEffect } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { useParams, useNavigate } from 'react-router-dom';
import { gradeAPI } from '../../../shared/api/api';
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
import { teacherAPI } from '../../../shared/api/api';

interface GradeEntry {
  student_id: number;
  percentage: number;
  grade_letter: string;
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
  const classes = useAppSelector((state) =>
    state.classes.items.filter((c) => String(c.teacher_id) === String(teacherId))
  );
  const students = useAppSelector((state) =>
    state.students.items.filter((s) => classes.some((c) => (c.class_id || c.id) === s.class_id))
  );
  const subjects = useAppSelector((state) =>
    state.subjects.items.filter((s) => classes.some((c) => (c.class_id || c.id) === s.class_id))
  );
  const assignments = useAppSelector((state) =>
    state.assignments.items.filter((a) => String(a.teacher_id) === String(teacherId))
  );
  const payments = useAppSelector((state) => state.payments.items);
  const loading = useAppSelector((state) => state.teachers.loading || state.classes.loading || state.students.loading || state.subjects.loading || state.assignments.loading || state.payments.loading);
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
  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState(() => new Date().toISOString().slice(0, 7));

// Runs side effects for this component.
  useEffect(() => {
    // Dispatch thunks to load all required data
    dispatch({ type: 'teachers/fetchTeachers' });
    dispatch({ type: 'classes/fetchClasses' });
    dispatch({ type: 'students/fetchStudents' });
    dispatch({ type: 'subjects/fetchSubjects' });
    dispatch({ type: 'assignments/fetchAssignments' });
    dispatch({ type: 'payments/fetchPayments' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, teacherId]);

// Returns students by class.
  const getStudentsByClass = (classId: number | undefined) => {
    if (!classId) return [];
    return students.filter((s) => s.class_id === classId);
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
      dispatch({ type: 'teachers/fetchTeachers' });
      dispatch({ type: 'classes/fetchClasses' });
      dispatch({ type: 'students/fetchStudents' });
      dispatch({ type: 'subjects/fetchSubjects' });
      dispatch({ type: 'assignments/fetchAssignments' });
      dispatch({ type: 'payments/fetchPayments' });
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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          className="rounded-lg"
          onClick={() => navigate('/teachers')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold flex-grow">Teacher Details</h1>
        <Button
          variant="outline"
          className="rounded-lg"
          onClick={handleResetPassword}
          disabled={resettingPassword}
        >
          {resettingPassword ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          Reset Password
        </Button>
        <Button
          className="bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg"
          onClick={handleOpenGradeModal}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Grades
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Teacher Profile Card */}
      <Card className="mb-6 rounded-2xl overflow-hidden shadow-lg border-0">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-8 flex items-center gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white bg-white/20 border-4 border-white/40 shrink-0">
            {getInitials(teacher.first_name, teacher.last_name)}
          </div>
          <div className="flex-grow">
            <h2 className="text-3xl font-bold text-white">
              {teacher.first_name} {teacher.last_name}
            </h2>
            <p className="text-white/80 mt-1">{teacher.specialization}</p>
            <div className="flex gap-2 mt-3">
              <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', getStatusClasses(teacher.status))}>
                {teacher.status}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-white/50 text-white bg-white/10">
                {teacher.employee_id}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-white bg-white/20">
              <BookOpen className="h-4 w-4" />
              {classes.length} Classes
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-white bg-white/20">
              <User className="h-4 w-4" />
              {students.filter(s => classes.some(c => (c.class_id || c.id) === s.class_id)).length} Students
            </span>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card className="rounded-2xl overflow-hidden">
        <Tabs value={tabValue} onValueChange={setTabValue}>
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-14 px-2">
            <TabsTrigger value="info" className="gap-2 text-base font-semibold data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <User className="h-4 w-4" />
              Information
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-2 text-base font-semibold data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <BookOpen className="h-4 w-4" />
              Classes & Students
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2 text-base font-semibold data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <ClipboardList className="h-4 w-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="tests" className="gap-2 text-base font-semibold data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <FileQuestion className="h-4 w-4" />
              Tests
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2 text-base font-semibold data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <Wallet className="h-4 w-4" />
              Payments
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            {/* Tab: Information */}
            <TabsContent value="info">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border rounded-lg h-full">
                  <CardHeader>
                    <CardTitle className="text-indigo-600">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Username</p>
                        <p className="text-sm">{teacher.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm">{teacher.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm">{teacher.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date of Birth</p>
                        <p className="text-sm">
                          {teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border rounded-lg h-full">
                  <CardHeader>
                    <CardTitle className="text-indigo-600">Professional Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Employee ID</p>
                        <p className="text-sm">{teacher.employee_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Qualification</p>
                        <p className="text-sm">{teacher.qualification}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Specialization</p>
                        <p className="text-sm">{teacher.specialization}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Classes & Students */}
            <TabsContent value="classes">
              {classes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-16 w-16 mx-auto opacity-30 mb-4" />
                  <h3 className="text-lg font-semibold">No classes assigned to this teacher</h3>
                </div>
              ) : (
                <div className="space-y-3">
                  {classes.map((classItem) => {
                    const classId = classItem.class_id || classItem.id || 0;
                    const classStudents = getStudentsByClass(classId);
                    const isExpanded = expandedClassIds.has(classId);
                    return (
                      <div
                        key={classId}
                        className="rounded-xl border shadow-sm overflow-hidden"
                      >
                        {/* Accordion Header */}
                        <button
                          type="button"
                          onClick={() => toggleClassExpanded(classId)}
                          className="w-full flex items-center gap-4 p-4  hover:bg-blue-900  transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="flex-grow">
                            <h3 className="text-lg font-semibold">{classItem.class_name}</h3>
                            <p className="text-sm text-muted-foreground">Level: {classItem.level || 'N/A'}</p>
                          </div>
                          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 font-semibold">
                            {classStudents.length} Students
                          </Badge>
                          <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                        </button>
                        {/* Accordion Content */}
                        {isExpanded && (
                          <div>
                            <Table>
                              <TableHeader>
                                <TableRow className=" hover:text-black">
                                  <TableHead className="font-semibold">Enrollment #</TableHead>
                                  <TableHead className="font-semibold">Name</TableHead>
                                  <TableHead className="font-semibold">Email</TableHead>
                                  <TableHead className="font-semibold">Phone</TableHead>
                                  <TableHead className="font-semibold">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {classStudents.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6">
                                      No students in this class
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  classStudents.map((student) => (
                                    <TableRow key={student.student_id || student.id} className="hover:bg-muted/50">
                                      <TableCell>{student.enrollment_number}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                                            {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                          </div>
                                          {student.first_name} {student.last_name}
                                        </div>
                                      </TableCell>
                                      <TableCell>{student.email}</TableCell>
                                      <TableCell>{student.phone}</TableCell>
                                      <TableCell>
                                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', getStatusClasses(student.status))}>
                                          {student.status}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Tab: Assignments */}
            <TabsContent value="assignments">
              <AssignmentSectionTeacher
                assignments={assignments}
                teacherId={teacher?.teacher_id || teacher?.id}
                onRefresh={() => {
                  dispatch({ type: 'teachers/fetchTeachers' });
                  dispatch({ type: 'classes/fetchClasses' });
                  dispatch({ type: 'students/fetchStudents' });
                  dispatch({ type: 'subjects/fetchSubjects' });
                  dispatch({ type: 'assignments/fetchAssignments' });
                  dispatch({ type: 'payments/fetchPayments' });
                }}
              />
            </TabsContent>

            {/* Tab: Tests */}
            <TabsContent value="tests">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Tests Management</h3>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => navigate('/tests')}
                    >
                      <FileQuestion className="mr-2 h-4 w-4" />
                      View All Tests
                    </Button>
                    <Button
                      className="bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg"
                      onClick={() => navigate('/tests/create')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Test
                    </Button>
                  </div>
                </div>
                <Alert className="rounded-lg border-blue-200 bg-blue-50 text-blue-800">
                  <AlertDescription>
                    Navigate to the Tests section to create, assign, and manage tests for your classes and students.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* Tab: Payments */}
            <TabsContent value="payments">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center sm:flex-row flex-col sm:items-center gap-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-indigo-500" />
                    Student Payments
                  </h3>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="payment-month" className="font-semibold whitespace-nowrap">Select Month:</Label>
                    <div className="relative">
                      <Input
                        id="payment-month"
                        type="month"
                        value={selectedPaymentMonth}
                        onChange={(e) => setSelectedPaymentMonth(e.target.value)}
                        className="w-[180px] pl-10"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                {classes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="h-16 w-16 mx-auto opacity-30 mb-4" />
                    <h3 className="text-lg font-semibold">No classes assigned to this teacher</h3>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {classes.map((classItem) => {
                      const classId = classItem.class_id || classItem.id || 0;
                      const classStudents = getStudentsByClass(classId);

                      return (
                        <div key={classId} className="rounded-2xl border shadow-sm overflow-hidden bg-card text-card-foreground hover:shadow-md transition-shadow duration-300">
                          <div className="bg-gradient-to-r from-indigo-50/50 dark:from-indigo-950/30 to-card p-5 border-b relative">
                            <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-indigo-100/30 dark:from-indigo-900/20 to-transparent pointer-events-none" />
                            <h4 className="text-lg font-bold text-foreground flex justify-between items-center relative z-10">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-background rounded-lg text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900">
                                  <BookOpen className="h-5 w-5" />
                                </div>
                                <span>{classItem.class_name} <span className="text-muted-foreground text-sm font-normal ml-2 hidden sm:inline">({classItem.level})</span></span>
                              </div>
                              <Badge variant="secondary" className="bg-background hover:bg-muted shadow-sm border">{classStudents.length} Students</Badge>
                            </h4>
                          </div>
                          <div className="p-0">
                            <Table>
                              <TableHeader className="bg-muted/30">
                                <TableRow className="border-b-border">
                                  <TableHead className="font-semibold text-foreground pl-6">Student</TableHead>
                                  <TableHead className="font-semibold text-foreground hidden sm:table-cell">Enrollment #</TableHead>
                                  <TableHead className="font-semibold text-foreground text-right pr-6">Payment Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {classStudents.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No students</TableCell>
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
                                        <TableCell className="pl-6 font-medium">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 dark:from-indigo-900/50 to-purple-100 dark:to-purple-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0 border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm">
                                              {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                            </div>
                                            <div>
                                              <p>{student.first_name} {student.last_name}</p>
                                              <p className="text-xs text-muted-foreground font-normal sm:hidden">{student.enrollment_number}</p>
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground hidden sm:table-cell">{student.enrollment_number}</TableCell>
                                        <TableCell className="text-right pr-6">
                                          {hasPaid ? (
                                            <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/20 px-3 py-1 shadow-sm font-semibold">
                                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" /> Paid
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border-rose-200 dark:border-rose-500/20 px-3 py-1 shadow-sm font-semibold">
                                              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2" /> Unpaid
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
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Temporary Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="teacher-temp-password">Share this password with the teacher.</Label>
            <div className="flex gap-2">
              <Input
                id="teacher-temp-password"
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

      {/* Grade Modal */}
      <Dialog open={isGradeModalOpen} onOpenChange={(open) => { if (!open) handleCloseGradeModal(); }}>
        <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-br from-indigo-500 to-purple-500 p-6">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white text-lg font-semibold">
                Add Grades to Students
              </DialogTitle>
              <button onClick={handleCloseGradeModal} className="text-white hover:text-white/80">
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Select Class</Label>
                <Select value={String(selectedClassId || '')} onValueChange={(value) => handleClassSelect(Number(value))}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Select Subject</Label>
                <Select value={String(selectedSubjectId || '')} onValueChange={(value) => setSelectedSubjectId(Number(value))}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Select Term</Label>
                <Select value={selectedTerm} onValueChange={(value) => setSelectedTerm(value)}>
                  <SelectTrigger>
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
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Enter Grades for Students</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-indigo-50/50">
                        <TableHead className="font-semibold">Enrollment #</TableHead>
                        <TableHead className="font-semibold">Student Name</TableHead>
                        <TableHead className="font-semibold">Percentage</TableHead>
                        <TableHead className="font-semibold">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeEntries.map((entry, index) => {
                        const student = students.find((s) => (s.student_id || s.id) === entry.student_id);
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
                                className="w-24"
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

          <DialogFooter className="p-6 pt-0">
            <Button variant="outline" className="rounded-lg" onClick={handleCloseGradeModal}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg px-8"
              onClick={handleSaveGrades}
              disabled={isSavingGrades || !selectedClassId || !selectedSubjectId || gradeEntries.length === 0}
            >
              {isSavingGrades ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Grades'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDetailPage;
