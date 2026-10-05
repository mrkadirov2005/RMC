import type { LessonScoringSettings } from './lessonScoringSettings';
import type { ScoreOption } from './components/SessionWorkflowScoring';

export type WorkflowScoreMap = Map<number, string>;
export type WorkflowScoringAction = 'attendance' | 'homework' | 'activity' | 'points' | 'coins';

export type WorkflowStudent = {
  id?: number | string;
  student_id?: number | string;
  first_name?: string;
  last_name?: string;
  deleted_at?: string | null;
};

export const getWorkflowStudentId = (student: WorkflowStudent) => Number(student.student_id || student.id || 0);

export const toWorkflowPointMap = (options: Array<{ label: string; score: number }>) =>
  Object.fromEntries(options.map((option) => [option.label, option.score]));

export const clampWorkflowPoints = (value: string) => {
  const numericValue = Number(value);
  return value === '' || !Number.isFinite(numericValue)
    ? ''
    : String(Math.max(0, Math.min(100, Math.round(numericValue))));
};

export const getWorkflowCounts = (
  studentCount: number,
  attendance: WorkflowScoreMap,
  homework: WorkflowScoreMap,
  activity: WorkflowScoreMap,
  points: WorkflowScoreMap,
) => {
  const attendanceMarked = Array.from(attendance.values()).filter(Boolean).length;
  const homeworkMarked = Array.from(homework.values()).filter(Boolean).length;
  const activityMarked = Array.from(activity.values()).filter(Boolean).length;
  const pointsMarked = Array.from(points.values()).filter((value) => value !== '').length;
  return {
    total: studentCount,
    attendanceMarked,
    homeworkMarked,
    activityMarked,
    pointsMarked,
    allAttendanceMarked: studentCount > 0 && attendanceMarked === studentCount,
    allHomeworkMarked: studentCount > 0 && homeworkMarked === studentCount,
    allActivityMarked: studentCount > 0 && activityMarked === studentCount,
    allPointsMarked: studentCount > 0 && pointsMarked === studentCount,
  };
};

export const getWorkflowTotalScore = ({
  studentId,
  selectedActions,
  attendance,
  homework,
  activity,
  points,
  settings,
}: {
  studentId: number;
  selectedActions: WorkflowScoringAction[];
  attendance: WorkflowScoreMap;
  homework: WorkflowScoreMap;
  activity: WorkflowScoreMap;
  points: WorkflowScoreMap;
  settings: LessonScoringSettings;
}) => {
  const attendancePoints = toWorkflowPointMap(settings.attendance);
  const homeworkPoints = toWorkflowPointMap(settings.homework);
  const activityPoints = toWorkflowPointMap(settings.activity);
  const attendanceStatus = selectedActions.includes('attendance') ? attendance.get(studentId) || '' : '';
  const homeworkStatus = selectedActions.includes('homework') ? homework.get(studentId) || '' : '';
  const activityStatus = selectedActions.includes('activity') ? activity.get(studentId) || '' : '';
  const manualPoints = selectedActions.includes('points') ? Number(points.get(studentId) || 0) : 0;
  return (attendancePoints[attendanceStatus] || 0)
    + (homeworkPoints[homeworkStatus] || 0)
    + (activityPoints[activityStatus] || 0)
    + (Number.isFinite(manualPoints) ? manualPoints : 0);
};

/** Workflow attendance labels → stored attendance statuses. */
export const WORKFLOW_ATTENDANCE_STATUS: Record<string, string> = { 'On time': 'Present', Late: 'Late', Excused: 'Absent R', Absent: 'Absent' };

export const buildSessionWorkflowRecords = ({
  students,
  selectedActions,
  attendance,
  homework,
  activity,
  points,
  stellarStudentId,
  settings,
}: {
  students: WorkflowStudent[];
  selectedActions: WorkflowScoringAction[];
  attendance: WorkflowScoreMap;
  homework: WorkflowScoreMap;
  activity: WorkflowScoreMap;
  points: WorkflowScoreMap;
  stellarStudentId: number | null;
  settings: LessonScoringSettings;
}) => {
  const attendancePoints = toWorkflowPointMap(settings.attendance);
  const homeworkPoints = toWorkflowPointMap(settings.homework);
  const activityPoints = toWorkflowPointMap(settings.activity);
  const statusMap = WORKFLOW_ATTENDANCE_STATUS;
  const awardsCoins = selectedActions.includes('coins');

  return students.map((student) => {
    const studentId = getWorkflowStudentId(student);
    const attendanceStatus = attendance.get(studentId) || '';
    const homeworkStatus = homework.get(studentId);
    const activityStatus = activity.get(studentId);
    const pointsScore = Number(points.get(studentId) || 0);
    return {
      student_id: studentId,
      is_stellar_student: awardsCoins && stellarStudentId === studentId,
      stellar_bonus_coins: awardsCoins && stellarStudentId === studentId ? settings.stellarBonusCoins : 0,
      attendance_status: selectedActions.includes('attendance') ? (statusMap[attendanceStatus] || attendanceStatus) : null,
      attendance_remarks: selectedActions.includes('attendance') ? 'Daily Session Grading' : null,
      attendance_score: selectedActions.includes('attendance') ? (attendancePoints[attendanceStatus] || 0) : null,
      homework_score: selectedActions.includes('homework') && homeworkStatus ? (homeworkPoints[homeworkStatus] ?? 0) : null,
      activity_score: selectedActions.includes('activity') && activityStatus ? (activityPoints[activityStatus] ?? 0) : null,
      points_score: selectedActions.includes('points') && Number.isFinite(pointsScore) ? pointsScore : null,
    };
  }).filter((record) => record.student_id > 0);
};

export type LessonSummaryBreakdown = Array<{ label: string; symbol: string; tone: ScoreOption['tone']; count: number }>;

export type LessonSummaryStatus = 'excellent' | 'good' | 'fair' | 'weak';

export type LessonSummary = {
  total: number;
  status: LessonSummaryStatus;
  averagePercent: number;
  averageScore: number;
  maxScore: number;
  attendance: { present: number; rate: number; breakdown: LessonSummaryBreakdown } | null;
  homework: LessonSummaryBreakdown | null;
  activity: LessonSummaryBreakdown | null;
  pointsAverage: number | null;
  topStudents: Array<{ id: number; name: string; score: number }>;
  missedStudents: Array<{ id: number; name: string; status: string }>;
  coins: { total: number; students: number } | null;
  stellarStudentName: string | null;
  skipped: number;
};

const studentName = (student: WorkflowStudent) =>
  [student.first_name, student.last_name].filter(Boolean).join(' ').trim() || `#${getWorkflowStudentId(student)}`;

const breakdownOf = (options: ScoreOption[], values: WorkflowScoreMap, ids: number[]): LessonSummaryBreakdown =>
  options.map((option) => ({
    label: option.label,
    symbol: option.symbol,
    tone: option.tone,
    count: ids.filter((id) => values.get(id) === option.label).length,
  }));

const maxOptionScore = (options: ScoreOption[]) => Math.max(0, ...options.map((option) => option.score));

const isPresentStatus = (label: string) => {
  const status = WORKFLOW_ATTENDANCE_STATUS[label] || label;
  return status === 'Present' || status === 'Late';
};

/** Lesson statistics shown once the session workflow is saved. */
export const buildLessonSummary = ({
  students,
  selectedActions,
  attendance,
  homework,
  activity,
  points,
  stellarStudentId,
  settings,
  saveResult,
}: {
  students: WorkflowStudent[];
  selectedActions: WorkflowScoringAction[];
  attendance: WorkflowScoreMap;
  homework: WorkflowScoreMap;
  activity: WorkflowScoreMap;
  points: WorkflowScoreMap;
  stellarStudentId: number | null;
  settings: LessonScoringSettings;
  saveResult?: { coins?: Array<{ transaction?: { student_id?: number; delta?: number } }>; skipped_student_ids?: number[] } | null;
}): LessonSummary => {
  // Students the server skipped (transferred out before this lesson) were not recorded.
  const skippedIds = new Set((saveResult?.skipped_student_ids || []).map(Number));
  const counted = students.filter((student) => {
    const id = getWorkflowStudentId(student);
    return id > 0 && !skippedIds.has(id);
  });
  const ids = counted.map(getWorkflowStudentId);
  const has = (action: WorkflowScoringAction) => selectedActions.includes(action);

  const maxScore = (has('attendance') ? maxOptionScore(settings.attendance) : 0)
    + (has('homework') ? maxOptionScore(settings.homework) : 0)
    + (has('activity') ? maxOptionScore(settings.activity) : 0)
    + (has('points') ? 100 : 0);
  const scored = counted.map((student) => {
    const id = getWorkflowStudentId(student);
    return {
      id,
      name: studentName(student),
      score: getWorkflowTotalScore({ studentId: id, selectedActions, attendance, homework, activity, points, settings }),
    };
  });
  const averageScore = scored.length ? scored.reduce((sum, item) => sum + item.score, 0) / scored.length : 0;
  const averagePercent = maxScore > 0 ? Math.round((averageScore / maxScore) * 100) : 0;
  const status: LessonSummaryStatus = averagePercent >= 85 ? 'excellent' : averagePercent >= 70 ? 'good' : averagePercent >= 50 ? 'fair' : 'weak';

  const present = ids.filter((id) => isPresentStatus(attendance.get(id) || '')).length;
  const pointValues = ids.map((id) => points.get(id)).filter((value): value is string => value !== undefined && value !== '').map(Number);

  const coinRows = (saveResult?.coins || []).filter((row) => row?.transaction);
  const stellar = stellarStudentId && has('coins') ? counted.find((student) => getWorkflowStudentId(student) === stellarStudentId) : null;

  return {
    total: counted.length,
    status,
    averagePercent,
    averageScore: Math.round(averageScore * 10) / 10,
    maxScore,
    attendance: has('attendance')
      ? { present, rate: ids.length ? Math.round((present / ids.length) * 100) : 0, breakdown: breakdownOf(settings.attendance, attendance, ids) }
      : null,
    homework: has('homework') ? breakdownOf(settings.homework, homework, ids) : null,
    activity: has('activity') ? breakdownOf(settings.activity, activity, ids) : null,
    pointsAverage: has('points') && pointValues.length
      ? Math.round((pointValues.reduce((sum, value) => sum + value, 0) / pointValues.length) * 10) / 10
      : null,
    topStudents: scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3),
    missedStudents: has('attendance')
      ? counted
          .filter((student) => !isPresentStatus(attendance.get(getWorkflowStudentId(student)) || ''))
          .map((student) => ({ id: getWorkflowStudentId(student), name: studentName(student), status: attendance.get(getWorkflowStudentId(student)) || '' }))
      : [],
    coins: has('coins')
      ? { total: coinRows.reduce((sum, row) => sum + Number(row.transaction?.delta || 0), 0), students: coinRows.length }
      : null,
    stellarStudentName: stellar ? studentName(stellar) : null,
    skipped: skippedIds.size,
  };
};
