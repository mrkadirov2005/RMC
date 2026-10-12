const repository = require('../repositories/lessonControl.repository');
const { expectedLessons, evaluate } = require('./gradingDiscipline');

// Lessons before this day are not judged: teachers learn about the two-hour rule when it ships.
// GRADING_RULE_START (YYYY-MM-DD) can move it.
const RULE_START = /^\d{4}-\d{2}-\d{2}$/.test(String(process.env.GRADING_RULE_START)) ? String(process.env.GRADING_RULE_START) : '2026-10-12';

const isDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const isMonth = (value: unknown) => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max) || null;

/** Now in Tashkent as "YYYY-MM-DD HH:MM". */
const tashkentNow = (now = new Date()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};

const lastDayOf = (month: string) => {
  const [year, mon] = month.split('-').map(Number);
  return `${month}-${String(new Date(Date.UTC(year, mon, 0)).getUTCDate()).padStart(2, '0')}`;
};

/** Every teacher's lessons over a range, evaluated. */
const evaluateRange = async (from: string, to: string, now: string, monthFinished: boolean, centerId?: number, teacherId?: number) => {
  if (to < RULE_START) return [];
  if (from < RULE_START) from = RULE_START;
  const classes = await repository.findClasses(centerId, teacherId);
  const classIds = classes.map((cls: any) => Number(cls.class_id));
  const [daysOff, moves, sessions] = await Promise.all([
    repository.findDaysOff(from, to, centerId),
    repository.findApprovedMoves(classIds, from, to),
    repository.findGradedSessions(classIds, from, to),
  ]);
  const byTeacher = new Map<number, any[]>();
  classes.forEach((cls: any) => {
    const id = Number(cls.teacher_id);
    if (id) byTeacher.set(id, [...(byTeacher.get(id) || []), cls]);
  });
  return Array.from(byTeacher.entries()).map(([id, teacherClasses]) => {
    const lessons = expectedLessons(teacherClasses, from, to, daysOff, moves);
    return { teacher_id: id, teacher_name: teacherClasses[0].teacher_name, ...evaluate(lessons, sessions, now, monthFinished) };
  }).sort((a, b) => a.summary.points - b.summary.points || String(a.teacher_name).localeCompare(String(b.teacher_name)));
};

/** A month's scoring discipline per teacher (lessons included only for one teacher). */
const discipline = async (query: any, centerId?: number, teacherId?: number, now = new Date()) => {
  const current = tashkentNow(now);
  const month = isMonth(query?.month) ? query.month : current.slice(0, 7);
  const last = lastDayOf(month);
  const today = current.slice(0, 10);
  if (`${month}-01` > today) return { month, teachers: [] };
  const to = last < today ? last : today;
  const onlyTeacher = teacherId ?? (Number(query?.teacher_id) || undefined);
  const teachers = await evaluateRange(`${month}-01`, to, current, last < today, centerId, onlyTeacher);
  return { month, teachers: onlyTeacher ? teachers : teachers.map(({ lessons, ...rest }: any) => rest) };
};

/** A teacher's reminder: lessons of the last week still waiting for scores, most urgent first. */
const dueForTeacher = async (teacherId: number, now = new Date()) => {
  const current = tashkentNow(now);
  const today = current.slice(0, 10);
  const weekAgo = new Date(`${today}T00:00:00Z`);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const [teacher] = await evaluateRange(weekAgo.toISOString().slice(0, 10), today, current, false, undefined, teacherId);
  return (teacher?.lessons || []).filter((lesson: any) => lesson.status === 'missing' || (lesson.status === 'pending' && lesson.date === today));
};

const listDaysOff = (query: any, centerId?: number, now = new Date()) => {
  const month = isMonth(query?.month) ? query.month : tashkentNow(now).slice(0, 7);
  return repository.findDaysOff(`${month}-01`, lastDayOf(month), centerId);
};

const addDayOff = async (body: any, centerId: number | undefined, createdByName: string | null) => {
  if (!isDate(body?.off_date)) return { error: 'invalid_date' as const };
  const classId = Number(body?.class_id) || null;
  let center = centerId;
  if (classId) {
    const cls = await repository.findClassInCenter(classId, centerId);
    if (!cls) return { error: 'class_not_found' as const };
    center = Number(cls.center_id);
  }
  if (!center) return { error: 'center_required' as const };
  const row = await repository.insertDayOff({ centerId: center, offDate: body.off_date, classId, note: text(body?.note, 500), createdByName });
  return row ? { row } : { error: 'already_exists' as const };
};

const requestReschedule = async (body: any, teacherId: number) => {
  const classId = Number(body?.class_id);
  if (!isDate(body?.original_date) || !isDate(body?.new_date) || body.original_date === body.new_date) return { error: 'invalid_date' as const };
  const newTime = body?.new_time ? String(body.new_time).slice(0, 5) : null;
  if (newTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) return { error: 'invalid_time' as const };
  const cls = await repository.findClassForTeacher(classId, teacherId);
  if (!cls) return { error: 'class_not_found' as const };
  return { row: await repository.insertReschedule({ centerId: Number(cls.center_id), classId, teacherId, originalDate: body.original_date, newDate: body.new_date, newTime, reason: text(body?.reason, 1000) }) };
};

const decideReschedule = async (rescheduleId: number, approve: boolean, decidedByName: string | null, centerId?: number) =>
  (await repository.decideReschedule(rescheduleId, approve ? 'approved' : 'rejected', decidedByName, centerId)) ? { ok: true } : { error: 'not_found' as const };

module.exports = {
  RULE_START,
  discipline, dueForTeacher, listDaysOff, addDayOff, deleteDayOff: repository.deleteDayOff,
  requestReschedule, listReschedules: repository.findReschedules, decideReschedule, tashkentNow,
};
export {};
