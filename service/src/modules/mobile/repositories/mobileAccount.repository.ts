const pool = require('../../../db/pool');

const query = (text: string, params: any[] = []) => pool.query(text, params).then((r: any) => r.rows);
const one = (text: string, params: any[] = []) => query(text, params).then((rows: any[]) => rows[0] || null);

const LAST9 = (column: string) => `RIGHT(regexp_replace(COALESCE(${column}, ''), '\\D', '', 'g'), 9)`;

// @MOB-024 Accounts that sign in with this username, with the phone a reset code goes to: the
// student's own phone, else the saved parent phone; a parent's own phone.
const findStudentForReset = (username: string) =>
  one(
    `SELECT student_id AS user_id, status, COALESCE(NULLIF(phone, ''), parent_phone) AS phone
     FROM students
     WHERE username = $1 AND deleted_at IS NULL AND status <> 'Transferred'
     ORDER BY student_id LIMIT 1`,
    [username],
  );

const findParentForReset = (username: string) =>
  one(`SELECT parent_id AS user_id, status, phone FROM parents WHERE username = $1 LIMIT 1`, [username]);

const countRecentResets = (userType: string, userId: number, sinceMinutes: number) =>
  one(
    `SELECT COUNT(*)::int AS count FROM mobile_password_resets
     WHERE user_type = $1 AND user_id = $2 AND created_at > CURRENT_TIMESTAMP - make_interval(mins => $3)`,
    [userType, userId, sinceMinutes],
  ).then((row: any) => Number(row?.count || 0));

const insertReset = (reset: { userType: string; userId: number; phone: string; codeHash: string; ttlMinutes: number }) =>
  one(
    `INSERT INTO mobile_password_resets (user_type, user_id, phone, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + make_interval(mins => $5))
     RETURNING reset_id`,
    [reset.userType, reset.userId, reset.phone, reset.codeHash, reset.ttlMinutes],
  );

// Only the newest code counts: asking again makes earlier codes useless.
const latestOpenReset = (userType: string, userId: number) =>
  one(
    `SELECT reset_id, code_hash, attempts, expires_at <= CURRENT_TIMESTAMP AS expired
     FROM mobile_password_resets
     WHERE user_type = $1 AND user_id = $2 AND used_at IS NULL
     ORDER BY created_at DESC, reset_id DESC LIMIT 1`,
    [userType, userId],
  );

const addAttempt = (resetId: number) =>
  query(`UPDATE mobile_password_resets SET attempts = attempts + 1 WHERE reset_id = $1`, [resetId]);

// Marks the code used; false when another request already used it.
const useReset = (resetId: number) =>
  query(`UPDATE mobile_password_resets SET used_at = CURRENT_TIMESTAMP WHERE reset_id = $1 AND used_at IS NULL RETURNING reset_id`, [resetId]).then(
    (rows: any[]) => rows.length > 0,
  );

// A new password signs every device out.
const revokeAllSessions = async (userType: string, userId: number) => {
  await query(
    `UPDATE mobile_refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
     WHERE revoked_at IS NULL AND session_id IN (SELECT session_id FROM mobile_sessions WHERE user_type = $1 AND user_id = $2)`,
    [userType, userId],
  );
  await query(
    `UPDATE mobile_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_type = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [userType, userId],
  );
};

// @MOB-032 Children matching what a parent typed: the child's own phone or their login, as in the bot.
const findChildrenByQuery = (byPhone: boolean, value: string) =>
  query(
    `SELECT s.student_id, s.center_id FROM students s
     WHERE s.deleted_at IS NULL AND s.status = 'Active' AND s.main_student_id IS NULL
       AND ${byPhone ? `${LAST9('s.phone')} = $1` : 'LOWER(s.username) = LOWER($1)'}`,
    [value],
  );

const parentById = (parentId: number) =>
  one(`SELECT parent_id, first_name, last_name, phone FROM parents WHERE parent_id = $1`, [parentId]);

const isLinked = (parentId: number, studentId: number) =>
  one(`SELECT 1 AS linked FROM parent_students WHERE parent_id = $1 AND student_id = $2`, [parentId, studentId]).then(Boolean);

const countOpenRequests = (parentId: number) =>
  one(`SELECT COUNT(*)::int AS count FROM parent_link_requests WHERE requested_by_parent_id = $1 AND status = 'Pending'`, [parentId]).then(
    (row: any) => Number(row?.count || 0),
  );

// Null when this parent already has a pending request for the child.
const insertLinkRequest = (request: { centerId: number | null; studentId: number; parentId: number; parentName: string | null; parentPhone: string | null; childQuery: string }) =>
  one(
    `INSERT INTO parent_link_requests (center_id, student_id, parent_name, parent_phone, child_query, source, requested_by_parent_id)
     VALUES ($1, $2, $3, $4, $5, 'app', $6)
     ON CONFLICT (requested_by_parent_id, student_id) WHERE status = 'Pending' AND requested_by_parent_id IS NOT NULL DO NOTHING
     RETURNING request_id`,
    [request.centerId, request.studentId, request.parentName, request.parentPhone, request.childQuery, request.parentId],
  );

// A parent sees their requests without the child's details until an admin approves.
const listLinkRequests = (parentId: number) =>
  query(
    `SELECT request_id, child_query, status, created_at, decided_at FROM parent_link_requests
     WHERE requested_by_parent_id = $1 ORDER BY created_at DESC, request_id DESC LIMIT 20`,
    [parentId],
  );

// @MOB-125 What staff see after scanning a valid ID.
const studentCard = (studentId: number) =>
  one(
    `SELECT s.student_id, s.first_name, s.last_name, s.status, s.center_id, s.is_frozen,
            COALESCE((SELECT array_agg(c.class_name ORDER BY c.class_name) FROM students g
                      JOIN classes c ON c.class_id = g.class_id
                      WHERE (g.student_id = s.student_id OR g.main_student_id = s.student_id) AND g.deleted_at IS NULL), '{}') AS groups
     FROM students s WHERE s.student_id = $1 AND s.deleted_at IS NULL`,
    [studentId],
  );

// @MOB-166 App adoption, for the owner.
const adoption = () =>
  one(
    `SELECT
       (SELECT COUNT(*)::int FROM parents) AS parents_total,
       (SELECT COUNT(DISTINCT user_id)::int FROM mobile_sessions WHERE user_type = 'parent') AS parents_signed_in,
       (SELECT COUNT(*)::int FROM students WHERE deleted_at IS NULL AND status = 'Active' AND main_student_id IS NULL) AS students_total,
       (SELECT COUNT(DISTINCT user_id)::int FROM mobile_sessions WHERE user_type = 'student') AS students_signed_in,
       (SELECT COUNT(DISTINCT user_id)::int FROM mobile_sessions
          WHERE user_type = 'student' AND last_used_at > CURRENT_TIMESTAMP - INTERVAL '7 days') AS students_weekly_active,
       (SELECT COUNT(DISTINCT user_id)::int FROM mobile_sessions
          WHERE user_type = 'parent' AND last_used_at > CURRENT_TIMESTAMP - INTERVAL '7 days') AS parents_weekly_active,
       (SELECT COUNT(*)::int FROM hw_submissions WHERE submitted_at > CURRENT_TIMESTAMP - INTERVAL '7 days') AS homework_submitted_week,
       (SELECT COUNT(*)::int FROM hw_submissions WHERE submitted_at IS NOT NULL) AS homework_submitted_total,
       (SELECT COUNT(*)::int FROM parent_link_requests WHERE source = 'app' AND status = 'Pending') AS link_requests_pending`,
  );

module.exports = {
  findStudentForReset,
  findParentForReset,
  countRecentResets,
  insertReset,
  latestOpenReset,
  addAttempt,
  useReset,
  revokeAllSessions,
  findChildrenByQuery,
  parentById,
  isLinked,
  countOpenRequests,
  insertLinkRequest,
  listLinkRequests,
  studentCard,
  adoption,
};

export {};
