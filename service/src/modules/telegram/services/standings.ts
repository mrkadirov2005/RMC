// Where a student stands this month, by the sum of their lesson scores: their place in the group,
// whether they are in the group's bottom five (never for a top-five student), and their place in
// the whole center (a child in several groups is counted once).
const { combineLessonScore } = require('../../grades/services/lessonScore');

const TOP = 5;

const placeOf = (totals: Map<number, number>, key: number) => {
  const ranked = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const index = ranked.findIndex(([id]) => id === key);
  return { place: index === -1 ? null : index + 1, size: ranked.length };
};

const computeStandings = (
  monthRows: Array<{ class_id: number; main_student_id: number; attendance_score?: unknown; homework_score?: unknown; activity_score?: unknown; points_score?: unknown }>,
  classId: number,
  mainStudentId: number
) => {
  const groupTotals = new Map<number, number>();
  const centerTotals = new Map<number, number>();
  monthRows.forEach((row) => {
    const studentKey = Number(row.main_student_id);
    const score = combineLessonScore(row);
    centerTotals.set(studentKey, (centerTotals.get(studentKey) || 0) + score);
    if (Number(row.class_id) === classId) groupTotals.set(studentKey, (groupTotals.get(studentKey) || 0) + score);
  });
  const group = placeOf(groupTotals, mainStudentId);
  const center = placeOf(centerTotals, mainStudentId);
  return {
    groupPlace: group.place,
    groupSize: group.size,
    inGroupBottomFive: group.place !== null && group.place > TOP && group.place > group.size - TOP,
    centerPlace: center.place,
  };
};

module.exports = { computeStandings };

export {};
