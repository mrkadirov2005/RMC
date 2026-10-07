// Students who missed their group's latest lessons in a row (unexcused Absent) and whose absence
// no admin has dealt with yet. A group's lessons are the dates attendance was taken for it, so a
// student with no record on a lesson date (not in the group yet, or not marked) breaks the run.

const MIN_STREAK = 2;
const DEFAULT_REMARK = 'Daily Session Grading';

const isUnexcusedAbsent = (status: unknown) => {
  const value = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return value === 'absent' || value === 'absent_nr';
};

const dayOf = (value: unknown) => String(value || '').slice(0, 10);

type AttendanceRow = {
  student_id: number;
  class_id: number;
  attendance_date: unknown;
  status: unknown;
  remarks?: unknown;
};

type ResolutionRow = { student_id: number; class_id: number | null; resolved_through: unknown };

const findOpenAbsenceAlerts = ({
  records,
  resolutions = [],
  minStreak = MIN_STREAK,
}: {
  records: AttendanceRow[];
  resolutions?: ResolutionRow[];
  minStreak?: number;
}) => {
  const lessonDatesByClass = new Map<number, Set<string>>();
  const recordByKey = new Map<string, AttendanceRow>();
  const studentsByClass = new Map<number, Set<number>>();
  records.forEach((record) => {
    const classId = Number(record.class_id);
    const studentId = Number(record.student_id);
    const day = dayOf(record.attendance_date);
    if (!classId || !studentId || !day) return;
    if (!lessonDatesByClass.has(classId)) lessonDatesByClass.set(classId, new Set());
    lessonDatesByClass.get(classId)!.add(day);
    if (!studentsByClass.has(classId)) studentsByClass.set(classId, new Set());
    studentsByClass.get(classId)!.add(studentId);
    recordByKey.set(`${classId}:${studentId}:${day}`, record);
  });

  // The latest absence each student+group was already resolved through.
  const resolvedThrough = new Map<string, string>();
  resolutions.forEach((resolution) => {
    const key = `${Number(resolution.class_id || 0)}:${Number(resolution.student_id)}`;
    const day = dayOf(resolution.resolved_through);
    if (day > (resolvedThrough.get(key) || '')) resolvedThrough.set(key, day);
  });

  const alerts: Array<{
    student_id: number;
    class_id: number;
    streak: number;
    absent_dates: string[];
    last_absent_date: string;
    teacher_reason: string | null;
  }> = [];

  lessonDatesByClass.forEach((dates, classId) => {
    const lessonDates = Array.from(dates).sort().reverse();
    studentsByClass.get(classId)!.forEach((studentId) => {
      const absentDates: string[] = [];
      let teacherReason: string | null = null;
      for (const day of lessonDates) {
        const record = recordByKey.get(`${classId}:${studentId}:${day}`);
        if (!record || !isUnexcusedAbsent(record.status)) break;
        absentDates.push(day);
        const remark = String(record.remarks || '').trim();
        if (!teacherReason && remark && remark !== DEFAULT_REMARK) teacherReason = remark;
      }
      if (absentDates.length < minStreak) return;
      const lastAbsentDate = absentDates[0];
      if ((resolvedThrough.get(`${classId}:${studentId}`) || '') >= lastAbsentDate) return;
      alerts.push({
        student_id: studentId,
        class_id: classId,
        streak: absentDates.length,
        absent_dates: absentDates,
        last_absent_date: lastAbsentDate,
        teacher_reason: teacherReason,
      });
    });
  });

  return alerts.sort((a, b) => b.streak - a.streak || b.last_absent_date.localeCompare(a.last_absent_date));
};

module.exports = { findOpenAbsenceAlerts, MIN_STREAK };

export {};
