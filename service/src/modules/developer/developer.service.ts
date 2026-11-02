// The developer page: find any account, lock or unlock it, lock everyone at once, and look after
// owner accounts (unlock after wrong passwords, reset a password).
const pool = require('../../db/pool');
const { hashPassword } = require('../../shared/password');
const accessLock = require('./accessLock');
import type { LockUserType } from './accessLock';

// One query shape per account kind: id, display name, username, center and status.
const ACCOUNT_SOURCES: Record<LockUserType, string> = {
  owner: `SELECT owner_id AS user_id, first_name, last_name, username, NULL::int AS center_id, status
            FROM owners WHERE COALESCE(is_developer, FALSE) = FALSE`,
  superuser: `SELECT superuser_id AS user_id, first_name, last_name, username, center_id, status FROM superusers`,
  teacher: `SELECT teacher_id AS user_id, first_name, last_name, username, center_id, status
              FROM teachers WHERE deleted_at IS NULL`,
  student: `SELECT student_id AS user_id, first_name, last_name, username, center_id, status
              FROM students WHERE deleted_at IS NULL`,
  parent: `SELECT parent_id AS user_id, first_name, last_name, username, center_id, status FROM parents`,
};

const isLockType = (value: unknown): value is LockUserType => accessLock.LOCK_USER_TYPES.includes(value);

const searchAccounts = async (type: LockUserType, query: string) => {
  const like = `%${query.trim()}%`;
  const { rows } = await pool.query(
    `SELECT a.*, $1::text AS user_type, l.reason AS lock_reason, l.locked_at, (l.user_id IS NOT NULL) AS locked
       FROM (${ACCOUNT_SOURCES[type]}) a
       LEFT JOIN developer_locks l ON l.user_type = $1 AND l.user_id = a.user_id
      WHERE $2 = '%%' OR concat_ws(' ', a.first_name, a.last_name, a.username) ILIKE $2
      ORDER BY (l.user_id IS NOT NULL) DESC, a.first_name, a.last_name
      LIMIT 50`,
    [type, like]
  );
  return rows;
};

// Every lock with the account it is on, newest first ('all' is the lock on everyone).
const listLocks = async () => {
  const { rows } = await pool.query(
    `SELECT l.user_type, l.user_id, l.reason, l.locked_at, a.first_name, a.last_name, a.username
       FROM developer_locks l
       LEFT JOIN LATERAL (
         SELECT first_name, last_name, username FROM owners WHERE l.user_type = 'owner' AND owner_id = l.user_id
         UNION ALL SELECT first_name, last_name, username FROM superusers WHERE l.user_type = 'superuser' AND superuser_id = l.user_id
         UNION ALL SELECT first_name, last_name, username FROM teachers WHERE l.user_type = 'teacher' AND teacher_id = l.user_id
         UNION ALL SELECT first_name, last_name, username FROM students WHERE l.user_type = 'student' AND student_id = l.user_id
         UNION ALL SELECT first_name, last_name, username FROM parents WHERE l.user_type = 'parent' AND parent_id = l.user_id
         LIMIT 1
       ) a ON TRUE
      WHERE l.user_type <> 'all'
      ORDER BY l.locked_at DESC`
  );
  return rows;
};

// A student is one person across their group records; a lock covers all of them.
const studentRecordIds = async (studentId: number) => {
  const { rows } = await pool.query(
    `SELECT s.student_id FROM students s
       JOIN students me ON me.student_id = $1
      WHERE COALESCE(s.main_student_id, s.student_id) = COALESCE(me.main_student_id, me.student_id)`,
    [studentId]
  );
  return rows.length ? rows.map((row: any) => Number(row.student_id)) : [studentId];
};

const targetIds = (type: LockUserType, userId: number) => (type === 'student' ? studentRecordIds(userId) : Promise.resolve([userId]));

const lockAccount = async (type: LockUserType, userId: number, reason: string | null, developerId: number) => {
  const exists = await pool.query(`SELECT 1 FROM (${ACCOUNT_SOURCES[type]}) a WHERE a.user_id = $1`, [userId]);
  // Developer accounts are not in the owner source, so they can never be locked.
  if (!exists.rowCount) return { error: 'not_found' as const };
  const ids = await targetIds(type, userId);
  await pool.query(
    `INSERT INTO developer_locks (user_type, user_id, reason, locked_by)
     SELECT $1, id, $3, $4 FROM unnest($2::int[]) AS id
     ON CONFLICT (user_type, user_id) DO UPDATE SET reason = EXCLUDED.reason`,
    [type, ids, reason, developerId]
  );
  accessLock.clearCache();
  return { ok: true as const, locked_ids: ids };
};

const unlockAccount = async (type: LockUserType, userId: number) => {
  const ids = await targetIds(type, userId);
  const { rowCount } = await pool.query('DELETE FROM developer_locks WHERE user_type = $1 AND user_id = ANY($2::int[])', [type, ids]);
  accessLock.clearCache();
  return { ok: true as const, unlocked: rowCount };
};

const getLockdown = async () => {
  const { rows } = await pool.query(`SELECT reason, locked_at FROM developer_locks WHERE user_type = 'all' AND user_id = 0`);
  return rows[0] ? { enabled: true, reason: rows[0].reason, locked_at: rows[0].locked_at } : { enabled: false, reason: null, locked_at: null };
};

const setLockdown = async (enabled: boolean, reason: string | null, developerId: number) => {
  if (enabled) {
    await pool.query(
      `INSERT INTO developer_locks (user_type, user_id, reason, locked_by) VALUES ('all', 0, $1, $2)
       ON CONFLICT (user_type, user_id) DO UPDATE SET reason = EXCLUDED.reason`,
      [reason, developerId]
    );
  } else {
    await pool.query(`DELETE FROM developer_locks WHERE user_type = 'all' AND user_id = 0`);
  }
  accessLock.clearCache();
  return getLockdown();
};

// Owner accounts with their password lockout, for unlocking and password resets.
const listOwners = async () => {
  const { rows } = await pool.query(
    `SELECT owner_id, username, first_name, last_name, email, status, COALESCE(is_locked, FALSE) AS is_locked,
            COALESCE(login_attempts, 0) AS login_attempts, last_login, COALESCE(is_developer, FALSE) AS is_developer
       FROM owners ORDER BY owner_id`
  );
  return rows;
};

const unlockOwnerPassword = async (ownerId: number) => {
  const { rowCount } = await pool.query(
    'UPDATE owners SET is_locked = FALSE, login_attempts = 0, locked_at = NULL WHERE owner_id = $1',
    [ownerId]
  );
  return rowCount > 0;
};

const resetOwnerPassword = async (ownerId: number, password: string) => {
  const { rowCount } = await pool.query(
    `UPDATE owners SET password_hash = $2, is_locked = FALSE, login_attempts = 0, locked_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE owner_id = $1`,
    [ownerId, hashPassword(password)]
  );
  return rowCount > 0;
};

module.exports = {
  isLockType,
  searchAccounts,
  listLocks,
  lockAccount,
  unlockAccount,
  getLockdown,
  setLockdown,
  listOwners,
  unlockOwnerPassword,
  resetOwnerPassword,
};
