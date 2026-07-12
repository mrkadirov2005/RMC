import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Loader2, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { attendanceAPI, classAPI, gradeAPI, studentAPI } from '@/shared/api/api';
import { getResolvedCenterId } from '@/shared/auth/centerScope';
import { showToast } from '@/utils/toast';
import { useAppSelector } from '../hooks';
import { ScoreTable, StepTile, type ScoreOption } from './components/SessionWorkflowScoring';

const toPointMap = (options: ScoreOption[]) => Object.fromEntries(options.map((option) => [option.label, option.score]));

const ATTENDANCE_OPTIONS: ScoreOption[] = [
  { label: 'On time', score: 50, symbol: '✓', fill: 100, tone: 'emerald' },
  { label: 'Late', score: 40, symbol: '◕', fill: 80, tone: 'amber' },
  { label: 'Excused', score: 30, symbol: '◐', fill: 60, tone: 'sky' },
  { label: 'Absent', score: 0, symbol: '○', fill: 0, tone: 'rose' },
];

const HOMEWORK_OPTIONS: ScoreOption[] = [
  { label: 'Excellent', score: 20, symbol: '😍', fill: 100, tone: 'emerald' },
  { label: 'Good', score: 15, symbol: '🙂', fill: 75, tone: 'sky' },
  { label: 'Half', score: 10, symbol: '😐', fill: 50, tone: 'amber' },
  { label: 'Weak', score: 5, symbol: '😕', fill: 25, tone: 'orange' },
  { label: 'None', score: 0, symbol: '😞', fill: 0, tone: 'rose' },
];

const ACTIVITY_OPTIONS: ScoreOption[] = [
  { label: 'Very active', score: 30, symbol: '★', fill: 100, tone: 'violet' },
  { label: 'Average', score: 20, symbol: '●', fill: 66, tone: 'sky' },
  { label: 'Weak', score: 10, symbol: '◔', fill: 33, tone: 'amber' },
  { label: 'No activity', score: 0, symbol: '○', fill: 0, tone: 'rose' },
];

const ATTENDANCE_POINTS: Record<string, number> = toPointMap(ATTENDANCE_OPTIONS);
const HOMEWORK_POINTS: Record<string, number> = toPointMap(HOMEWORK_OPTIONS);
const ACTIVITY_POINTS: Record<string, number> = toPointMap(ACTIVITY_OPTIONS);

type WorkflowTab = 'attendance' | 'homework' | 'activity';

const unwrapRows = <T,>(response: any): T[] => {
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.students)) return data.students;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

const getPayload = (response: any) => response?.data ?? response;

const getStudentId = (student: any) => Number(student.student_id || student.id || 0);

const fetchAllClassStudents = async (classId: number) => {
  const directRows = unwrapRows<any>(await studentAPI.getByClassWithTransfers(classId, { _fresh: Date.now() }).catch(() => ({ data: [] })));
  if (directRows.length > 0) return directRows;

  const allRows: any[] = [];
  let page = 1;
  let total = 0;
  do {
    const response = await studentAPI.getAll({ class_id: classId, page, limit: 100, _fresh: Date.now() });
    const payload = getPayload(response);
    const rows = unwrapRows<any>(response);
    total = Number(payload?.total || rows.length || allRows.length);
    allRows.push(...rows);
    page += 1;
  } while (allRows.length < total && page < 100);

  return allRows;
};

export default function SessionWorkflowPage() {
  const { classId, sessionId } = useParams<{ classId: string; sessionId: string }>();
  const navigate = useNavigate();
  const authUser = useAppSelector((state) => state.auth.user);
  const [classData, setClassData] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Map<number, string>>(new Map());
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [homeworkScores, setHomeworkScores] = useState<Map<number, string>>(new Map());
  const [activityScores, setActivityScores] = useState<Map<number, string>>(new Map());
  const [activeTab, setActiveTab] = useState<WorkflowTab>('attendance');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numericClassId = Number(classId);
  const numericSessionId = Number(sessionId);
  const centerId = Number(session?.center_id || classData?.center_id || 0) || getResolvedCenterId(authUser) || undefined;
  const selectedDate = session?.session_date ? new Date(session.session_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!numericClassId || !numericSessionId) return;
      setLoading(true);
      setError('');
      try {
        const [classResponse, sessionsResponse, studentsResponse, attendanceResponse, gradesResponse] = await Promise.all([
          classAPI.getById(numericClassId),
          classAPI.getSessions(numericClassId).catch(() => ({ data: [] })),
          fetchAllClassStudents(numericClassId),
          attendanceAPI.getBySession(numericSessionId).catch(() => ({ data: [] })),
          gradeAPI.getBySession(numericSessionId).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;

        const nextClass = getPayload(classResponse);
        const nextSession = unwrapRows<any>(sessionsResponse).find((item) => Number(item.session_id || item.id) === numericSessionId);
        const nextStudents = Array.isArray(studentsResponse) ? studentsResponse : [];
        const nextAttendanceRecords = unwrapRows<any>(attendanceResponse);
        const nextGrades = unwrapRows<any>(gradesResponse);

        const nextAttendance = new Map<number, string>();
        const nextHomework = new Map<number, string>();
        const nextActivity = new Map<number, string>();
        const statusMap: Record<string, string> = { Present: 'On time', 'Absent R': 'Excused', 'Absent NR': 'Absent' };

        nextStudents.forEach((student) => {
          const id = getStudentId(student);
          if (!id) return;
          nextAttendance.set(id, '');
          nextHomework.set(id, '');
          nextActivity.set(id, '');
        });
        nextAttendanceRecords.forEach((record) => {
          const id = Number(record.student_id);
          if (id) nextAttendance.set(id, statusMap[record.status] || record.status || '');
        });
        nextGrades.forEach((grade) => {
          const id = Number(grade.student_id);
          const homework = Object.keys(HOMEWORK_POINTS).find((key) => HOMEWORK_POINTS[key] === Number(grade.homework_score));
          const activity = Object.keys(ACTIVITY_POINTS).find((key) => ACTIVITY_POINTS[key] === Number(grade.activity_score));
          if (id && homework) nextHomework.set(id, homework);
          if (id && activity) nextActivity.set(id, activity);
        });

        setClassData(nextClass);
        setSession(nextSession || { session_id: numericSessionId, class_id: numericClassId, center_id: nextClass?.center_id });
        setStudents(nextStudents.filter((student) => !student.deleted_at));
        setAttendanceRecords(nextAttendanceRecords);
        setAttendance(nextAttendance);
        setHomeworkScores(nextHomework);
        setActivityScores(nextActivity);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error || err?.response?.data?.details || 'Failed to load lesson workflow.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [numericClassId, numericSessionId]);

  const counts = useMemo(() => {
    const total = students.length;
    const attendanceMarked = Array.from(attendance.values()).filter(Boolean).length;
    const homeworkMarked = Array.from(homeworkScores.values()).filter(Boolean).length;
    const activityMarked = Array.from(activityScores.values()).filter(Boolean).length;
    return {
      total,
      attendanceMarked,
      homeworkMarked,
      activityMarked,
      allAttendanceMarked: total > 0 && attendanceMarked === total,
      allHomeworkMarked: total > 0 && homeworkMarked === total,
      allActivityMarked: total > 0 && activityMarked === total,
    };
  }, [activityScores, attendance, homeworkScores, students.length]);

  const getTotalScore = (studentId: number) => {
    const attendanceStatus = attendance.get(studentId) || '';
    const homeworkStatus = homeworkScores.get(studentId) || '';
    const activityStatus = activityScores.get(studentId) || '';
    return (ATTENDANCE_POINTS[attendanceStatus] || 0) + (HOMEWORK_POINTS[homeworkStatus] || 0) + (ACTIVITY_POINTS[activityStatus] || 0);
  };

  const toggleMapValue = (setter: React.Dispatch<React.SetStateAction<Map<number, string>>>, studentId: number, value: string) => {
    setter((current) => {
      const next = new Map(current);
      next.set(studentId, next.get(studentId) === value ? '' : value);
      return next;
    });
  };

  const fillMapValue = (
    setter: React.Dispatch<React.SetStateAction<Map<number, string>>>,
    value: string,
    isAllowed: (studentId: number) => boolean = () => true,
  ) => {
    setter((current) => {
      const next = new Map(current);
      students.forEach((student) => {
        const studentId = getStudentId(student);
        if (studentId && isAllowed(studentId)) next.set(studentId, value);
      });
      return next;
    });
  };

  const saveSession = async () => {
    if (!numericSessionId || !numericClassId) return;
    if (!counts.allAttendanceMarked || !counts.allHomeworkMarked || !counts.allActivityMarked) {
      showToast.error('Complete attendance, homework, and activity for every student.');
      return;
    }
    if (!centerId) {
      showToast.error('Please select an active center before saving this lesson.');
      return;
    }

    setSubmitting(true);
    try {
      const teacherId = authUser?.userType === 'teacher' && authUser?.id ? Number(authUser.id) : Number(classData?.teacher_id || session?.teacher_id || 0);
      const statusMap: Record<string, string> = { 'On time': 'Present', Late: 'Late', Excused: 'Absent R', Absent: 'Absent' };
      for (const student of students) {
        const studentId = getStudentId(student);
        const status = attendance.get(studentId);
        if (!studentId || !status) continue;

        const attendancePayload = {
          center_id: centerId,
          student_id: studentId,
          class_id: numericClassId,
          session_id: numericSessionId,
          attendance_date: selectedDate,
          status: statusMap[status] || status,
          remarks: 'Daily Session Grading',
          teacher_id: teacherId || 1,
        };

        const existingAttendance = attendanceRecords.find((record) => Number(record.student_id) === Number(studentId));
        if (existingAttendance?.attendance_id || existingAttendance?.id) {
          await attendanceAPI.update(Number(existingAttendance.attendance_id || existingAttendance.id), attendancePayload);
        } else {
          await attendanceAPI.create(attendancePayload);
        }

        const homeworkStatus = homeworkScores.get(studentId);
        const activityStatus = activityScores.get(studentId);
        await gradeAPI.upsertSessionScores({
          student_id: studentId,
          teacher_id: teacherId || 1,
          class_id: numericClassId,
          session_id: numericSessionId,
          attendance_score: ATTENDANCE_POINTS[status] || 0,
          homework_score: homeworkStatus ? (HOMEWORK_POINTS[homeworkStatus] ?? 0) : 0,
          activity_score: activityStatus ? (ACTIVITY_POINTS[activityStatus] ?? 0) : 0,
          subject: classData?.class_name || 'Class Session',
          total_marks: 100,
          center_id: centerId,
        });
      }
      showToast.success('Session data saved successfully.');
      navigate(`/classes/${numericClassId}`);
    } catch (err) {
      console.error('Failed to save session data:', err);
      showToast.error('Failed to save session data.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="outline" onClick={() => navigate(`/classes/${numericClassId || ''}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to class
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-4 bg-slate-50 p-4 dark:bg-background">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-border dark:bg-card lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Button variant="outline" size="sm" className="mb-3 h-8 text-xs" onClick={() => navigate(`/classes/${numericClassId}`)}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to class
          </Button>
          <h1 className="truncate text-xl font-bold text-slate-950 dark:text-foreground">{classData?.class_name || 'Lesson workflow'}</h1>
          <p className="text-sm text-muted-foreground">
            {selectedDate} / {session?.start_time || '-'} / {students.length} students
          </p>
        </div>
        <Button className="h-9 bg-emerald-600 text-white hover:bg-emerald-700" onClick={saveSession} disabled={submitting || students.length === 0}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Scores & Coins
        </Button>
      </div>

      <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="p-3">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkflowTab)}>
            <div className="mb-3 grid gap-2 md:grid-cols-3">
              <StepTile active={activeTab === 'attendance'} title="1. Attendance" value={`${counts.attendanceMarked}/${counts.total} marked`} tone="emerald" />
              <StepTile active={activeTab === 'homework'} title="2. Homework" value={`${counts.homeworkMarked}/${counts.total} checked`} tone="sky" />
              <StepTile active={activeTab === 'activity'} title="3. Activity & Coins" value={`${counts.activityMarked}/${counts.total} scored`} tone="violet" />
            </div>

            <TabsList className="grid h-auto w-full grid-cols-3">
              <TabsTrigger value="attendance" className="py-2">Attendance</TabsTrigger>
              <TabsTrigger value="homework" disabled={!counts.allAttendanceMarked} className="py-2">Homework</TabsTrigger>
              <TabsTrigger value="activity" disabled={!counts.allAttendanceMarked || !counts.allHomeworkMarked} className="py-2">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="pt-4">
              <ScoreTable
                students={students}
                options={ATTENDANCE_OPTIONS}
                values={attendance}
                onToggle={(studentId, value) => toggleMapValue(setAttendance, studentId, value)}
                onFillAll={(value) => fillMapValue(setAttendance, value)}
                action={<Button onClick={() => counts.allAttendanceMarked ? setActiveTab('homework') : showToast.error('Mark attendance for every student first.')}><CheckCircle2 className="mr-2 h-4 w-4" />Complete Attendance</Button>}
              />
            </TabsContent>

            <TabsContent value="homework" className="pt-4">
              <ScoreTable
                students={students}
                options={HOMEWORK_OPTIONS}
                values={homeworkScores}
                isEnabled={(studentId) => Boolean(attendance.get(studentId))}
                onToggle={(studentId, value) => toggleMapValue(setHomeworkScores, studentId, value)}
                onFillAll={(value) => fillMapValue(setHomeworkScores, value, (studentId) => Boolean(attendance.get(studentId)))}
                action={<><Button variant="outline" onClick={() => setActiveTab('attendance')}>Back</Button><Button onClick={() => counts.allHomeworkMarked ? setActiveTab('activity') : showToast.error('Add homework score for every student first.')}><ClipboardCheck className="mr-2 h-4 w-4" />Complete Homework</Button></>}
              />
            </TabsContent>

            <TabsContent value="activity" className="pt-4">
              <ScoreTable
                students={students}
                options={ACTIVITY_OPTIONS}
                values={activityScores}
                isEnabled={(studentId) => Boolean(attendance.get(studentId)) && Boolean(homeworkScores.get(studentId))}
                onToggle={(studentId, value) => toggleMapValue(setActivityScores, studentId, value)}
                onFillAll={(value) => fillMapValue(setActivityScores, value, (studentId) => Boolean(attendance.get(studentId)) && Boolean(homeworkScores.get(studentId)))}
                getTotalScore={getTotalScore}
                action={<><Button variant="outline" onClick={() => setActiveTab('homework')}>Back</Button><Button onClick={saveSession} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Scores & Coins</Button></>}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
