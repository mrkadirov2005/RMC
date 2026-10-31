// Plain SQL: the watchers read across several existing tables and the outbox is append-heavy.
const pool = require('../../../db/pool');

const query = (text: string, params: any[] = []) => pool.query(text, params).then((r: any) => r.rows);

// @MOB-041 Adds a message unless the same event was already queued for that user.
const enqueue = async (n: { userType: string; userId: number; category: string; title: string; body: string; data?: any; dedupeKey: string }) => {
  const rows = await query(
    `INSERT INTO mobile_notification_outbox (user_type, user_id, category, title, body, data, dedupe_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (dedupe_key) DO NOTHING
     RETURNING outbox_id`,
    [n.userType, n.userId, n.category, n.title, n.body, n.data ? JSON.stringify(n.data) : null, n.dedupeKey],
  );
  return rows[0]?.outbox_id ?? null;
};

const isCategoryEnabled = async (userType: string, userId: number, category: string) => {
  const rows = await query(
    'SELECT enabled FROM mobile_notification_prefs WHERE user_type = $1 AND user_id = $2 AND category = $3',
    [userType, userId, category],
  );
  return rows.length === 0 ? true : Boolean(rows[0].enabled);
};

const listPrefs = (userType: string, userId: number) =>
  query('SELECT category, enabled FROM mobile_notification_prefs WHERE user_type = $1 AND user_id = $2', [userType, userId]);

const setPref = (userType: string, userId: number, category: string, enabled: boolean) =>
  query(
    `INSERT INTO mobile_notification_prefs (user_type, user_id, category, enabled) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_type, user_id, category) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = CURRENT_TIMESTAMP`,
    [userType, userId, category, enabled],
  );

// @MOB-043 The user's inbox, newest first.
const listInbox = async (userType: string, userId: number, limit: number, offset: number) => {
  const [rows, count] = await Promise.all([
    query(
      `SELECT outbox_id AS notification_id, category, title, body, data, created_at, read_at
       FROM mobile_notification_outbox WHERE user_type = $1 AND user_id = $2
       ORDER BY outbox_id DESC LIMIT $3 OFFSET $4`,
      [userType, userId, limit, offset],
    ),
    query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE read_at IS NULL)::int AS unread
       FROM mobile_notification_outbox WHERE user_type = $1 AND user_id = $2`,
      [userType, userId],
    ),
  ]);
  return { rows, total: count[0]?.total ?? 0, unread: count[0]?.unread ?? 0 };
};

const markRead = (userType: string, userId: number, notificationId?: number) =>
  notificationId
    ? query(
        'UPDATE mobile_notification_outbox SET read_at = CURRENT_TIMESTAMP WHERE user_type = $1 AND user_id = $2 AND outbox_id = $3 AND read_at IS NULL',
        [userType, userId, notificationId],
      )
    : query('UPDATE mobile_notification_outbox SET read_at = CURRENT_TIMESTAMP WHERE user_type = $1 AND user_id = $2 AND read_at IS NULL', [userType, userId]);

// @MOB-040 The push token of the device that made the request.
const setPushToken = (sessionId: number, userType: string, userId: number, token: string | null) =>
  query(
    `UPDATE mobile_sessions SET push_token = $4, push_token_updated_at = CURRENT_TIMESTAMP
     WHERE session_id = $1 AND user_type = $2 AND user_id = $3 AND revoked_at IS NULL
     RETURNING session_id`,
    [sessionId, userType, userId, token],
  );

const pushTokensFor = (userType: string, userId: number) =>
  query(
    `SELECT session_id, push_token FROM mobile_sessions
     WHERE user_type = $1 AND user_id = $2 AND revoked_at IS NULL AND push_token IS NOT NULL`,
    [userType, userId],
  );

// A token Expo reports as no longer registered (app removed) is dropped from every session.
const clearPushToken = (token: string) => query('UPDATE mobile_sessions SET push_token = NULL WHERE push_token = $1', [token]);

const dueMessages = (limit: number) =>
  query(
    `SELECT outbox_id, user_type, user_id, category, title, body, data, attempts
     FROM mobile_notification_outbox WHERE status = 'pending' AND next_attempt_at <= CURRENT_TIMESTAMP
     ORDER BY outbox_id LIMIT $1`,
    [limit],
  );

const markDelivered = (outboxId: number, status: 'sent' | 'no_device') =>
  query('UPDATE mobile_notification_outbox SET status = $2, sent_at = CURRENT_TIMESTAMP, attempts = attempts + 1 WHERE outbox_id = $1', [outboxId, status]);

const markRetry = (outboxId: number, error: string, delaySeconds: number, giveUp: boolean) =>
  query(
    `UPDATE mobile_notification_outbox
     SET attempts = attempts + 1, last_error = $2, status = CASE WHEN $4 THEN 'failed' ELSE status END,
         next_attempt_at = CURRENT_TIMESTAMP + ($3 || ' seconds')::interval
     WHERE outbox_id = $1`,
    [outboxId, error.slice(0, 500), String(delaySeconds), giveUp],
  );

// @MOB-042 Watcher checkpoints. On first run a watcher starts at the newest row, so turning the
// feature on never pushes old history.
const getCheckpoint = async (name: string) => {
  const rows = await query('SELECT last_id FROM mobile_event_checkpoints WHERE name = $1', [name]);
  return rows[0] ? Number(rows[0].last_id) : null;
};

const setCheckpoint = (name: string, lastId: number) =>
  query(
    `INSERT INTO mobile_event_checkpoints (name, last_id) VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET last_id = EXCLUDED.last_id, updated_at = CURRENT_TIMESTAMP`,
    [name, lastId],
  );

const maxId = async (table: string, column: string) => {
  const rows = await query(`SELECT COALESCE(MAX(${column}), 0)::int AS max FROM ${table}`);
  return Number(rows[0]?.max || 0);
};

// New rows since a checkpoint, with the student's name and their main (login) record.
const SOURCES: Record<string, string> = {
  attendance: `SELECT a.attendance_id AS id, a.student_id, a.status, NULL::numeric AS value, NULL::text AS reason, c.class_name,
                      s.first_name, COALESCE(s.main_student_id, s.student_id) AS main_id
               FROM attendance a JOIN students s ON s.student_id = a.student_id LEFT JOIN classes c ON c.class_id = a.class_id
               WHERE a.attendance_id > $1 ORDER BY a.attendance_id LIMIT $2`,
  grades: `SELECT g.grade_id AS id, g.student_id, NULL::text AS status, g.percentage AS value, NULL::text AS reason, c.class_name,
                  s.first_name, COALESCE(s.main_student_id, s.student_id) AS main_id
           FROM grades g JOIN students s ON s.student_id = g.student_id LEFT JOIN classes c ON c.class_id = g.class_id
           WHERE g.grade_id > $1 ORDER BY g.grade_id LIMIT $2`,
  coins: `SELECT t.transaction_id AS id, t.student_id, NULL::text AS status, t.delta AS value, t.reason, NULL::text AS class_name,
                 s.first_name, COALESCE(s.main_student_id, s.student_id) AS main_id
          FROM student_coin_transactions t JOIN students s ON s.student_id = t.student_id
          WHERE t.transaction_id > $1 ORDER BY t.transaction_id LIMIT $2`,
  payments: `SELECT p.payment_id AS id, p.student_id, p.payment_status AS status, COALESCE(p.final_amount, p.amount) AS value, NULL::text AS reason,
                    NULL::text AS class_name, s.first_name, COALESCE(s.main_student_id, s.student_id) AS main_id
             FROM payments p JOIN students s ON s.student_id = p.student_id
             WHERE p.payment_id > $1 AND p.deleted_at IS NULL ORDER BY p.payment_id LIMIT $2`,
};

const SOURCE_KEYS: Record<string, [string, string]> = {
  attendance: ['attendance', 'attendance_id'],
  grades: ['grades', 'grade_id'],
  coins: ['student_coin_transactions', 'transaction_id'],
  payments: ['payments', 'payment_id'],
};

const newEvents = (source: string, afterId: number, limit: number) => query(SOURCES[source], [afterId, limit]);
const sourceMaxId = (source: string) => maxId(...SOURCE_KEYS[source]);

// Parents linked to a group record or to the child's main record.
const parentsOf = async (studentIds: number[]) =>
  (await query('SELECT DISTINCT parent_id FROM parent_students WHERE student_id = ANY($1::int[])', [studentIds])).map((r: any) => Number(r.parent_id));

module.exports = {
  enqueue,
  isCategoryEnabled,
  listPrefs,
  setPref,
  listInbox,
  markRead,
  setPushToken,
  pushTokensFor,
  clearPushToken,
  dueMessages,
  markDelivered,
  markRetry,
  getCheckpoint,
  setCheckpoint,
  newEvents,
  sourceMaxId,
  parentsOf,
};

export {};
