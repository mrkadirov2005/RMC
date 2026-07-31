import type { LessonScoringSettings } from './lessonScoringSettings';

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
  const statusMap: Record<string, string> = { 'On time': 'Present', Late: 'Late', Excused: 'Absent R', Absent: 'Absent' };
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
