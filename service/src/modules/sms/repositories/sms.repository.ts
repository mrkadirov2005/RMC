const pool = require('../../../db/pool');

export type SmsRow = {
  centerId: number | null;
  studentId: number | null;
  kind: string;
  phone: string;
  text: string;
  dedupeKey?: string | null;
  expiresAt?: Date | null;
  createdById?: number | null;
  createdByType?: string | null;
};

/** Queues messages; one already queued under the same dedupe key is left as it is. */
const enqueue = async (rows: SmsRow[]) => {
  if (rows.length === 0) return 0;
  const values: any[] = [];
  const tuples = rows.map((row) => {
    values.push(row.centerId, row.studentId, row.kind, row.phone, row.text, row.dedupeKey ?? null, row.expiresAt ?? null, row.createdById ?? null, row.createdByType ?? null);
    const base = values.length - 9;
    return `(${Array.from({ length: 9 }, (_, i) => `$${base + i + 1}`).join(', ')})`;
  });
  const result = await pool.query(
    `INSERT INTO sms_outbox (center_id, student_id, kind, phone, text, dedupe_key, expires_at, created_by_id, created_by_type)
     VALUES ${tuples.join(', ')} ON CONFLICT (dedupe_key) DO NOTHING`,
    values
  );
  return result.rowCount || 0;
};

/**
 * Each child's parent contact for SMS: the parent phone on any of the child's records (main first)
 * and whether a parent already follows the child on Telegram.
 */
const findParentContacts = async (mainStudentIds: number[]) => {
  if (mainStudentIds.length === 0) return [];
  const result = await pool.query(
    `SELECT m.student_id AS main_student_id, m.first_name, m.last_name, m.center_id, ec.center_name,
            COALESCE(NULLIF(trim(m.parent_phone), ''),
              (SELECT NULLIF(trim(r.parent_phone), '') FROM students r
                WHERE r.main_student_id = m.student_id AND r.deleted_at IS NULL AND NULLIF(trim(r.parent_phone), '') IS NOT NULL
                ORDER BY r.student_id LIMIT 1)) AS parent_phone,
            EXISTS (SELECT 1 FROM telegram_links l WHERE l.student_id = m.student_id AND l.active AND l.role = 'parent') AS parent_on_telegram
     FROM students m
     LEFT JOIN edu_centers ec ON ec.center_id = m.center_id
     WHERE m.student_id = ANY($1::int[])`,
    [mainStudentIds]
  );
  return result.rows;
};

/** Messages handed to the phone since the start of today in Tashkent (one SIM for all centers). */
const countSentToday = async () => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM sms_outbox
     WHERE sent_at > CURRENT_TIMESTAMP - INTERVAL '2 days'
       AND (sent_at AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'Asia/Tashkent')::date = (now() AT TIME ZONE 'Asia/Tashkent')::date`
  );
  return Number(result.rows[0]?.count || 0);
};

/** Marks overdue messages expired, then claims up to `limit` due ones for sending. */
const claimDue = async (limit: number) => {
  await pool.query(
    `UPDATE sms_outbox SET status = 'expired', updated_at = CURRENT_TIMESTAMP
     WHERE status = 'queued' AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP`
  );
  // Left half-sent by a restart: the phone never got it, so it goes back in the queue.
  await pool.query(
    `UPDATE sms_outbox SET status = 'queued', updated_at = CURRENT_TIMESTAMP
     WHERE status = 'sending' AND updated_at < CURRENT_TIMESTAMP - INTERVAL '10 minutes'`
  );
  if (limit <= 0) return [];
  const result = await pool.query(
    `UPDATE sms_outbox SET status = 'sending', attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
     WHERE sms_id IN (
       SELECT sms_id FROM sms_outbox
       WHERE status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
       ORDER BY sms_id LIMIT $1 FOR UPDATE SKIP LOCKED)
     RETURNING sms_id, phone, text, attempts, expires_at`,
    [limit]
  );
  return result.rows;
};

const markSent = (smsId: number, gatewayId: string | null) =>
  pool.query(
    `UPDATE sms_outbox SET status = 'sent', gateway_id = $2, sent_at = CURRENT_TIMESTAMP, error = NULL, updated_at = CURRENT_TIMESTAMP WHERE sms_id = $1`,
    [smsId, gatewayId]
  );

const markRetry = (smsId: number, error: string, delayMinutes: number) =>
  pool.query(
    `UPDATE sms_outbox SET status = 'queued', error = $2, next_attempt_at = CURRENT_TIMESTAMP + make_interval(mins => $3), updated_at = CURRENT_TIMESTAMP WHERE sms_id = $1`,
    [smsId, error, delayMinutes]
  );

const markFailed = (smsId: number, error: string) =>
  pool.query(`UPDATE sms_outbox SET status = 'failed', error = $2, updated_at = CURRENT_TIMESTAMP WHERE sms_id = $1`, [smsId, error]);

/** Messages the phone has but has not reported delivered or failed yet (last two days). */
const findAwaitingReport = async (limit: number) => {
  const result = await pool.query(
    `SELECT sms_id, gateway_id FROM sms_outbox
     WHERE status = 'sent' AND gateway_id IS NOT NULL AND sent_at > CURRENT_TIMESTAMP - INTERVAL '2 days'
     ORDER BY sent_at LIMIT $1`,
    [limit]
  );
  return result.rows;
};

const setStatus = (smsId: number, status: string, error: string | null) =>
  pool.query(`UPDATE sms_outbox SET status = $2, error = COALESCE($3, error), updated_at = CURRENT_TIMESTAMP WHERE sms_id = $1`, [smsId, status, error]);

/** Recent messages for the settings page, with the student's name. */
const findRecent = async (centerId: number | undefined, limit = 50) => {
  const result = await pool.query(
    `SELECT o.sms_id, o.kind, o.phone, o.text, o.status, o.error, o.created_at, o.sent_at,
            NULLIF(trim(concat_ws(' ', s.last_name, s.first_name)), '') AS student_name
     FROM sms_outbox o LEFT JOIN students s ON s.student_id = o.student_id
     WHERE ($1::int IS NULL OR o.center_id = $1)
     ORDER BY o.sms_id DESC LIMIT $2`,
    [centerId ?? null, limit]
  );
  return result.rows;
};

const countQueued = async () => {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM sms_outbox WHERE status IN ('queued', 'sending')`);
  return Number(result.rows[0]?.count || 0);
};

module.exports = {
  enqueue,
  findParentContacts,
  countSentToday,
  claimDue,
  markSent,
  markRetry,
  markFailed,
  findAwaitingReport,
  setStatus,
  findRecent,
  countQueued,
};
