// Students absent from the class's previous lessons in a row must get a written reason when the
// next lesson's attendance is taken. Only an unexcused Absent counts: Excused already has one.

/** What the workflow saves as an attendance record's remarks when there is no reason to keep. */
export const DEFAULT_ATTENDANCE_REMARK = 'Daily Session Grading';

export const ABSENCE_STREAK_LENGTH = 2;

const isUnexcusedAbsent = (status: unknown) => {
  const value = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return value === 'absent' || value === 'absent_nr';
};

/**
 * The students absent from each of the class's last `streak` lessons before `lessonDate`. The
 * lessons are the dates the class had attendance taken, so a student who was not yet in the group
 * then (no record) is not flagged.
 */
export const findAbsenceStreakStudents = ({
  records,
  lessonDate,
  streak = ABSENCE_STREAK_LENGTH,
}: {
  records: Array<{ student_id?: unknown; attendance_date?: unknown; status?: unknown }>;
  lessonDate: string;
  streak?: number;
}) => {
  const dayOf = (record: { attendance_date?: unknown }) => String(record.attendance_date || '').slice(0, 10);
  const previousLessons = Array.from(new Set(records.map(dayOf).filter((day) => day && day < lessonDate)))
    .sort()
    .reverse()
    .slice(0, streak);
  const flagged = new Set<number>();
  if (previousLessons.length < streak) return flagged;

  const absentDays = new Map<number, Set<string>>();
  records.forEach((record) => {
    const studentId = Number(record.student_id);
    const day = dayOf(record);
    if (!studentId || !previousLessons.includes(day) || !isUnexcusedAbsent(record.status)) return;
    if (!absentDays.has(studentId)) absentDays.set(studentId, new Set());
    absentDays.get(studentId)!.add(day);
  });
  absentDays.forEach((days, studentId) => {
    if (previousLessons.every((day) => days.has(day))) flagged.add(studentId);
  });
  return flagged;
};

/** The reason saved on a lesson's attendance record, or '' when it only holds the default remark. */
export const toAbsenceReason = (remarks: unknown) => {
  const value = String(remarks || '').trim();
  return value === DEFAULT_ATTENDANCE_REMARK ? '' : value;
};

/** Flagged students still missing a reason. */
export const getMissingAbsenceReasons = (flagged: Set<number>, reasons: Map<number, string>, studentIds: number[]) =>
  studentIds.filter((id) => flagged.has(id) && !String(reasons.get(id) || '').trim());
