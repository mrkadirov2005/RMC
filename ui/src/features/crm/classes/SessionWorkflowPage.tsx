import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardCheck, Loader2, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getResolvedCenterId } from '@/shared/auth/centerScope';
import { showToast } from '@/utils/toast';
import { clearSessionWorkflowDraft, saveSessionWorkflowDraft, type SessionWorkflowDraft } from '@/slices/sessionWorkflowDraftsSlice';
import { useAppDispatch, useAppSelector } from '../hooks';
import { ManualPointsTable, ScoreTable, StepTile, type ScoreOption } from './components/SessionWorkflowScoring';
import { defaultLessonScoringSettings, normalizeLessonScoringSettings, type LessonScoringSettings } from './lessonScoringSettings';
import {
  buildSessionWorkflowRecords,
  clampWorkflowPoints,
  getWorkflowCounts,
  getWorkflowStudentId,
  getWorkflowTotalScore,
  toWorkflowPointMap,
} from './sessionWorkflowModel';
import { sessionWorkflowApi } from './api/sessionWorkflowApi';

const toPointMap = (options: ScoreOption[]) => toWorkflowPointMap(options);

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

const getStudentId = getWorkflowStudentId;

const toDateKey = (value?: string) => (value ? new Date(value).toISOString().split('T')[0] : '');

export default function SessionWorkflowPage() {
  const { classId, sessionId } = useParams<{ classId: string; sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authUser = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [classData, setClassData] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Map<number, string>>(new Map());
  const [homeworkScores, setHomeworkScores] = useState<Map<number, string>>(new Map());
  const [activityScores, setActivityScores] = useState<Map<number, string>>(new Map());
  const [pointsScores, setPointsScores] = useState<Map<number, string>>(new Map());
  const [stellarStudentId, setStellarStudentId] = useState<number | null>(null);
  const [scoringSettings, setScoringSettings] = useState<LessonScoringSettings>(defaultLessonScoringSettings);
  const [activeTab, setActiveTab] = useState<WorkflowTab>(() => {
    const requestedTab = searchParams.get('tab') as WorkflowTab | null;
    return requestedTab && WORKFLOW_TABS.includes(requestedTab) ? requestedTab : 'attendance';
  });
  const [selectedDate, setSelectedDate] = useState('');
  const [switchingDate, setSwitchingDate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const suppressDraftPersistence = useRef(false);

  const numericClassId = Number(classId);
  const numericSessionId = Number(sessionId);
  const draftKey = `${numericClassId}:${numericSessionId}`;
  const savedDraft = useAppSelector((state) => state.sessionWorkflowDrafts.drafts[draftKey]);
  const savedDraftRef = useRef(savedDraft);
  savedDraftRef.current = savedDraft;
  const selectedActions = useMemo(() => {
    const raw = searchParams.get('actions');
    const values = raw ? raw.split(',') : DEFAULT_WORKFLOW_ACTIONS;
    const allowed = new Set<WorkflowAction>(['attendance', 'homework', 'activity', 'coins', 'points']);
    const next = values.filter((value): value is WorkflowAction => allowed.has(value as WorkflowAction));
    return next.length > 0 ? next : DEFAULT_WORKFLOW_ACTIONS;
  }, [searchParams]);
  const backPath = searchParams.get('from') === 'teacher' ? '/teacher-portal' : `/classes/${numericClassId}`;
  const selectedTabs = useMemo(
    () => WORKFLOW_TABS.filter((tab) => selectedActions.includes(tab)),
    [selectedActions],
  );
  const shouldAwardCoins = selectedActions.includes('coins');
  const centerId = Number(session?.center_id || classData?.center_id || 0) || getResolvedCenterId(authUser) || undefined;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!numericClassId || !numericSessionId) return;
      setLoading(true);
      setError('');
      try {
        const loaded = await sessionWorkflowApi.load(numericClassId, numericSessionId);
        if (cancelled) return;

        const nextClass = loaded.classData;
        const nextSessions = loaded.sessions;
        const nextSession = nextSessions.find((item) => Number(item.session_id || item.id) === numericSessionId);
        const nextStudents = loaded.students;
        const nextAttendanceRecords = loaded.attendanceRecords;
        const nextGrades = loaded.grades;
        const nextScoringSettings = normalizeLessonScoringSettings(loaded.scoringSettings as Partial<LessonScoringSettings>);
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

        if (savedDraftRef.current) {
            const draft = savedDraftRef.current;
              const studentIds = new Set(nextStudents.map(getStudentId).filter(Boolean));
              const restoreMap = (entries: [number, string][] | undefined, fallback: Map<number, string>) => {
                const restored = new Map(fallback);
                if (Array.isArray(entries)) {
                  entries.forEach(([studentId, value]) => {
                    if (studentIds.has(Number(studentId))) restored.set(Number(studentId), String(value ?? ''));
                  });
                }
                return restored;
              };
              const restoredAttendance = restoreMap(draft.attendance, nextAttendance);
              const restoredHomework = restoreMap(draft.homeworkScores, nextHomework);
              const restoredActivity = restoreMap(draft.activityScores, nextActivity);
              const restoredPoints = restoreMap(draft.pointsScores, nextPoints);
              nextAttendance.clear();
              restoredAttendance.forEach((value, key) => nextAttendance.set(key, value));
              nextHomework.clear();
              restoredHomework.forEach((value, key) => nextHomework.set(key, value));
              nextActivity.clear();
              restoredActivity.forEach((value, key) => nextActivity.set(key, value));
              nextPoints.clear();
              restoredPoints.forEach((value, key) => nextPoints.set(key, value));
              nextStellarStudentId = draft.stellarStudentId && studentIds.has(Number(draft.stellarStudentId)) ? Number(draft.stellarStudentId) : null;
              if (WORKFLOW_TABS.includes(draft.activeTab)) setActiveTab(draft.activeTab);
        }

        setClassData(nextClass);
        setScoringSettings(nextScoringSettings);
        setSessions(nextSessions);
        setSession(nextSession || { session_id: numericSessionId, class_id: numericClassId, center_id: nextClass?.center_id });
        setSelectedDate(toDateKey(nextSession?.session_date) || new Date().toISOString().split('T')[0]);
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
    if (loading || !numericClassId || !numericSessionId || suppressDraftPersistence.current) return;
    const draft: SessionWorkflowDraft = {
      attendance: Array.from(attendance.entries()),
      homeworkScores: Array.from(homeworkScores.entries()),
      activityScores: Array.from(activityScores.entries()),
      pointsScores: Array.from(pointsScores.entries()),
      stellarStudentId,
      activeTab,
    };
    dispatch(saveSessionWorkflowDraft({ key: draftKey, draft }));
  }, [activeTab, activityScores, attendance, dispatch, draftKey, homeworkScores, loading, numericClassId, numericSessionId, pointsScores, stellarStudentId]);

  useEffect(() => {
    if (selectedTabs.length === 0) return;
    if (!selectedTabs.includes(activeTab)) {
      setActiveTab(selectedTabs[0]);
    }
  }, [activeTab, selectedTabs]);

  const counts = useMemo(() => {
    return getWorkflowCounts(students.length, attendance, homeworkScores, activityScores, pointsScores);
  }, [activityScores, attendance, homeworkScores, pointsScores, students.length]);

  const getTotalScore = (studentId: number) => getWorkflowTotalScore({
    studentId,
    selectedActions,
    attendance,
    homework: homeworkScores,
    activity: activityScores,
    points: pointsScores,
    settings: scoringSettings,
  });

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
    const nextValue = clampWorkflowPoints(value);
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

  const handleDateChange = async (nextDate: string) => {
    if (!nextDate || !numericClassId || !classData) return;
    setSelectedDate(nextDate);
    const existingSession = sessions.find((item) => toDateKey(item.session_date) === nextDate);
    const nextActions = selectedActions.join(',');
    const nextTab = selectedTabs.includes(activeTab) ? activeTab : selectedTabs[0] || 'points';

    if (existingSession) {
      const nextSessionId = Number(existingSession.session_id || existingSession.id);
      if (nextSessionId && nextSessionId !== numericSessionId) {
        navigate(`/classes/${numericClassId}/sessions/${nextSessionId}/workflow?actions=${nextActions}&tab=${nextTab}`, { replace: true });
      }
      return;
    }

    setSwitchingDate(true);
    try {
      const nextSession = await sessionWorkflowApi.createSession(numericClassId, {
        center_id: centerId,
        session_date: nextDate,
        start_time: session?.start_time || new Date().toTimeString().slice(0, 5),
        duration_minutes: Number(session?.duration_minutes || 90),
        teacher_id: authUser?.userType === 'teacher' && authUser?.id ? Number(authUser.id) : Number(classData?.teacher_id || session?.teacher_id || 0) || undefined,
      });
      const nextSessionId = Number(nextSession?.session_id || nextSession?.id || 0);
      if (!nextSessionId) throw new Error('Session was created without an id.');
      setSessions((current) => [...current, nextSession]);
      navigate(`/classes/${numericClassId}/sessions/${nextSessionId}/workflow?actions=${nextActions}&tab=${nextTab}`, { replace: true });
    } catch (err) {
      console.error('Failed to switch lesson date:', err);
      setSelectedDate(toDateKey(session?.session_date) || new Date().toISOString().split('T')[0]);
      showToast.error('Failed to open lesson for this date.');
    } finally {
      setSwitchingDate(false);
    }
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
      const records = buildSessionWorkflowRecords({
        students,
        selectedActions,
        attendance,
        homework: homeworkScores,
        activity: activityScores,
        points: pointsScores,
        stellarStudentId,
        settings: scoringSettings,
      });

      await sessionWorkflowApi.save({
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
      suppressDraftPersistence.current = true;
      dispatch(clearSessionWorkflowDraft(draftKey));
      showToast.success(shouldAwardCoins ? 'Session data and coins saved successfully.' : 'Session data saved successfully.');
      navigate(backPath);
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
        <Button variant="outline" onClick={() => navigate(backPath)}>
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
          <Button variant="outline" size="sm" className="mb-3 h-8 text-xs" onClick={() => navigate(backPath)}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            {searchParams.get('from') === 'teacher' ? 'Back to teacher portal' : 'Back to class'}
          </Button>
          <h1 className="truncate text-xl font-bold text-slate-950 dark:text-foreground">{classData?.class_name || 'Lesson workflow'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 dark:border-border dark:bg-background dark:text-foreground">
              <CalendarDays className="h-4 w-4 text-violet-600" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(event) => handleDateChange(event.target.value)}
                disabled={switchingDate || submitting}
                className="h-7 w-[150px] border-0 bg-transparent p-0 text-xs font-bold shadow-none focus-visible:ring-0"
              />
            </label>
            <span>{session?.start_time || '-'}</span>
            <span>/</span>
            <span>{students.length} students</span>
            <span>/</span>
            <span>{shouldAwardCoins ? 'coins on' : 'coins off'}</span>
            {switchingDate && <Loader2 className="h-4 w-4 animate-spin text-violet-600" />}
          </div>
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
                action={<><Button variant="outline" onClick={() => navigate(backPath)}>Cancel</Button><Button onClick={() => completeTab('attendance')}><CheckCircle2 className="mr-2 h-4 w-4" />{getNextTab('attendance') ? 'Complete Attendance' : 'Save Scores'}</Button></>}
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
                action={<><Button variant="outline" onClick={() => getPreviousTab('homework') ? setActiveTab(getPreviousTab('homework')!) : navigate(backPath)}>Back</Button><Button onClick={() => completeTab('homework')}><ClipboardCheck className="mr-2 h-4 w-4" />{getNextTab('homework') ? 'Complete Homework' : 'Save Scores'}</Button></>}
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
                action={<><Button variant="outline" onClick={() => getPreviousTab('activity') ? setActiveTab(getPreviousTab('activity')!) : navigate(backPath)}>Back</Button><Button onClick={() => completeTab('activity')} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : getNextTab('activity') ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}{getNextTab('activity') ? 'Complete Activity' : shouldAwardCoins ? 'Save Scores & Coins' : 'Save Scores'}</Button></>}
              />
            </TabsContent>}

            {selectedActions.includes('points') && <TabsContent value="points" className="pt-4">
              <ManualPointsTable
                students={students}
                values={pointsScores}
                onChange={setPointScore}
                onFillAll={fillPointScores}
                getTotalScore={getTotalScore}
                action={<><Button variant="outline" onClick={() => getPreviousTab('points') ? setActiveTab(getPreviousTab('points')!) : navigate(backPath)}>Back</Button><Button onClick={() => completeTab('points')} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{shouldAwardCoins ? 'Save Scores & Coins' : 'Save Scores'}</Button></>}
              />
            </TabsContent>}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
