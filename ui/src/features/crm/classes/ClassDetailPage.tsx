import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarDays, Clock, DollarSign, FileQuestion, Loader2, MapPin, PlayCircle, UserRound, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { classAPI, studentAPI, subjectAPI, testAPI } from '@/shared/api/api';
import { getResolvedCenterId } from '@/shared/auth/centerScope';
import { showToast } from '@/utils/toast';
import { formatMoney } from '@/utils/helpers';
import SessionModal from './SessionModal';
import { useAppSelector } from '../hooks';

type ClassItem = {
  class_id?: number;
  id?: number;
  class_name?: string;
  class_code?: string;
  center_id?: number;
  level?: number;
  capacity?: number;
  teacher_id?: number;
  teacher_name?: string;
  room_number?: string;
  payment_amount?: number;
  payment_frequency?: string;
  section?: string;
};

type StudentItem = {
  student_id?: number;
  id?: number;
  class_id?: number;
  first_name?: string;
  last_name?: string;
  enrollment_number?: string;
  status?: string;
  phone?: string;
  deleted_at?: string | null;
};

type ClassSchedule = { days: string[]; time: string };

type AssignedTestItem = {
  test_id?: number;
  id?: number;
  test_name?: string;
  test_type?: string;
  description?: string;
  duration_minutes?: number;
  total_marks?: number;
  passing_marks?: number;
  is_active?: boolean;
  is_mandatory?: boolean;
  assigned_at?: string;
  due_date?: string;
  notes?: string;
};

const parseSchedule = (section?: string): ClassSchedule => {
  if (!section) return { days: [] as string[], time: '' };
  try {
    const parsed = JSON.parse(section);
    return {
      days: Array.isArray(parsed?.days) ? parsed.days.map((day: unknown) => String(day)) : [],
      time: String(parsed?.time || ''),
    };
  } catch {
    return { days: [] as string[], time: '' };
  }
};

const unwrapRows = (response: any) => {
  const data = response?.data ?? response;
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
};

const ClassDetailPage = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const authUser = useAppSelector((state) => state.auth.user);
  const [classData, setClassData] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [assignedTests, setAssignedTests] = useState<AssignedTestItem[]>([]);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionModalId, setSessionModalId] = useState<number | null>(null);
  const [sessionModalDate, setSessionModalDate] = useState('');
  const [sessionModalCenterId, setSessionModalCenterId] = useState<number | undefined>(undefined);
  const [startingLesson, setStartingLesson] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!classId) return;
      setLoading(true);
      setError('');
      try {
        const [classResponse, studentsResponse, subjectsResponse, sessionsResponse, testsResponse] = await Promise.all([
          classAPI.getById(Number(classId)),
          studentAPI.getByClassWithTransfers(Number(classId)).catch(() => ({ data: [] })),
          subjectAPI.getByClass(Number(classId)).catch(() => ({ data: [] })),
          classAPI.getSessions(Number(classId)).catch(() => ({ data: [] })),
          testAPI.getAssignedTests('class', Number(classId)).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const nextClass = classResponse?.data ?? classResponse;
        setClassData(nextClass);
        setStudents(unwrapRows(studentsResponse));
        setSubjects(unwrapRows(subjectsResponse));
        setSessions(unwrapRows(sessionsResponse));
        setAssignedTests(unwrapRows(testsResponse));
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error || err?.response?.data?.details || 'Failed to load class.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const schedule = useMemo(() => parseSchedule(classData?.section), [classData?.section]);
  const className = classData?.class_name || 'Class';
  const activeStudents = students.filter((student) => String(student.status || '').toLowerCase() === 'active').length;
  const transferredStudents = students.filter((student) => String(student.status || '').toLowerCase() === 'transferred').length;
  const capacity = Number(classData?.capacity || 0);
  const fillRate = capacity > 0 ? Math.min(100, Math.round((activeStudents / capacity) * 100)) : 0;
  const todayKey = new Date().toISOString().split('T')[0];
  const teacherName = classData?.teacher_name || 'No teacher assigned';
  const scheduleText = [schedule.days.join(', '), schedule.time].filter(Boolean).join(' / ') || 'No schedule';
  const studentRows = students.filter((student) => !student.deleted_at);
  const recentSessions = sessions.slice(0, 80);
  const statTiles = [
    { label: 'Active students', value: activeStudents, detail: `${transferredStudents} transferred`, icon: Users, color: 'bg-blue-600' },
    { label: 'Capacity', value: capacity || '-', detail: `${fillRate}% used`, icon: BookOpen, color: 'bg-emerald-600' },
    { label: 'Room', value: classData?.room_number || 'Not specified', detail: 'Classroom', icon: MapPin, color: 'bg-amber-500' },
    { label: 'Tuition', value: formatMoney(classData?.payment_amount), detail: classData?.payment_frequency || 'Monthly', icon: DollarSign, color: 'bg-fuchsia-600' },
  ];

  const openSessionWorkflow = (session: any) => {
    const nextSessionId = Number(session.session_id || session.id);
    if (!nextSessionId) return;
    setSessionModalId(nextSessionId);
    setSessionModalDate(session.session_date ? new Date(session.session_date).toISOString().split('T')[0] : todayKey);
    setSessionModalCenterId(Number(session.center_id || classData?.center_id || 0) || getResolvedCenterId(authUser) || undefined);
    setSessionModalOpen(true);
  };

  const handleStartLesson = async () => {
    if (!classData || !classId) return;
    const targetClassId = Number(classData.class_id || classData.id || classId);
    const existingTodaySession = sessions.find((session) => {
      if (!session.session_date) return false;
      return new Date(session.session_date).toISOString().split('T')[0] === todayKey;
    });

    if (existingTodaySession) {
      openSessionWorkflow(existingTodaySession);
      return;
    }

    setStartingLesson(true);
    try {
      const targetCenterId = Number(classData.center_id || 0) || getResolvedCenterId(authUser) || undefined;
      if (!targetCenterId) {
        showToast.error('Please select an active center before starting a lesson.');
        return;
      }
      const response = await classAPI.createSession(targetClassId, {
        center_id: targetCenterId,
        session_date: todayKey,
        start_time: schedule.time || new Date().toTimeString().slice(0, 5),
        duration_minutes: 90,
        teacher_id: authUser?.userType === 'teacher' && authUser?.id ? Number(authUser.id) : Number(classData.teacher_id || 0) || undefined,
      });
      const nextSession = response?.data ?? response;
      setSessions((current) => [...current, nextSession]);
      openSessionWorkflow(nextSession);
    } catch (err) {
      console.error('Failed to start lesson:', err);
      showToast.error('Failed to start lesson.');
    } finally {
      setStartingLesson(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="outline" onClick={() => navigate('/classes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classes
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Class not found.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-4 bg-slate-50 p-4 dark:bg-background">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 bg-slate-800 px-2.5 text-xs font-semibold text-white hover:bg-slate-900"
              onClick={() => navigate('/classes')}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-950 dark:text-card-foreground">{className}</h1>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="rounded-md bg-violet-600 px-2 py-1 text-white">{teacherName}</span>
                {classData.level ? <span className="rounded-md bg-blue-600 px-2 py-1 text-white">Level {classData.level}</span> : null}
                <span className="rounded-md bg-emerald-600 px-2 py-1 text-white">{scheduleText}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={handleStartLesson}
            disabled={startingLesson}
            className="h-9 bg-rose-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
          >
            {startingLesson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            Start Lesson
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {statTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.label} className={`${tile.color} rounded-lg p-3 text-white shadow-sm`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase text-white/75">{tile.label}</p>
                  <p className="mt-0.5 truncate text-lg font-bold">{tile.value}</p>
                  <p className="truncate text-[11px] text-white/80">{tile.detail}</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="students" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-slate-50 p-2 dark:bg-muted/40">
          <TabsTrigger value="students" className="h-8 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">Students</TabsTrigger>
          <TabsTrigger value="overview" className="h-8 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="subjects" className="h-8 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-amber-500 data-[state=active]:text-white">Subjects</TabsTrigger>
          <TabsTrigger value="tests" className="h-8 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-fuchsia-600 data-[state=active]:text-white">Tests</TabsTrigger>
          <TabsTrigger value="sessions" className="h-8 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-rose-600 data-[state=active]:text-white">Sessions</TabsTrigger>
        </TabsList>

        <div className="p-3">
          <TabsContent value="overview" className="mt-0 grid gap-4 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-3 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white"><CalendarDays className="h-4 w-4" /></div>
                  <p className="text-sm font-bold">Schedule</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {schedule.days.length > 0 ? schedule.days.map((day) => <span key={day} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">{day}</span>) : <span className="text-sm text-muted-foreground">No days set</span>}
                </div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {schedule.time || 'No time set'}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Users className="h-4 w-4" /></div>
                  <p className="text-sm font-bold">Capacity health</p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${fillRate}%` }} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{fillRate}% of class capacity is currently used.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentRows.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">No students enrolled.</TableCell></TableRow>
                ) : studentRows.map((student, index) => {
                  const isTransferred = String(student.status || '').toLowerCase() === 'transferred';
                  return (
                  <TableRow key={student.student_id || student.id} className={isTransferred ? 'bg-amber-50/60 text-muted-foreground dark:bg-amber-950/10' : 'hover:bg-sky-50/60'}>
                    <TableCell className="py-2 font-semibold">
                      <div className="flex items-center gap-2">
                        <div className={`${index % 4 === 0 ? 'bg-blue-600' : index % 4 === 1 ? 'bg-emerald-600' : index % 4 === 2 ? 'bg-amber-500' : 'bg-fuchsia-600'} flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white`}>
                          {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                        </div>
                        <span>{student.first_name} {student.last_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={isTransferred ? 'bg-amber-500 text-white hover:bg-amber-500' : 'bg-emerald-600 text-white hover:bg-emerald-600'}>
                        {isTransferred ? 'Transferred' : student.status || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="subjects" className="mt-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.length === 0 ? (
              <div className="text-sm text-muted-foreground">No subjects assigned.</div>
            ) : subjects.map((subject) => (
              <Card key={subject.subject_id || subject.id}>
                <CardContent className="p-4">
                  <p className="font-semibold">{subject.subject_name || subject.name || 'Subject'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{subject.description || subject.subject_code || 'No description'}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tests" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedTests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileQuestion className="h-8 w-8 text-muted-foreground/60" />
                        <span>No tests assigned to this class.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : assignedTests.map((test) => {
                  const testId = Number(test.test_id || test.id || 0);
                  return (
                    <TableRow key={`${testId}-${test.assigned_at || ''}`}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">{test.test_name || 'Untitled test'}</p>
                          {test.description && <p className="line-clamp-2 text-xs text-muted-foreground">{test.description}</p>}
                          <div className="flex flex-wrap gap-1">
                            {test.duration_minutes ? <Badge variant="outline">{test.duration_minutes} min</Badge> : null}
                            {test.is_mandatory ? <Badge variant="secondary">Mandatory</Badge> : <Badge variant="outline">Optional</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{test.test_type || '-'}</TableCell>
                      <TableCell>
                        {test.total_marks ?? '-'}
                        {test.passing_marks ? <span className="text-xs text-muted-foreground"> / pass {test.passing_marks}</span> : null}
                      </TableCell>
                      <TableCell>{test.due_date ? new Date(test.due_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={test.is_active === false ? 'outline' : 'secondary'}>
                          {test.is_active === false ? 'Inactive' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => testId && navigate(`/tests/${testId}`)} disabled={!testId}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="sessions" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No sessions generated.</TableCell></TableRow>
                ) : sessions.slice(0, 80).map((session) => (
                  <TableRow key={session.session_id || session.id}>
                    <TableCell>{session.session_date ? new Date(session.session_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{session.start_time || '-'}</TableCell>
                    <TableCell>{session.duration_minutes ? `${session.duration_minutes} min` : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-between gap-3">
                        <span>{session.status || '-'}</span>
                        <Button variant="outline" size="sm" onClick={() => openSessionWorkflow(session)}>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Open
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </div>
      </Tabs>

      <SessionModal
        open={sessionModalOpen}
        classData={classData}
        sessionId={sessionModalId}
        selectedDate={sessionModalDate}
        onClose={() => {
          setSessionModalOpen(false);
          setSessionModalId(null);
          setSessionModalDate('');
          setSessionModalCenterId(undefined);
        }}
        sessionCenterId={sessionModalCenterId}
      />
    </div>
  );
};

export default ClassDetailPage;
