import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarDays, Clock, DollarSign, Loader2, MapPin, PlayCircle, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { classAPI, studentAPI, subjectAPI } from '@/shared/api/api';
import { showToast } from '@/utils/toast';
import SessionModal from './SessionModal';

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
};

type ClassSchedule = { days: string[]; time: string };

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
  const [classData, setClassData] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionModalId, setSessionModalId] = useState<number | null>(null);
  const [sessionModalDate, setSessionModalDate] = useState('');
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
        const [classResponse, studentsResponse, subjectsResponse, sessionsResponse] = await Promise.all([
          classAPI.getById(Number(classId)),
          studentAPI.getAll().catch(() => ({ data: [] })),
          subjectAPI.getByClass(Number(classId)).catch(() => ({ data: [] })),
          classAPI.getSessions(Number(classId)).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const nextClass = classResponse?.data ?? classResponse;
        setClassData(nextClass);
        setStudents(unwrapRows(studentsResponse).filter((student: StudentItem) => Number(student.class_id) === Number(classId)));
        setSubjects(unwrapRows(subjectsResponse));
        setSessions(unwrapRows(sessionsResponse));
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
  const capacity = Number(classData?.capacity || 0);
  const fillRate = capacity > 0 ? Math.min(100, Math.round((students.length / capacity) * 100)) : 0;
  const todayKey = new Date().toISOString().split('T')[0];

  const openSessionWorkflow = (session: any) => {
    const nextSessionId = Number(session.session_id || session.id);
    if (!nextSessionId) return;
    setSessionModalId(nextSessionId);
    setSessionModalDate(session.session_date ? new Date(session.session_date).toISOString().split('T')[0] : todayKey);
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
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const response = await classAPI.createSession(targetClassId, {
        session_date: todayKey,
        start_time: schedule.time || new Date().toTimeString().slice(0, 5),
        duration_minutes: 90,
        teacher_id: user?.userType === 'teacher' && user?.id ? Number(user.id) : Number(classData.teacher_id || 0) || undefined,
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
    <div className="min-h-full space-y-6 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-6 dark:bg-none">
      <Button
        variant="outline"
        className="rounded-lg border-indigo-200 bg-white/80 text-indigo-900 shadow-sm hover:bg-indigo-50 dark:border-border dark:bg-background dark:text-foreground"
        onClick={() => navigate('/classes')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Classes
      </Button>

      <Card className="overflow-hidden rounded-lg border-0 bg-gradient-to-br from-indigo-600 via-sky-500 to-emerald-500 text-white shadow-[0_24px_70px_-35px_rgba(99,102,241,0.9)]">
        <CardContent className="relative p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-white/70">Class Profile</p>
              <h1 className="text-3xl font-bold md:text-4xl">{className}</h1>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-white/30 bg-white/15 text-white">Code: {classData.class_code || '-'}</Badge>
                <Badge variant="outline" className="border-white/30 bg-white/15 text-white">Level {classData.level || '-'}</Badge>
                <Badge variant="outline" className="border-white/30 bg-white/15 text-white">{classData.teacher_name || 'No teacher assigned'}</Badge>
              </div>
              <Button
                onClick={handleStartLesson}
                disabled={startingLesson}
                className="mt-2 bg-white text-indigo-700 hover:bg-white/90"
              >
                {startingLesson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Start Lesson
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[460px]">
              <div className="rounded-lg border border-white/30 bg-white/15 p-4 backdrop-blur">
                <Users className="mb-2 h-5 w-5 text-white/75" />
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-xs text-white/70">{activeStudents} active students</p>
              </div>
              <div className="rounded-lg border border-white/30 bg-white/15 p-4 backdrop-blur">
                <BookOpen className="mb-2 h-5 w-5 text-white/75" />
                <p className="text-2xl font-bold">{fillRate}%</p>
                <p className="text-xs text-white/70">{students.length} / {capacity || '-'} seats</p>
              </div>
              <div className="rounded-lg border border-white/30 bg-white/15 p-4 backdrop-blur">
                <MapPin className="mb-2 h-5 w-5 text-white/75" />
                <p className="truncate text-sm font-semibold">{classData.room_number || 'No room'}</p>
              </div>
              <div className="rounded-lg border border-white/30 bg-white/15 p-4 backdrop-blur">
                <DollarSign className="mb-2 h-5 w-5 text-white/75" />
                <p className="truncate text-sm font-semibold">${Number(classData.payment_amount || 0).toLocaleString()} {classData.payment_frequency || ''}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="overflow-hidden rounded-lg border border-indigo-100 bg-white/90 shadow-sm dark:border-border dark:bg-card">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-indigo-50/70 p-2 dark:bg-muted/40">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <div className="p-5">
          <TabsContent value="overview" className="mt-0 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Days</p>
                <div className="flex flex-wrap gap-2">
                  {schedule.days.length > 0 ? schedule.days.map((day) => <Badge key={day} variant="secondary">{day}</Badge>) : <span className="text-sm text-muted-foreground">No days set</span>}
                </div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {schedule.time || 'No time set'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Capacity Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: `${fillRate}%` }} />
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
                  <TableHead>Enrollment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No students enrolled.</TableCell></TableRow>
                ) : students.map((student) => (
                  <TableRow key={student.student_id || student.id}>
                    <TableCell className="font-semibold">{student.first_name} {student.last_name}</TableCell>
                    <TableCell>{student.enrollment_number || '-'}</TableCell>
                    <TableCell>{student.status || '-'}</TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
                  </TableRow>
                ))}
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
        }}
      />
    </div>
  );
};

export default ClassDetailPage;
