export {};

// Retention, the owner's way: every student who left in the month in one of five groups, in this
// order, and the teachers ranked by the share of their students they lost.
//   1. trial      - came to 2 lessons or fewer and left
//   2. new_group  - left a newly opened group before it was a month old
//   3. long_term  - had been studying for a while and left
//   4. graduated  - finished the course (Graduated / Finished successfully)
//   5. transfer   - moved to another group (shown for information only)
// Only the first three are students lost; graduates and transfers never count against a teacher.
// The admissions balance sets the new students of the month against the students lost (1-4;
// transfers are not counted on either side).

const repository = require('../repositories/retentionBreakdown.repository');

export type LeaveCategory = 'trial' | 'new_group' | 'long_term' | 'graduated' | 'transfer';
export const CATEGORY_ORDER: LeaveCategory[] = ['trial', 'new_group', 'long_term', 'graduated', 'transfer'];
const LOST: LeaveCategory[] = ['trial', 'new_group', 'long_term'];
const GRADUATED_REASONS = new Set(['graduated', 'finished_successfully']);
const TRIAL_LESSONS = 2;
const NEW_GROUP_DAYS = 31;

const daysBetween = (from?: string | null, to?: string | null) => {
  if (!from || !to) return null;
  const ms = Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.round(ms / 86400000) : null;
};

/** Which of the five groups a student who left belongs to. */
const categoryOf = (row: { status?: string | null; reason_code?: string | null; lessons_attended?: number | string | null; group_started_on?: string | null; left_on?: string | null }): LeaveCategory => {
  if (row.status === 'Transferred') return 'transfer';
  if (GRADUATED_REASONS.has(String(row.reason_code || ''))) return 'graduated';
  if (Number(row.lessons_attended || 0) <= TRIAL_LESSONS) return 'trial';
  const groupAge = daysBetween(row.group_started_on, row.left_on);
  if (groupAge !== null && groupAge < NEW_GROUP_DAYS) return 'new_group';
  return 'long_term';
};

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/** Teachers ranked by the share of their students lost (1-3), most lost first. */
const rankTeachersByLoss = (leavers: Array<{ teacher_id?: number | null; teacher_name?: string | null; category: LeaveCategory }>, students: Array<{ teacher_id: number; teacher_name?: string | null; students: number }>) => {
  const rows = new Map<number, { teacher_id: number; teacher_name: string; students: number; lost: number; by_category: Record<string, number> }>();
  const rowFor = (id: number, name?: string | null) => {
    if (!rows.has(id)) rows.set(id, { teacher_id: id, teacher_name: name || `#${id}`, students: 0, lost: 0, by_category: { trial: 0, new_group: 0, long_term: 0 } });
    return rows.get(id)!;
  };
  students.forEach((row) => { rowFor(Number(row.teacher_id), row.teacher_name).students = Number(row.students || 0); });
  leavers.forEach((row) => {
    if (!row.teacher_id || !LOST.includes(row.category)) return;
    const entry = rowFor(Number(row.teacher_id), row.teacher_name);
    entry.lost += 1;
    entry.by_category[row.category] += 1;
  });
  return Array.from(rows.values())
    .map((row) => ({ ...row, lost_percent: percent(row.lost, Math.max(row.students, row.lost)) }))
    .sort((a, b) => b.lost_percent - a.lost_percent || b.lost - a.lost || a.teacher_name.localeCompare(b.teacher_name))
    .map((row, index) => ({ ...row, place: index + 1 }));
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthBounds = (month: string) => {
  const [year, value] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
};
const centerMonth = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7);

const breakdown = async (query: any, centerId?: number, now?: Date) => {
  const month = MONTH.test(String(query?.month || '')) ? String(query.month) : centerMonth(now);
  const filters = {
    centerId,
    ...monthBounds(month),
    teacherId: Number(query?.teacher_id) || undefined,
    subject: String(query?.subject || '').trim() || undefined,
    levelId: Number(query?.level_id) || undefined,
  };
  const [leaverRows, studentRows, newRows] = await Promise.all([
    repository.findLeavers(filters),
    repository.studentsPerTeacher(filters),
    repository.findNewStudents(filters),
  ]);

  const leavers = leaverRows.map((row: any) => ({ ...row, lessons_attended: Number(row.lessons_attended || 0), category: categoryOf(row) }));
  const categories = CATEGORY_ORDER.map((key) => {
    const students = leavers.filter((row: any) => row.category === key);
    return { key, count: students.length, counts_as_lost: LOST.includes(key), students };
  });
  const lost = leavers.filter((row: any) => LOST.includes(row.category)).length;
  const graduated = leavers.filter((row: any) => row.category === 'graduated').length;

  // Admissions: who joined, for which teacher, and why they came.
  const admittedByTeacher = new Map<number, { teacher_id: number; teacher_name: string; admitted: number; came_for_teacher: number }>();
  newRows.forEach((row: any) => {
    const id = Number(row.teacher_id || 0);
    if (!id) return;
    const entry = admittedByTeacher.get(id) || { teacher_id: id, teacher_name: row.teacher_name || `#${id}`, admitted: 0, came_for_teacher: 0 };
    entry.admitted += 1;
    if (row.referred_by_teacher_id) entry.came_for_teacher += 1;
    admittedByTeacher.set(id, entry);
  });
  const cameForTeacher = newRows.filter((row: any) => row.referred_by_teacher_id).length;
  // Students who left the center, without transfers: lost (1-3) and graduates (4).
  const leftCenter = lost + graduated;

  return {
    month,
    filters: { teacher_id: filters.teacherId ?? null, subject: filters.subject ?? null, level_id: filters.levelId ?? null },
    categories,
    summary: { lost, graduated, transfers: leavers.length - lost - graduated, left: leavers.length },
    teacher_ranking: rankTeachersByLoss(leavers, studentRows),
    admissions: {
      new_students: newRows.length,
      left_center: leftCenter,
      balance: newRows.length - leftCenter,
      came_for_teacher: cameForTeacher,
      came_for_center: newRows.length - cameForTeacher,
      by_teacher: Array.from(admittedByTeacher.values()).sort((a, b) => b.admitted - a.admitted || a.teacher_name.localeCompare(b.teacher_name)),
      students: newRows,
    },
  };
};

module.exports = { breakdown, categoryOf, rankTeachersByLoss, CATEGORY_ORDER };
