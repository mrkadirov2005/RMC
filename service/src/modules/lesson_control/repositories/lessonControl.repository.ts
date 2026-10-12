const pool = require('../../../db/pool');

// Grade timestamps are written by the database clock, which runs in UTC (the Postgres container
// sets no time zone); lesson dates and times are Tashkent time.
const GRADE_CLOCK_TIME_ZONE = 'UTC';

const findClasses = async (centerId?: number, teacherId?: number) => (await pool.query(
  `SELECT c.class_id, c.class_name, c.teacher_id, c.section, c.center_id,
          COALESCE(c.start_date, c.created_at)::date::text AS starts_on,
          NULLIF(trim(concat_ws(' ', t.last_name, t.first_name)), '') AS teacher_name
   FROM classes c LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
   WHERE c.deleted_at IS NULL AND ($1::int IS NULL OR c.center_id = $1) AND ($2::int IS NULL OR c.teacher_id = $2)`,
  [centerId ?? null, teacherId ?? null]
)).rows;

const findDaysOff = async (from: string, to: string, centerId?: number) => (await pool.query(
  `SELECT d.day_off_id, d.center_id, d.off_date::text AS off_date, d.class_id, c.class_name, d.note, d.created_by_name
   FROM lesson_days_off d LEFT JOIN classes c ON c.class_id = d.class_id
   WHERE d.off_date BETWEEN $1::date AND $2::date AND ($3::int IS NULL OR d.center_id = $3)
   ORDER BY d.off_date`,
  [from, to, centerId ?? null]
)).rows;

const findApprovedMoves = async (classIds: number[], from: string, to: string) => (classIds.length ? (await pool.query(
  `SELECT class_id, original_date::text AS original_date, new_date::text AS new_date, to_char(new_time, 'HH24:MI') AS new_time
   FROM lesson_reschedules
   WHERE status = 'approved' AND class_id = ANY($1::int[])
     AND (original_date BETWEEN $2::date AND $3::date OR new_date BETWEEN $2::date AND $3::date)`,
  [classIds, from, to]
)).rows : []);

/** Sessions of the groups with the Tashkent time their first score was saved. */
const findGradedSessions = async (classIds: number[], from: string, to: string) => (classIds.length ? (await pool.query(
  `SELECT ses.class_id, ses.session_date::text AS session_date,
          to_char(MIN(g.created_at) AT TIME ZONE '${GRADE_CLOCK_TIME_ZONE}' AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD HH24:MI') AS first_graded
   FROM sessions ses JOIN grades g ON g.session_id = ses.session_id
   WHERE ses.deleted_at IS NULL AND ses.class_id = ANY($1::int[]) AND ses.session_date BETWEEN $2::date AND $3::date
   GROUP BY ses.class_id, ses.session_date`,
  [classIds, from, to]
)).rows : []);

const insertDayOff = async (row: { centerId: number; offDate: string; classId: number | null; note: string | null; createdByName: string | null }) => (await pool.query(
  `INSERT INTO lesson_days_off (center_id, off_date, class_id, note, created_by_name) VALUES ($1, $2::date, $3, $4, $5)
   ON CONFLICT DO NOTHING RETURNING day_off_id`,
  [row.centerId, row.offDate, row.classId, row.note, row.createdByName]
)).rows[0] || null;

const deleteDayOff = async (dayOffId: number, centerId?: number) => (await pool.query(
  'DELETE FROM lesson_days_off WHERE day_off_id = $1 AND ($2::int IS NULL OR center_id = $2)',
  [dayOffId, centerId ?? null]
)).rowCount > 0;

const findClassForTeacher = async (classId: number, teacherId: number) => (await pool.query(
  'SELECT class_id, center_id FROM classes WHERE class_id = $1 AND teacher_id = $2 AND deleted_at IS NULL',
  [classId, teacherId]
)).rows[0] || null;

const findClassInCenter = async (classId: number, centerId?: number) => (await pool.query(
  'SELECT class_id, center_id FROM classes WHERE class_id = $1 AND deleted_at IS NULL AND ($2::int IS NULL OR center_id = $2)',
  [classId, centerId ?? null]
)).rows[0] || null;

const insertReschedule = async (row: { centerId: number; classId: number; teacherId: number; originalDate: string; newDate: string; newTime: string | null; reason: string | null }) => (await pool.query(
  `INSERT INTO lesson_reschedules (center_id, class_id, teacher_id, original_date, new_date, new_time, reason)
   VALUES ($1, $2, $3, $4::date, $5::date, $6::time, $7) RETURNING reschedule_id`,
  [row.centerId, row.classId, row.teacherId, row.originalDate, row.newDate, row.newTime, row.reason]
)).rows[0];

const findReschedules = async ({ centerId, teacherId }: { centerId?: number; teacherId?: number }) => (await pool.query(
  `SELECT r.reschedule_id, r.class_id, c.class_name, r.teacher_id,
          NULLIF(trim(concat_ws(' ', t.last_name, t.first_name)), '') AS teacher_name,
          r.original_date::text AS original_date, r.new_date::text AS new_date, to_char(r.new_time, 'HH24:MI') AS new_time,
          r.reason, r.status, r.decided_by_name, r.created_at
   FROM lesson_reschedules r
   JOIN classes c ON c.class_id = r.class_id
   LEFT JOIN teachers t ON t.teacher_id = r.teacher_id
   WHERE ($1::int IS NULL OR r.center_id = $1) AND ($2::int IS NULL OR r.teacher_id = $2)
     AND (r.status = 'pending' OR r.created_at > CURRENT_TIMESTAMP - interval '60 days')
   ORDER BY (r.status = 'pending') DESC, r.created_at DESC`,
  [centerId ?? null, teacherId ?? null]
)).rows;

const decideReschedule = async (rescheduleId: number, status: string, decidedByName: string | null, centerId?: number) => (await pool.query(
  `UPDATE lesson_reschedules SET status = $2, decided_by_name = $3, decided_at = CURRENT_TIMESTAMP
   WHERE reschedule_id = $1 AND status = 'pending' AND ($4::int IS NULL OR center_id = $4)`,
  [rescheduleId, status, decidedByName, centerId ?? null]
)).rowCount > 0;

module.exports = {
  findClasses, findDaysOff, findApprovedMoves, findGradedSessions, insertDayOff, deleteDayOff,
  findClassForTeacher, findClassInCenter, insertReschedule, findReschedules, decideReschedule,
};
export {};
