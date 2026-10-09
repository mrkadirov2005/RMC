import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, ClipboardCheck, Eye, Loader2, Pencil, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getResolvedCenterId } from '@/shared/auth/centerScope';
import { wasInGroupOn } from '@/shared/billingPeriod';
import { showToast } from '@/utils/toast';
import { clearSessionWorkflowDraft, saveSessionWorkflowDraft, type SessionWorkflowDraft } from '@/slices/sessionWorkflowDraftsSlice';
import { useAppDispatch, useAppSelector } from '../hooks';
import { ManualPointsTable, ScoreTable, StepTile, type ScoreOption } from './components/SessionWorkflowScoring';
import { defaultLessonScoringSettings, normalizeLessonScoringSettings, type LessonScoringSettings } from './lessonScoringSettings';
import {
  buildLessonSummary,
  buildSessionWorkflowRecords,
  clampWorkflowPoints,
  getWorkflowCounts,
  getWorkflowStudentId,
  getWorkflowMaxScore,
  getWorkflowTotalScore,
  toWorkflowPointMap,
  type LessonSummary,
} from './sessionWorkflowModel';
import { sessionWorkflowApi } from './api/sessionWorkflowApi';
import { buildSessionWorkflowPath, findSessionOnDate, getSessionId, NEW_SESSION_SEGMENT, resolveLessonActions, sessionDateKey } from './lessonStart';
import { toDateKey } from './utils/date';
import { getScheduleDurationMinutes, parseSchedule } from './utils/schedule';
import ConsolidationTab from './components/ConsolidationTab';
import { LessonSummaryDialog } from './components/LessonSummaryDialog';
import { findAbsenceStreakStudents, getMissingAbsenceReasons, toAbsenceReason } from './absenceStreak';
import { buildMonthlyAttendanceGrid, downloadCanvasPng, drawMonthlyAttendanceImage } from './monthlyAttendanceImage';
import { getApiPayload } from '@/shared/api/response';
import { useLanguage } from '@/i18n/LanguageContext';

const toPointMap = (options: ScoreOption[]) => toWorkflowPointMap(options);

type WorkflowTab = 'attendance' | 'homework' | 'activity' | 'points';
type WorkflowAction = WorkflowTab | 'coins';
// 'consolidation' is a standalone tab (vocabulary exercises for this session) — deliberately
// outside the attendance/homework/activity/points stepper above, since it isn't a per-lesson
// score to complete and shouldn't participate in `selectedActions`/`completeTab` navigation.
type PageTab = WorkflowTab | 'consolidation';
const isPageTab = (value: string | null): value is PageTab =>
  value === 'consolidation' || WORKFLOW_TABS.includes(value as WorkflowTab);

const DEFAULT_WORKFLOW_ACTIONS: WorkflowAction[] = ['attendance', 'homework', 'activity', 'coins'];
const WORKFLOW_TABS: WorkflowTab[] = ['attendance', 'homework', 'activity', 'points'];
const ACTION_LABELS: Record<WorkflowTab, string> = {
  attendance: 'Attendance',
  homework: 'Homework',
  activity: 'Activity',
  points: 'Points',
};

const getStudentId = getWorkflowStudentId;

export default function SessionWorkflowPage() {
  const { t } = useLanguage();
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
  // Students absent from the class's previous two lessons in a row need a written reason.
  const [absenceStreakIds, setAbsenceStreakIds] = useState<Set<number>>(new Set());
  const [absenceReasons, setAbsenceReasons] = useState<Map<number, string>>(new Map());
  const [showReasonErrors, setShowReasonErrors] = useState(false);
  const [scoringSettings, setScoringSettings] = useState<LessonScoringSettings>(defaultLessonScoringSettings);
  const [activeTab, setActiveTab] = useState<PageTab>(() => {
    const requestedTab = searchParams.get('tab');
    return isPageTab(requestedTab) ? requestedTab : 'attendance';
  });
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const suppressDraftPersistence = useRef(false);
  const createdSessionId = useRef(0);
  const [lessonSummary, setLessonSummary] = useState<LessonSummary | null>(null);

  const numericClassId = Number(classId);
  // `/sessions/new/workflow?date=…` opens a lesson that has no session row yet; it is created on save.
  const isNewSession = sessionId === NEW_SESSION_SEGMENT;
  const numericSessionId = isNewSession ? 0 : Number(sessionId);
  const requestedDate = searchParams.get('date') || toDateKey(new Date());
  const lessonDate = isNewSession ? requestedDate : '';
  const draftKey = isNewSession ? `${numericClassId}:new:${requestedDate}` : `${numericClassId}:${numericSessionId}`;
  const [loadedDraftKey, setLoadedDraftKey] = useState('');
  const savedDraft = useAppSelector((state) => state.sessionWorkflowDrafts.drafts[draftKey]);
  const savedDraftRef = useRef(savedDraft);
  savedDraftRef.current = savedDraft;
  // `mode=view` opens a saved lesson read-only; its steps come from what was actually recorded.
  const isViewMode = searchParams.get('mode') === 'view' && !isNewSession;
  const [recordedActions, setRecordedActions] = useState<WorkflowAction[] | null>(null);
  const requestedActions = useMemo(() => {
    const raw = searchParams.get('actions');
    const values = raw ? raw.split(',') : DEFAULT_WORKFLOW_ACTIONS;
    const allowed = new Set<WorkflowAction>(['attendance', 'homework', 'activity', 'coins', 'points']);
    const next = resolveLessonActions(values.filter((value): value is WorkflowAction => allowed.has(value as WorkflowAction)));
    return next.length > 0 ? next : DEFAULT_WORKFLOW_ACTIONS;
  }, [searchParams]);
  const selectedActions = isViewMode && recordedActions?.length ? recordedActions : requestedActions;
  const from = searchParams.get('from');
  const backPath = from === 'teacher' ? '/teacher-portal' : `/classes/${numericClassId}`;
  const selectedTabs = useMemo(
    () => WORKFLOW_TABS.filter((tab) => selectedActions.includes(tab)),
    [selectedActions],
  );
  const shouldAwardCoins = selectedActions.includes('coins');
  const centerId = Number(session?.center_id || classData?.center_id || 0) || getResolvedCenterId(authUser) || undefined;

  // Read by the loader without making it reload: switching view → edit or changing the tab
  // updates the URL but must keep the marks already on screen.
  const routeOptionsRef = useRef({ isViewMode, selectedActions, from, tab: searchParams.get('tab') });
  routeOptionsRef.current = { isViewMode, selectedActions, from, tab: searchParams.get('tab') };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!numericClassId || (!isNewSession && !numericSessionId)) return;
      const routeOptions = routeOptionsRef.current;
      setLoading(true);
      setError('');
      createdSessionId.current = 0;
      try {
        const [loaded, classAttendance] = await Promise.all([
          sessionWorkflowApi.load(numericClassId, isNewSession ? null : numericSessionId),
          // Without the history nobody is flagged; the lesson can still be taken.
          sessionWorkflowApi.loadClassAttendance(numericClassId).catch(() => []),
        ]);
        if (cancelled) return;

        const nextClass = loaded.classData;
        const nextSessions = loaded.sessions;
        if (isNewSession) {
          // The lesson may have been saved since this link was built; reopen it instead of duplicating it.
          const existing = findSessionOnDate(nextSessions, lessonDate);
          if (existing) {
            navigate(buildSessionWorkflowPath({ classId: numericClassId, sessionId: getSessionId(existing), actions: routeOptions.selectedActions, from: routeOptions.from, tab: routeOptions.tab }), { replace: true });
            return;
          }
        }
        const nextSession = isNewSession
          ? null
          : nextSessions.find((item) => getSessionId(item) === numericSessionId);
        const nextSessionDate = isNewSession ? lessonDate : sessionDateKey(nextSession);
        // Students transferred in after, or out before, this lesson are not part of it.
        const nextStudents = loaded.students.filter((student: any) => wasInGroupOn(student, nextSessionDate));
        const nextAttendanceRecords = loaded.attendanceRecords;
        const lessonStudentIds = new Set(nextStudents.map(getStudentId).filter(Boolean));
        const nextStreakIds = new Set(
          Array.from(findAbsenceStreakStudents({ records: classAttendance, lessonDate: nextSessionDate })).filter((id) => lessonStudentIds.has(id))
        );
        // A saved lesson shows the reasons written for it.
        const nextReasons = new Map<number, string>();
        nextAttendanceRecords.forEach((record: any) => {
          const id = Number(record.student_id);
          const reason = toAbsenceReason(record.remarks);
          if (id && reason) nextReasons.set(id, reason);
        });
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
          if (id && activity && nextScoringSettings.activity.find((option) => option.label === activity)?.stellar) nextStellarStudentId = id;
        });

        // A read-only view shows what is saved, never an unsaved draft.
        if (savedDraftRef.current && !routeOptions.isViewMode) {
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
              (draft.absenceReasons || []).forEach(([studentId, reason]) => {
                if (studentIds.has(Number(studentId))) nextReasons.set(Number(studentId), String(reason ?? ''));
              });
              if (isPageTab(draft.activeTab)) setActiveTab(draft.activeTab);
        }

        setClassData(nextClass);
        setScoringSettings(nextScoringSettings);
        setSessions(nextSessions);
        if (nextSession) {
          setSession(nextSession);
        } else {
          const schedule = parseSchedule(nextClass?.section);
          setSession({
            session_id: isNewSession ? null : numericSessionId,
            class_id: numericClassId,
            center_id: nextClass?.center_id,
            session_date: nextSessionDate,
            start_time: schedule.time.slice(0, 5) || null,
            duration_minutes: getScheduleDurationMinutes(schedule),
          });
        }
        setSelectedDate(nextSessionDate || toDateKey(new Date()));
        setStudents(nextStudents.filter((student) => !student.deleted_at));
        setAttendance(nextAttendance);
        setHomeworkScores(nextHomework);
        setActivityScores(nextActivity);
        setPointsScores(nextPoints);
        setStellarStudentId(nextStellarStudentId);
        setAbsenceStreakIds(nextStreakIds);
        setAbsenceReasons(nextReasons);
        setShowReasonErrors(false);
        setLoadedDraftKey(draftKey);
        const recorded: WorkflowAction[] = [];
        if (nextAttendanceRecords.length > 0) recorded.push('attendance');
        if (nextGrades.some((grade) => grade.homework_score !== null && grade.homework_score !== undefined)) recorded.push('homework');
        if (nextGrades.some((grade) => grade.activity_score !== null && grade.activity_score !== undefined)) recorded.push('activity');
        if (nextGrades.some((grade) => grade.points_score !== null && grade.points_score !== undefined)) recorded.push('points');
        if (nextGrades.some((grade) => Boolean(grade.coin_comment))) recorded.push('coins');
        setRecordedActions(recorded);
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
  }, [draftKey, navigate, numericClassId, numericSessionId, isNewSession, lessonDate]);

  useEffect(() => {
    // Only persist once this route's data is in state; otherwise switching dates would save the
    // previous lesson's marks under the next lesson's key.
    if (loading || isViewMode || loadedDraftKey !== draftKey || suppressDraftPersistence.current) return;
    const draft: SessionWorkflowDraft = {
      attendance: Array.from(attendance.entries()),
      homeworkScores: Array.from(homeworkScores.entries()),
      activityScores: Array.from(activityScores.entries()),
      pointsScores: Array.from(pointsScores.entries()),
      stellarStudentId,
      activeTab: activeTab === 'consolidation' ? 'attendance' : activeTab,
      absenceReasons: Array.from(absenceReasons.entries()),
    };
    dispatch(saveSessionWorkflowDraft({ key: draftKey, draft }));
  }, [absenceReasons, activeTab, activityScores, attendance, dispatch, draftKey, homeworkScores, isViewMode, loadedDraftKey, loading, pointsScores, stellarStudentId]);

  useEffect(() => {
    if (selectedTabs.length === 0) return;
    if (activeTab !== 'consolidation' && !selectedTabs.includes(activeTab)) {
      setActiveTab(selectedTabs[0]);
    }
  }, [activeTab, selectedTabs]);

  const counts = useMemo(() => {
    return getWorkflowCounts(students.length, attendance, homeworkScores, activityScores, pointsScores);
  }, [activityScores, attendance, homeworkScores, pointsScores, students.length]);

  const maxScore = getWorkflowMaxScore(selectedActions, scoringSettings);
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

  // Blocks moving on until every student absent twice in a row has a reason; shows the gaps.
  const checkAbsenceReasons = () => {
    if (!selectedActions.includes('attendance')) return true;
    const missing = getMissingAbsenceReasons(absenceStreakIds, absenceReasons, students.map(getStudentId));
    if (missing.length === 0) return true;
    setShowReasonErrors(true);
    setActiveTab('attendance');
    showToast.error(t('Write a reason for every student absent from the last two lessons.'));
    return false;
  };

  // Stellar is an activity level for one student per lesson: giving it to a student takes it away
  // from the previous one, whose activity is cleared so the teacher picks a new level for them.
  const stellarLabel = scoringSettings.activity.find((option) => option.stellar)?.label || '';
  const toggleActivity = (studentId: number, value: string) => {
    if (isViewMode) return;
    if (!stellarLabel || value !== stellarLabel) {
      toggleMapValue(setActivityScores, studentId, value);
      if (stellarStudentId === studentId) setStellarStudentId(null);
      return;
    }
    const becomesStellar = activityScores.get(studentId) !== stellarLabel;
    const previous = Array.from(activityScores.entries()).find(([id, label]) => label === stellarLabel && id !== studentId)?.[0];
    setActivityScores((current) => {
      const next = new Map(current);
      if (becomesStellar && previous) next.set(previous, '');
      next.set(studentId, becomesStellar ? stellarLabel : '');
      return next;
    });
    setStellarStudentId(becomesStellar ? studentId : null);
    if (becomesStellar && previous) {
      const previousStudent = students.find((student) => getStudentId(student) === previous);
      showToast.info(t('Only one stellar student per lesson. Choose a new activity for {name}.', {
        name: [previousStudent?.first_name, previousStudent?.last_name].filter(Boolean).join(' ') || `#${previous}`,
      }));
    }
  };

  const setAbsenceReason = (studentId: number, value: string) => {
    setAbsenceReasons((current) => new Map(current).set(studentId, value));
  };

  const completeTab = (tab: WorkflowTab) => {
    if (!isTabComplete(tab)) {
      showToast.error('Complete {action} for every student first.', { vars: { action: t(ACTION_LABELS[tab]).toLowerCase() } });
      return;
    }
    if (tab === 'attendance' && !checkAbsenceReasons()) return;
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

  // Switching dates only navigates; a session for an unrecorded date is created when it is saved.
  const handleDateChange = (nextDate: string) => {
    if (!nextDate || !numericClassId || nextDate === selectedDate) return;
    setSelectedDate(nextDate);
    const existingSession = findSessionOnDate(sessions, nextDate);
    const nextTab = activeTab === 'consolidation' ? 'consolidation' : selectedTabs.includes(activeTab) ? activeTab : selectedTabs[0] || 'points';
    navigate(buildSessionWorkflowPath({
      classId: numericClassId,
      sessionId: existingSession ? getSessionId(existingSession) : null,
      date: nextDate,
      actions: selectedActions,
      from,
      tab: nextTab,
      view: isViewMode,
    }), { replace: true });
  };

  const startEditing = () => {
    navigate(buildSessionWorkflowPath({
      classId: numericClassId,
      sessionId: numericSessionId,
      actions: selectedActions,
      from,
      tab: activeTab,
    }), { replace: true });
  };

  // "Suratni yuklash": the class's attendance for the lesson's month, including the lesson just saved.
  const downloadMonthlyAttendanceImage = async () => {
    const monthKey = (selectedDate || toDateKey(new Date())).slice(0, 7);
    try {
      const records = await sessionWorkflowApi.loadClassAttendance(numericClassId);
      const grid = buildMonthlyAttendanceGrid({ students, records, monthKey });
      const className = classData?.class_name || `#${numericClassId}`;
      const canvas = drawMonthlyAttendanceImage(grid, {
        title: className,
        subtitle: classData?.teacher_name ? `O'qituvchi: ${classData.teacher_name}` : undefined,
      });
      if (!canvas) throw new Error('canvas unavailable');
      const safeName = className.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'guruh';
      await downloadCanvasPng(canvas, `davomat_${safeName}_${monthKey}.png`);
    } catch {
      showToast.error(t('Could not create the attendance image.'));
    }
  };

  const saveSession = async () => {
    if (!numericClassId || (!isNewSession && !numericSessionId)) return;
    if (selectedTabs.length === 0) {
      showToast.error('Choose at least one scoring action before saving this lesson.');
      return;
    }
    const incompleteTab = selectedTabs.find((tab) => !isTabComplete(tab));
    if (incompleteTab) {
      showToast.error('Complete {action} for every student.', { vars: { action: t(ACTION_LABELS[incompleteTab]).toLowerCase() } });
      return;
    }
    if (!checkAbsenceReasons()) return;
    if (!centerId) {
      showToast.error('Please select an active center before saving this lesson.');
      return;
    }

    setSubmitting(true);
    try {
      const teacherId = authUser?.userType === 'teacher' && authUser?.id
        ? Number(authUser.id)
        : Number(classData?.teacher_id || session?.teacher_id || 0) || null;
      const records = buildSessionWorkflowRecords({
        students,
        selectedActions,
        attendance,
        homework: homeworkScores,
        activity: activityScores,
        points: pointsScores,
        stellarStudentId,
        settings: scoringSettings,
        attendanceReasons: absenceReasons,
      });

      let targetSessionId = numericSessionId || createdSessionId.current;
      if (!targetSessionId) {
        // Creating a session for the same class/date/time returns the existing row, so a retry is safe.
        const created = await sessionWorkflowApi.createSession(numericClassId, {
          center_id: centerId,
          session_date: selectedDate,
          start_time: session?.start_time || new Date().toTimeString().slice(0, 5),
          duration_minutes: Number(session?.duration_minutes || 90),
          teacher_id: teacherId || undefined,
        });
        targetSessionId = getSessionId(created);
        if (!targetSessionId) throw new Error('Session was created without an id.');
        createdSessionId.current = targetSessionId;
      }

      const saveResponse = await sessionWorkflowApi.save({
        center_id: centerId,
        class_id: numericClassId,
        session_id: targetSessionId,
        teacher_id: teacherId,
        attendance_date: selectedDate,
        subject: classData?.class_name || 'Class Session',
        total_marks: maxScore,
        award_coins: shouldAwardCoins,
        records,
      });
      suppressDraftPersistence.current = true;
      dispatch(clearSessionWorkflowDraft(draftKey));
      setLessonSummary(buildLessonSummary({
        students,
        selectedActions,
        attendance,
        homework: homeworkScores,
        activity: activityScores,
        points: pointsScores,
        stellarStudentId,
        settings: scoringSettings,
        saveResult: getApiPayload(saveResponse),
      }));
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
          {t('Back to class')}
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{t(error)}</AlertDescription>
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
            {searchParams.get('from') === 'teacher' ? t('Back to teacher portal') : t('Back to class')}
          </Button>
          <h1 className="truncate text-xl font-bold text-slate-950 dark:text-foreground">{classData?.class_name || 'Lesson workflow'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 dark:border-border dark:bg-background dark:text-foreground">
              <CalendarDays className="h-4 w-4 text-violet-600" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(event) => handleDateChange(event.target.value)}
                disabled={submitting}
                className="h-7 w-[150px] border-0 bg-transparent p-0 text-xs font-bold shadow-none focus-visible:ring-0"
              />
            </label>
            <span>{session?.start_time || '-'}</span>
            <span>/</span>
            <span>{students.length} {t('students')}</span>
            <span>/</span>
            <span>{shouldAwardCoins ? t('coins on') : t('coins off')}</span>
          </div>
        </div>
        {isViewMode ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-muted/40 px-3 text-xs font-semibold text-muted-foreground">
              <Eye className="h-4 w-4" />
              {t('View only')}
            </span>
            <Button variant="outline" className="h-9" onClick={startEditing}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('Edit marks')}
            </Button>
          </div>
        ) : (
          <Button className="h-9 bg-emerald-600 text-white hover:bg-emerald-700" onClick={saveSession} disabled={submitting || students.length === 0}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {shouldAwardCoins ? t('Save Scores & Coins') : t('Save Scores')}
          </Button>
        )}
      </div>

      <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="p-3">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PageTab)}>
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

            <TabsList className="grid h-auto w-full" style={{ gridTemplateColumns: `repeat(${Math.max(selectedTabs.length, 1) + 1}, minmax(0, 1fr))` }}>
              {selectedTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="py-2">{ACTION_LABELS[tab]}</TabsTrigger>
              ))}
              <TabsTrigger value="consolidation" className="py-2">{t('Consolidation')}</TabsTrigger>
            </TabsList>

            {selectedActions.includes('attendance') && <TabsContent value="attendance" className="pt-4">
              <ScoreTable
                students={students}
                options={scoringSettings.attendance}
                values={attendance}
                onToggle={(studentId, value) => toggleMapValue(setAttendance, studentId, value)}
                onFillAll={(value) => fillMapValue(setAttendance, value)}
                readOnly={isViewMode}
                renderRowNote={(studentId) => {
                  if (!absenceStreakIds.has(studentId)) return null;
                  const reason = absenceReasons.get(studentId) || '';
                  const missing = showReasonErrors && !reason.trim();
                  return (
                    <div className={cn('flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center', missing ? 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30')}>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('Absent from the last 2 lessons')}
                      </span>
                      {isViewMode ? (
                        <span className="text-sm">{reason || '—'}</span>
                      ) : (
                        <Input
                          value={reason}
                          onChange={(event) => setAbsenceReason(studentId, event.target.value)}
                          placeholder={t('Reason (required)')}
                          aria-label={t('Reason (required)')}
                          aria-invalid={missing}
                          className={cn('h-8 flex-1 bg-background text-sm', missing && 'border-rose-400 focus-visible:ring-rose-400')}
                        />
                      )}
                    </div>
                  );
                }}
                action={isViewMode ? undefined : <><Button variant="outline" onClick={() => navigate(backPath)}>{t('Cancel')}</Button><Button onClick={() => completeTab('attendance')}><CheckCircle2 className="mr-2 h-4 w-4" />{getNextTab('attendance') ? t('Complete Attendance') : t('Save Scores')}</Button></>}
              />
            </TabsContent>}

            {selectedActions.includes('homework') && <TabsContent value="homework" className="pt-4">
              <ScoreTable
                students={students}
                options={scoringSettings.homework}
                values={homeworkScores}
                isEnabled={isViewMode ? undefined : (studentId) => !selectedActions.includes('attendance') || Boolean(attendance.get(studentId))}
                onToggle={(studentId, value) => toggleMapValue(setHomeworkScores, studentId, value)}
                onFillAll={(value) => fillMapValue(setHomeworkScores, value, (studentId) => !selectedActions.includes('attendance') || Boolean(attendance.get(studentId)))}
                readOnly={isViewMode}
                action={isViewMode ? undefined : <><Button variant="outline" onClick={() => getPreviousTab('homework') ? setActiveTab(getPreviousTab('homework')!) : navigate(backPath)}>{t('Back')}</Button><Button onClick={() => completeTab('homework')}><ClipboardCheck className="mr-2 h-4 w-4" />{getNextTab('homework') ? t('Complete Homework') : t('Save Scores')}</Button></>}
              />
            </TabsContent>}

            {selectedActions.includes('activity') && <TabsContent value="activity" className="pt-4">
              <ScoreTable
                students={students}
                options={scoringSettings.activity}
                values={activityScores}
                isEnabled={isViewMode ? undefined : (studentId) => (!selectedActions.includes('attendance') || Boolean(attendance.get(studentId))) && (!selectedActions.includes('homework') || Boolean(homeworkScores.get(studentId)))}
                onToggle={toggleActivity}
                onFillAll={(value) => fillMapValue(setActivityScores, value, (studentId) => (!selectedActions.includes('attendance') || Boolean(attendance.get(studentId))) && (!selectedActions.includes('homework') || Boolean(homeworkScores.get(studentId))) && (!stellarLabel || activityScores.get(studentId) !== stellarLabel))}
                getTotalScore={getTotalScore}
                maxScore={maxScore}
                readOnly={isViewMode}
                action={isViewMode ? undefined : <><Button variant="outline" onClick={() => getPreviousTab('activity') ? setActiveTab(getPreviousTab('activity')!) : navigate(backPath)}>{t('Back')}</Button><Button onClick={() => completeTab('activity')} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : getNextTab('activity') ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}{getNextTab('activity') ? t('Complete Activity') : shouldAwardCoins ? t('Save Scores & Coins') : t('Save Scores')}</Button></>}
              />
            </TabsContent>}

            {selectedActions.includes('points') && <TabsContent value="points" className="pt-4">
              <ManualPointsTable
                students={students}
                values={pointsScores}
                onChange={setPointScore}
                onFillAll={fillPointScores}
                getTotalScore={getTotalScore}
                maxScore={maxScore}
                readOnly={isViewMode}
                action={isViewMode ? undefined : <><Button variant="outline" onClick={() => getPreviousTab('points') ? setActiveTab(getPreviousTab('points')!) : navigate(backPath)}>{t('Back')}</Button><Button onClick={() => completeTab('points')} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{shouldAwardCoins ? t('Save Scores & Coins') : t('Save Scores')}</Button></>}
              />
            </TabsContent>}

            <TabsContent value="consolidation" className="pt-4">
              {numericSessionId ? (
                <ConsolidationTab sessionId={numericSessionId} />
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t('Save this lesson first to add consolidation exercises.')}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <LessonSummaryDialog
        summary={lessonSummary}
        className={classData?.class_name}
        date={selectedDate}
        doneLabel={from === 'teacher' ? t('Back to teacher portal') : t('Back to class')}
        onDone={() => navigate(backPath)}
        onReview={() => setLessonSummary(null)}
        onDownloadImage={downloadMonthlyAttendanceImage}
      />
    </div>
  );
}
