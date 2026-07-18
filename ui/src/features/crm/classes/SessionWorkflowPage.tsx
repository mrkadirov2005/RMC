import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Loader2, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { attendanceAPI, classAPI, gradeAPI, settingsAPI, studentAPI } from '@/shared/api/api';
import { getResolvedCenterId } from '@/shared/auth/centerScope';
import { showToast } from '@/utils/toast';
import { useAppSelector } from '../hooks';
import { ManualPointsTable, ScoreTable, StepTile, type ScoreOption } from './components/SessionWorkflowScoring';
import { defaultLessonScoringSettings, normalizeLessonScoringSettings, type LessonScoringSettings } from './lessonScoringSettings';

const toPointMap = (options: ScoreOption[]) => Object.fromEntries(options.map((option) => [option.label, option.score]));

type WorkflowTab = 'attendance' | 'homework' | 'activity' | 'points';
type WorkflowAction = WorkflowTab | 'coins';

const DEFAULT_WORKFLOW_ACTIONS: WorkflowAction[] = ['attendance', 'homework', 'activity', 'coins'];
const WORKFLOW_TABS: WorkflowTab[] = ['attendance', 'homework', 'activity', 'points'];
const ACTION_LABELS: Record<WorkflowTab, string> = {
  attendance: 'Attendance',
  homework: 'Homework',
  activity: 'Activity',
  points: 'Points',
};

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
  const [searchParams] = useSearchParams();
  const authUser = useAppSelector((state) => state.auth.user);
  const [classData, setClassData] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Map<number, string>>(new Map());
  const [homeworkScores, setHomeworkScores] = useState<Map<number, string>>(new Map());
  const [activityScores, setActivityScores] = useState<Map<number, string>>(new Map());
  const [pointsScores, setPointsScores] = useState<Map<number, string>>(new Map());
  const [stellarStudentId, setStellarStudentId] = useState<number | null>(null);
  const [scoringSettings, setScoringSettings] = useState<LessonScoringSettings>(defaultLessonScoringSettings);
  const [activeTab, setActiveTab] = useState<WorkflowTab>('attendance');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numericClassId = Number(classId);
  const numericSessionId = Number(sessionId);
  const selectedActions = useMemo(() => {
    const raw = searchParams.get('actions');
    const values = raw ? raw.split(',') : DEFAULT_WORKFLOW_ACTIONS;
    const allowed = new Set<WorkflowAction>(['attendance', 'homework', 'activity', 'coins', 'points']);
    const next = values.filter((value): value is WorkflowAction => allowed.has(value as WorkflowAction));
    return next.length > 0 ? next : DEFAULT_WORKFLOW_ACTIONS;
  }, [searchParams]);
  const selectedTabs = useMemo(
    () => WORKFLOW_TABS.filter((tab) => selectedActions.includes(tab)),
    [selectedActions],
  );
  const shouldAwardCoins = selectedActions.includes('coins');
  const attendancePoints = useMemo(() => toPointMap(scoringSettings.attendance), [scoringSettings.attendance]);
  const homeworkPoints = useMemo(() => toPointMap(scoringSettings.homework), [scoringSettings.homework]);
  const activityPoints = useMemo(() => toPointMap(scoringSettings.activity), [scoringSettings.activity]);
  const centerId = Number(session?.center_id || classData?.center_id || 0) || getResolvedCenterId(authUser) || undefined;
  const selectedDate = session?.session_date ? new Date(session.session_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!numericClassId || !numericSessionId) return;
      setLoading(true);
      setError('');
      try {
        const [classResponse, sessionsResponse, studentsResponse, attendanceResponse, gradesResponse, scoringResponse] = await Promise.all([
          classAPI.getById(numericClassId),
          classAPI.getSessions(numericClassId).catch(() => ({ data: [] })),
          fetchAllClassStudents(numericClassId),
          attendanceAPI.getBySession(numericSessionId).catch(() => ({ data: [] })),
          gradeAPI.getBySession(numericSessionId).catch(() => ({ data: [] })),
          settingsAPI.getLessonScoring().catch(() => ({ data: defaultLessonScoringSettings })),
        ]);
        if (cancelled) return;

        const nextClass = getPayload(classResponse);
        const nextSession = unwrapRows<any>(sessionsResponse).find((item) => Number(item.session_id || item.id) === numericSessionId);
        const nextStudents = Array.isArray(studentsResponse) ? studentsResponse : [];
        const nextAttendanceRecords = unwrapRows<any>(attendanceResponse);
        const nextGrades = unwrapRows<any>(gradesResponse);
        const nextScoringSettings = normalizeLessonScoringSettings(getPayload(scoringResponse));
        const nextHomeworkPoints = toPointMap(nextScoringSettings.homework);
        const nextActivityPoints = toPointMap(nextScoringSettings.activity);

        const nextAttendance = new Map<number, string>();
        const nextHomework = new Map<number, string>();
        const nextActivity = new Map<number, string>();
        const nextPoints = new Map<number, string>();
        let nextStellarStudentId: number | null = null;
        const statusMap: Record<string, string> = { Present: 'On time', 'Absent R': 'Excused', 'Absent NR': 'Absent' };

        nextStudents.forEach((student) => {
          const id = getStudentId(student);
          if (!id) return;
          nextAttendance.set(id, '');
          nextHomework.set(id, '');
          nextActivity.set(id, '');
          nextPoints.set(id, '');
        });
        nextAttendanceRecords.forEach((record) => {
          const id = Number(record.student_id);
          if (id) nextAttendance.set(id, statusMap[record.status] || record.status || '');
        });
        nextGrades.forEach((grade) => {
          const id = Number(grade.student_id);
          const homework = Object.keys(nextHomeworkPoints).find((key) => nextHomeworkPoints[key] === Number(grade.homework_score));
          const activity = Object.keys(nextActivityPoints).find((key) => nextActivityPoints[key] === Number(grade.activity_score));
          if (id && homework) nextHomework.set(id, homework);
          if (id && activity) nextActivity.set(id, activity);
          if (id && grade.points_score !== null && grade.points_score !== undefined) nextPoints.set(id, String(Number(grade.points_score || 0)));
          if (id && String(grade.coin_comment || '').includes('Stellar student bonus')) nextStellarStudentId = id;
        });

        setClassData(nextClass);
        setScoringSettings(nextScoringSettings);
        setSession(nextSession || { session_id: numericSessionId, class_id: numericClassId, center_id: nextClass?.center_id });
        setStudents(nextStudents.filter((student) => !student.deleted_at));
        setAttendance(nextAttendance);
        setHomeworkScores(nextHomework);
        setActivityScores(nextActivity);
        setPointsScores(nextPoints);
        setStellarStudentId(nextStellarStudentId);
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

  useEffect(() => {
    if (selectedTabs.length === 0) return;
    if (!selectedTabs.includes(activeTab)) {
      setActiveTab(selectedTabs[0]);
    }
  }, [activeTab, selectedTabs]);

  const counts = useMemo(() => {
    const total = students.length;
    const attendanceMarked = Array.from(attendance.values()).filter(Boolean).length;
    const homeworkMarked = Array.from(homeworkScores.values()).filter(Boolean).length;
    const activityMarked = Array.from(activityScores.values()).filter(Boolean).length;
    const pointsMarked = Array.from(pointsScores.values()).filter((value) => value !== '').length;
    return {
      total,
      attendanceMarked,
      homeworkMarked,
      activityMarked,
      pointsMarked,
      allAttendanceMarked: total > 0 && attendanceMarked === total,
      allHomeworkMarked: total > 0 && homeworkMarked === total,
      allActivityMarked: total > 0 && activityMarked === total,
      allPointsMarked: total > 0 && pointsMarked === total,
    };
  }, [activityScores, attendance, homeworkScores, pointsScores, students.length]);

  const getTotalScore = (studentId: number) => {
    const attendanceStatus = selectedActions.includes('attendance') ? attendance.get(studentId) || '' : '';
    const homeworkStatus = selectedActions.includes('homework') ? homeworkScores.get(studentId) || '' : '';
    const activityStatus = selectedActions.includes('activity') ? activityScores.get(studentId) || '' : '';
    const pointsScore = selectedActions.includes('points') ? Number(pointsScores.get(studentId) || 0) : 0;
    return (attendancePoints[attendanceStatus] || 0) + (homeworkPoints[homeworkStatus] || 0) + (activityPoints[activityStatus] || 0) + (Number.isFinite(pointsScore) ? pointsScore : 0);
  };

  const getNextTab = (tab: WorkflowTab) => {
    const index = selectedTabs.indexOf(tab);
    return index >= 0 ? selectedTabs[index + 1] : undefined;
  };

  const getPreviousTab = (tab: WorkflowTab) => {
    const index = selectedTabs.indexOf(tab);
    return index > 0 ? selectedTabs[index - 1] : undefined;
  };

  const isTabComplete = (tab: WorkflowTab) => {
    if (tab === 'attendance') return counts.allAttendanceMarked;
    if (tab === 'homework') return counts.allHomeworkMarked;
    if (tab === 'activity') return counts.allActivityMarked;
    return counts.allPointsMarked;
  };

  const completeTab = (tab: WorkflowTab) => {
    if (!isTabComplete(tab)) {
      showToast.error(`Complete ${ACTION_LABELS[tab].toLowerCase()} for every student first.`);
      return;
    }
    const nextTab = getNextTab(tab);
    if (nextTab) setActiveTab(nextTab);
    else saveSession();
  };

  const setPointScore = (studentId: number, value: string) => {
    const numericValue = Number(value);
    const nextValue = value === '' || !Number.isFinite(numericValue) ? '' : String(Math.max(0, Math.min(100, Math.round(numericValue))));
    setPointsScores((current) => {
      const next = new Map(current);
      next.set(studentId, nextValue);
      return next;
    });
  };

  const fillPointScores = (value: string) => {
    setPointsScores((current) => {
      const next = new Map(current);
      students.forEach((student) => {
        const studentId = getStudentId(student);
        if (studentId) next.set(studentId, value);
      });
      return next;
    });
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
    if (selectedTabs.length === 0) {
      showToast.error('Choose at least one scoring action before saving this lesson.');
      return;
    }
    const incompleteTab = selectedTabs.find((tab) => !isTabComplete(tab));
    if (incompleteTab) {
      showToast.error(`Complete ${ACTION_LABELS[incompleteTab].toLowerCase()} for every student.`);
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
      const records = students.map((student) => {
        const studentId = getStudentId(student);
        const status = attendance.get(studentId);
        const attendanceStatus = status || '';
        const homeworkStatus = homeworkScores.get(studentId);
        const activityStatus = activityScores.get(studentId);
        const pointsScore = Number(pointsScores.get(studentId) || 0);

        return {
          student_id: studentId,
          is_stellar_student: shouldAwardCoins && stellarStudentId === studentId,
          stellar_bonus_coins: shouldAwardCoins && stellarStudentId === studentId ? scoringSettings.stellarBonusCoins : 0,
          attendance_status: selectedActions.includes('attendance') ? (statusMap[attendanceStatus] || attendanceStatus) : null,
          attendance_remarks: selectedActions.includes('attendance') ? 'Daily Session Grading' : null,
          attendance_score: selectedActions.includes('attendance') ? (attendancePoints[attendanceStatus] || 0) : null,
          homework_score: selectedActions.includes('homework') && homeworkStatus ? (homeworkPoints[homeworkStatus] ?? 0) : null,
          activity_score: selectedActions.includes('activity') && activityStatus ? (activityPoints[activityStatus] ?? 0) : null,
          points_score: selectedActions.includes('points') && Number.isFinite(pointsScore) ? pointsScore : null,
        };
      }).filter((record) => Number(record.student_id) > 0);

      await gradeAPI.saveSessionWorkflow({
        center_id: centerId,
        class_id: numericClassId,
        session_id: numericSessionId,
        teacher_id: teacherId || 1,
        attendance_date: selectedDate,
        subject: classData?.class_name || 'Class Session',
        total_marks: 100,
        award_coins: shouldAwardCoins,
        records,
      });
      showToast.success(shouldAwardCoins ? 'Session data and coins saved successfully.' : 'Session data saved successfully.');
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
            {selectedDate} / {session?.start_time || '-'} / {students.length} students / {shouldAwardCoins ? 'coins on' : 'coins off'}
          </p>
        </div>
        <Button className="h-9 bg-emerald-600 text-white hover:bg-emerald-700" onClick={saveSession} disabled={submitting || students.length === 0}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {shouldAwardCoins ? 'Save Scores & Coins' : 'Save Scores'}
        </Button>
      </div>

      <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="p-3">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkflowTab)}>
            <div className="mb-3 grid gap-2 md:grid-cols-3">
              {selectedTabs.map((tab, index) => (
                <StepTile
                  key={tab}
                  active={activeTab === tab}
                  title={`${index + 1}. ${ACTION_LABELS[tab]}`}
                  value={
                    tab === 'attendance'
                      ? `${counts.attendanceMarked}/${counts.total} marked`
                      : tab === 'homework'
                      ? `${counts.homeworkMarked}/${counts.total} checked`
                      : tab === 'activity'
                      ? `${counts.activityMarked}/${counts.total} scored`
                      : `${counts.pointsMarked}/${counts.total} entered`
                  }
                  tone={tab === 'attendance' ? 'emerald' : tab === 'homework' ? 'sky' : 'violet'}
                />
              ))}
            </div>

            <TabsList className="grid h-auto w-full" style={{ gridTemplateColumns: `repeat(${Math.max(selectedTabs.length, 1)}, minmax(0, 1fr))` }}>
              {selectedTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="py-2">{ACTION_LABELS[tab]}</TabsTrigger>
              ))}
            </TabsList>

            {selectedActions.includes('attendance') && <TabsContent value="attendance" className="pt-4">
              <ScoreTable
                students={students}
                options={scoringSettings.attendance}
                values={attendance}
                onToggle={(studentId, value) => toggleMapValue(setAttendance, studentId, value)}
                onFillAll={(value) => fillMapValue(setAttendance, value)}
                action={<><Button variant="outline" onClick={() => navigate(`/classes/${numericClassId}`)}>Cancel</Button><Button onClick={() => completeTab('attendance')}><CheckCircle2 className="mr-2 h-4 w-4" />{getNextTab('attendance') ? 'Complete Attendance' : 'Save Scores'}</Button></>}
              />
            </TabsContent>}

            {selectedActions.includes('homework') && <TabsContent value="homework" className="pt-4">
              <ScoreTable
                students={students}
                options={scoringSettings.homework}
                values={homeworkScores}
                isEnabled={(studentId) => !selectedActions.includes('attendance') || Boolean(attendance.get(studentId))}
                onToggle={(studentId, value) => toggleMapValue(setHomeworkScores, studentId, value)}
                onFillAll={(value) => fillMapValue(setHomeworkScores, value, (studentId) => !selectedActions.includes('attendance') || Boolean(attendance.get(studentId)))}
                action={<><Button variant="outline" onClick={() => getPreviousTab('homework') ? setActiveTab(getPreviousTab('homework')!) : navigate(`/classes/${numericClassId}`)}>Back</Button><Button onClick={() => completeTab('homework')}><ClipboardCheck className="mr-2 h-4 w-4" />{getNextTab('homework') ? 'Complete Homework' : 'Save Scores'}</Button></>}
              />
            </TabsContent>}

            {selectedActions.includes('activity') && <TabsContent value="activity" className="pt-4">
              <ScoreTable
                students={students}
                options={scoringSettings.activity}
                values={activityScores}
                isEnabled={(studentId) => (!selectedActions.includes('attendance') || Boolean(attendance.get(studentId))) && (!selectedActions.includes('homework') || Boolean(homeworkScores.get(studentId)))}
                onToggle={(studentId, value) => toggleMapValue(setActivityScores, studentId, value)}
                onFillAll={(value) => fillMapValue(setActivityScores, value, (studentId) => (!selectedActions.includes('attendance') || Boolean(attendance.get(studentId))) && (!selectedActions.includes('homework') || Boolean(homeworkScores.get(studentId))))}
                getTotalScore={getTotalScore}
                stellarStudentId={shouldAwardCoins ? stellarStudentId : null}
                onToggleStellar={shouldAwardCoins ? (studentId) => setStellarStudentId((current) => current === studentId ? null : studentId) : undefined}
                stellarBonusCoins={scoringSettings.stellarBonusCoins}
                action={<><Button variant="outline" onClick={() => getPreviousTab('activity') ? setActiveTab(getPreviousTab('activity')!) : navigate(`/classes/${numericClassId}`)}>Back</Button><Button onClick={() => completeTab('activity')} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : getNextTab('activity') ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}{getNextTab('activity') ? 'Complete Activity' : shouldAwardCoins ? 'Save Scores & Coins' : 'Save Scores'}</Button></>}
              />
            </TabsContent>}

            {selectedActions.includes('points') && <TabsContent value="points" className="pt-4">
              <ManualPointsTable
                students={students}
                values={pointsScores}
                onChange={setPointScore}
                onFillAll={fillPointScores}
                getTotalScore={getTotalScore}
                action={<><Button variant="outline" onClick={() => getPreviousTab('points') ? setActiveTab(getPreviousTab('points')!) : navigate(`/classes/${numericClassId}`)}>Back</Button><Button onClick={() => completeTab('points')} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{shouldAwardCoins ? 'Save Scores & Coins' : 'Save Scores'}</Button></>}
              />
            </TabsContent>}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
