import type { LessonScoringSettings } from './lessonScoringSettings';
import type { ScoreOption } from './components/SessionWorkflowScoring';
import { DEFAULT_ATTENDANCE_REMARK } from './absenceStreak';
import { combineLessonScore } from './utils/points';

export type WorkflowScoreMap = Map<number, string>;
export type WorkflowScoringAction = 'attendance' | 'homework' | 'activity' | 'points' | 'coins';

export type WorkflowStudent = {
  id?: number | string;
  student_id?: number | string;
  first_name?: string;
  last_name?: string;
  coins?: number | null;
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

/** Stellar students one lesson may have (the server checks the same limit). */
export const MAX_STELLAR_STUDENTS = 5;

/** Lesson points an excused absence gets automatically; the student is not scored further. */
export const EXCUSED_LESSON_POINTS = 50;

/** Whether attendance marked the student absent or excused (they skip homework and activity). */
export const absenceOf = (label: string | undefined): 'absent' | 'excused' | null => {
  const status = WORKFLOW_ATTENDANCE_STATUS[label || ''];
  return status === 'Absent' ? 'absent' : status === 'Absent R' ? 'excused' : null;
};

export const isAbsentFromLesson = (attendance: WorkflowScoreMap, studentId: number) => absenceOf(attendance.get(studentId)) !== null;

export const getWorkflowCounts = (
  studentCount: number,
  attendance: WorkflowScoreMap,
  homework: WorkflowScoreMap,
  activity: WorkflowScoreMap,
  points: WorkflowScoreMap,
) => {
  const attendanceMarked = Array.from(attendance.values()).filter(Boolean).length;
  // Students marked absent or excused skip homework and activity, so those steps are complete
  // once everyone who came is scored.
  const absentIds = new Set(Array.from(attendance.keys()).filter((id) => isAbsentFromLesson(attendance, id)));
  const scoredWhoCame = (map: WorkflowScoreMap) => Array.from(map.entries()).filter(([id, value]) => Boolean(value) && !absentIds.has(id)).length;
  const homeworkMarked = scoredWhoCame(homework);
  const activityMarked = scoredWhoCame(activity);
  const pointsMarked = Array.from(points.values()).filter((value) => value !== '').length;
  const toScore = studentCount - absentIds.size;
  return {
    total: studentCount,
    attendanceMarked,
    homeworkMarked,
    activityMarked,
    pointsMarked,
    absentCount: absentIds.size,
    allAttendanceMarked: studentCount > 0 && attendanceMarked === studentCount,
    allHomeworkMarked: studentCount > 0 && homeworkMarked === toScore,
    allActivityMarked: studentCount > 0 && activityMarked === toScore,
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
  const manualPoints = Number(points.get(studentId) || 0);
  // Absent: 0. Excused: 50 automatically. Neither is scored for homework or activity.
  const absence = selectedActions.includes('attendance') ? absenceOf(attendanceStatus) : null;
  if (absence === 'absent') return 0;
  if (absence === 'excused') return EXCUSED_LESSON_POINTS;
  return combineLessonScore({
    attendance_score: selectedActions.includes('attendance') ? (attendancePoints[attendanceStatus] || 0) : null,
    homework_score: homeworkPoints[homeworkStatus] || 0,
    activity_score: activityPoints[activityStatus] || 0,
    points_score: selectedActions.includes('points') && Number.isFinite(manualPoints) ? manualPoints : null,
  });
};

const maxOptionScore = (options: ScoreOption[]) => Math.max(0, ...options.map((option) => option.score));

/**
 * The most a lesson can score with the chosen actions, matching the server's lessonMaxScore:
 * attendance only is out of 40, and points stand in for homework and activity (60 next to attendance).
 */
export const getWorkflowMaxScore = (selectedActions: WorkflowScoringAction[], settings: LessonScoringSettings) => {
  const has = (action: WorkflowScoringAction) => selectedActions.includes(action);
  const max = has('points')
    ? 100
    : (has('attendance') ? maxOptionScore(settings.attendance) : 0)
      + (has('homework') ? maxOptionScore(settings.homework) : 0)
      + (has('activity') ? maxOptionScore(settings.activity) : 0);
  return max > 0 ? max : 100;
};

/** A score as a percentage of the lesson's maximum, which is what the 2-5 grade is based on. */
export const toLessonPercent = (score: number, maxScore: number) => (maxScore > 0 ? Math.round((score * 100) / maxScore) : 0);

/** Workflow attendance labels → stored attendance statuses. */
export const WORKFLOW_ATTENDANCE_STATUS: Record<string, string> = { 'On time': 'Present', Late: 'Late', Excused: 'Absent R', Absent: 'Absent' };

export const buildSessionWorkflowRecords = ({
  students,
  selectedActions,
  attendance,
  homework,
  activity,
  points,
  stellarStudentIds,
  settings,
  attendanceReasons,
}: {
  students: WorkflowStudent[];
  selectedActions: WorkflowScoringAction[];
  attendance: WorkflowScoreMap;
  homework: WorkflowScoreMap;
  activity: WorkflowScoreMap;
  points: WorkflowScoreMap;
  stellarStudentIds: number[];
  settings: LessonScoringSettings;
  /** Reasons written for students absent from the previous lessons in a row; saved as remarks. */
  attendanceReasons?: WorkflowScoreMap;
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
    // In the 100-point mode attendance is not taken by hand: a 0 marks the student absent and any
    // other score present, so attendance still knows who missed the lesson.
    const pointsGiven = selectedActions.includes('points') && points.has(studentId) && String(points.get(studentId)).trim() !== '';
    const attendanceFromPoints = !selectedActions.includes('attendance') && pointsGiven;
    const absence = selectedActions.includes('attendance') ? absenceOf(attendanceStatus) : null;
    return {
      student_id: studentId,
      is_stellar_student: !absence && awardsCoins && stellarStudentIds.includes(studentId),
      stellar_bonus_coins: !absence && awardsCoins && stellarStudentIds.includes(studentId) ? settings.stellarBonusCoins : 0,
      attendance_status: selectedActions.includes('attendance')
        ? (statusMap[attendanceStatus] || attendanceStatus)
        : attendanceFromPoints ? (pointsScore === 0 ? 'Absent' : 'Present') : null,
      attendance_remarks: selectedActions.includes('attendance') || attendanceFromPoints ? (attendanceReasons?.get(studentId)?.trim() || DEFAULT_ATTENDANCE_REMARK) : null,
      attendance_score: selectedActions.includes('attendance') ? (attendancePoints[attendanceStatus] || 0) : null,
      homework_score: !absence && selectedActions.includes('homework') && homeworkStatus ? (homeworkPoints[homeworkStatus] ?? 0) : null,
      activity_score: !absence && selectedActions.includes('activity') && activityStatus ? (activityPoints[activityStatus] ?? 0) : null,
      // An excused absence is saved as a 50-point lesson; an absence stays at 0 (attendance only).
      points_score: absence === 'excused'
        ? EXCUSED_LESSON_POINTS
        : !absence && selectedActions.includes('points') && Number.isFinite(pointsScore) ? pointsScore : null,
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
  stellarStudentNames: string[];
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
  stellarStudentIds,
  settings,
  saveResult,
}: {
  students: WorkflowStudent[];
  selectedActions: WorkflowScoringAction[];
  attendance: WorkflowScoreMap;
  homework: WorkflowScoreMap;
  activity: WorkflowScoreMap;
  points: WorkflowScoreMap;
  stellarStudentIds: number[];
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

  const maxScore = getWorkflowMaxScore(selectedActions, settings);
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
  const stellar = has('activity') || has('coins') ? counted.filter((student) => stellarStudentIds.includes(getWorkflowStudentId(student))) : [];

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
    stellarStudentNames: stellar.map(studentName),
    skipped: skippedIds.size,
  };
};
