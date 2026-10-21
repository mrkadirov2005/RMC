const pool = require('../../../db/pool');

export type SmsRow = {
  centerId: number | null;
  studentId: number | null;
  classId?: number | null;
  kind: string;
  phone: string;
  text: string;
  dedupeKey?: string | null;
  expiresAt?: Date | null;
  createdById?: number | null;
  createdByType?: string | null;
  senderName?: string | null;
};

const COLUMNS = ['center_id', 'student_id', 'class_id', 'kind', 'phone', 'text', 'dedupe_key', 'expires_at', 'created_by_id', 'created_by_type', 'sender_name'];

/**
 * Queues messages. One already queued under the same dedupe key is left as it is; the result
 * lists the dedupe keys actually added (null for a message without one).
 */
const enqueue = async (rows: SmsRow[]): Promise<Array<string | null>> => {
  if (rows.length === 0) return [];
  const values: any[] = [];
  const tuples = rows.map((row) => {
    values.push(
      row.centerId, row.studentId, row.classId ?? null, row.kind, row.phone, row.text, row.dedupeKey ?? null,
      row.expiresAt ?? null, row.createdById ?? null, row.createdByType ?? null, row.senderName ?? null
    );
    const base = values.length - COLUMNS.length;
    return `(${COLUMNS.map((_, i) => `$${base + i + 1}`).join(', ')})`;
  });
  const result = await pool.query(
    `INSERT INTO sms_outbox (${COLUMNS.join(', ')}) VALUES ${tuples.join(', ')}
     ON CONFLICT (dedupe_key) DO NOTHING RETURNING dedupe_key`,
    values
  );
  return result.rows.map((row: any) => row.dedupe_key ?? null);
};

/** Missed-lesson SMS of the last months, so the warnings page can show who was already texted. */
const findAttendanceSent = async (centerId?: number) => {
  const result = await pool.query(
    `SELECT dedupe_key, created_at FROM sms_outbox
     WHERE kind = 'attendance' AND dedupe_key IS NOT NULL AND created_at > CURRENT_TIMESTAMP - INTERVAL '120 days'
       AND ($1::int IS NULL OR center_id = $1)`,
    [centerId ?? null]
  );
  return result.rows;
};

// ---------------------------------------------------------------------------------------------
// Read-only lookups of other modules' tables, kept here so SMS never calls into those modules.
// ---------------------------------------------------------------------------------------------

/**
 * What each chosen student record paid in the period and what was expected, worked out the same
 * way as the To'lovlar page (group fee x months, less discounts used and the active serial discount).
 */
const findPaymentFigures = async ({ studentIds, centerId, from, to, months }: {
  studentIds: number[];
  centerId?: number;
  from: string;
  to: string;
  months: number;
}) => {
  if (studentIds.length === 0) return [];
  const result = await pool.query(
    `WITH base AS (
       SELECT s.student_id, s.center_id, ec.center_name, s.first_name, s.last_name, s.phone, s.parent_phone,
              s.class_id, c.class_name,
              COALESCE(c.payment_amount, 0)::numeric AS monthly_fee,
              COALESCE(p.paid, 0)::numeric AS paid_amount,
              COALESCE(p.discounts, 0)::numeric AS discount_applied,
              COALESCE(p.paid_months, 0)::int AS paid_months,
              CASE
                WHEN sd.discount_type = 'percent' THEN LEAST(COALESCE(c.payment_amount, 0), COALESCE(c.payment_amount, 0) * LEAST(GREATEST(sd.value, 0), 100) / 100)
                WHEN sd.value IS NOT NULL THEN LEAST(COALESCE(c.payment_amount, 0), GREATEST(sd.value, 0))
                ELSE 0
              END::numeric AS serial_discount_per_month
       FROM students s
       LEFT JOIN classes c ON c.class_id = s.class_id
       LEFT JOIN edu_centers ec ON ec.center_id = s.center_id
       LEFT JOIN LATERAL (
         SELECT SUM(pay.amount) AS paid, SUM(COALESCE(pay.discount_amount, 0)) AS discounts,
                COUNT(DISTINCT date_trunc('month', pay.payment_date)) AS paid_months
         FROM payments pay
         WHERE pay.student_id = s.student_id AND pay.deleted_at IS NULL
           AND LOWER(COALESCE(pay.payment_status::text, '')) IN ('completed', 'paid')
           AND pay.payment_date >= $1::date AND pay.payment_date <= $2::date
       ) p ON true
       LEFT JOIN LATERAL (
         SELECT d.discount_type, d.value::numeric AS value
         FROM discounts d
         WHERE d.student_id = s.student_id AND d.active = TRUE AND d.discount_kind = 'serial_discount'
           AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
           AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)
         ORDER BY d.created_at DESC
         LIMIT 1
       ) sd ON true
       WHERE s.student_id = ANY($4::int[]) AND s.deleted_at IS NULL
         AND LOWER(COALESCE(s.status::text, 'Active')) = 'active'
         AND ($5::int IS NULL OR s.center_id = $5)
     )
     SELECT student_id, center_id, center_name, first_name, last_name, phone, parent_phone, class_id, class_name,
            paid_amount,
            GREATEST(monthly_fee * $3::int - discount_applied - serial_discount_per_month * GREATEST($3::int - paid_months, 0), 0) AS expected
     FROM base`,
    [from, to, months, studentIds, centerId ?? null]
  );
  return result.rows.map((row: any) => ({ ...row, paid_amount: Number(row.paid_amount || 0), expected: Number(row.expected || 0) }));
};

/**
 * For missed-lesson SMS: attendance of the last 120 days in the chosen groups (a teacher only in
 * their own groups), when admins last dealt with each student's absences, and the students.
 */
const findAttendanceFacts = async ({ studentIds, classIds, centerId, teacherId }: {
  studentIds: number[];
  classIds: number[];
  centerId?: number;
  teacherId?: number;
}) => {
  if (studentIds.length === 0 || classIds.length === 0) return { records: [], resolutions: [], students: [] };
  const [records, resolutions, students] = await Promise.all([
    pool.query(
      `SELECT a.student_id, a.class_id, a.attendance_date::text AS attendance_date, a.status::text AS status
       FROM attendance a
       JOIN classes c ON c.class_id = a.class_id AND c.deleted_at IS NULL
       WHERE a.class_id = ANY($1::int[]) AND a.attendance_date >= CURRENT_DATE - 120
         AND ($2::int IS NULL OR c.center_id = $2)
         AND ($3::int IS NULL OR c.teacher_id = $3)`,
      [classIds, centerId ?? null, teacherId ?? null]
    ),
    pool.query(
      `SELECT student_id, class_id, resolved_through::text AS resolved_through
       FROM absence_alert_resolutions WHERE student_id = ANY($1::int[])`,
      [studentIds]
    ),
    pool.query(
      `SELECT s.student_id, s.first_name, s.last_name, s.phone, s.parent_phone, s.class_id, s.center_id,
              ec.center_name, c.class_name, s.status::text AS status, COALESCE(s.is_frozen, false) AS is_frozen
       FROM students s
       LEFT JOIN classes c ON c.class_id = s.class_id
       LEFT JOIN edu_centers ec ON ec.center_id = s.center_id
       WHERE s.student_id = ANY($1::int[]) AND s.deleted_at IS NULL`,
      [studentIds]
    ),
  ]);
  return { records: records.rows, resolutions: resolutions.rows, students: students.rows };
};

/** The name shown as who sent an SMS: the teacher, the admin or the owner. */
const findSenderName = async (user: any) => {
  const id = Number(user?.id);
  if (!id) return null;
  const table = user.userType === 'teacher' ? 'teachers' : String(user.role || '').toLowerCase() === 'owner' ? 'owners' : 'superusers';
  const idColumn = table === 'teachers' ? 'teacher_id' : table === 'owners' ? 'owner_id' : 'superuser_id';
  const result = await pool.query(
    `SELECT NULLIF(trim(concat_ws(' ', first_name, last_name)), '') AS name FROM ${table} WHERE ${idColumn} = $1`,
    [id]
  ).catch(() => ({ rows: [] }));
  return result.rows[0]?.name || null;
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

export type SmsFilters = {
  centerId?: number;
  from?: string;
  to?: string;
  kinds?: string[];
  status?: string;
  senderType?: string;
  q?: string;
  limit: number;
  offset: number;
};

/** The owner's SMS page: every message, newest first, with the student, group and center. */
const findMessages = async (filters: SmsFilters) => {
  const params: any[] = [];
  const add = (value: any) => { params.push(value); return `$${params.length}`; };
  const where: string[] = [];
  if (filters.centerId) where.push(`o.center_id = ${add(filters.centerId)}`);
  if (filters.from) where.push(`o.created_at >= ${add(filters.from)}::date`);
  if (filters.to) where.push(`o.created_at < ${add(filters.to)}::date + 1`);
  if (filters.kinds?.length) where.push(`o.kind = ANY(${add(filters.kinds)}::text[])`);
  if (filters.status) where.push(`o.status = ${add(filters.status)}`);
  if (filters.senderType) where.push(`o.created_by_type = ${add(filters.senderType)}`);
  if (filters.q) {
    const term = add(`%${filters.q}%`);
    const digits = String(filters.q).replace(/\D/g, '');
    where.push(`(CONCAT_WS(' ', s.last_name, s.first_name) ILIKE ${term} OR CONCAT_WS(' ', s.first_name, s.last_name) ILIKE ${term}
      OR o.sender_name ILIKE ${term}${digits ? ` OR regexp_replace(o.phone, '\\D', '', 'g') LIKE ${add(`%${digits}%`)}` : ''})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = add(filters.limit);
  const offset = add(filters.offset);
  const result = await pool.query(
    `WITH matched AS (
       SELECT o.sms_id, o.kind, o.phone, o.text, o.status, o.error, o.created_at, o.sent_at, o.updated_at,
              o.center_id, ec.center_name, o.class_id, c.class_name, o.created_by_type, o.sender_name,
              NULLIF(trim(concat_ws(' ', s.last_name, s.first_name)), '') AS student_name, o.student_id
       FROM sms_outbox o
       LEFT JOIN students s ON s.student_id = o.student_id
       LEFT JOIN classes c ON c.class_id = o.class_id
       LEFT JOIN edu_centers ec ON ec.center_id = o.center_id
       ${whereSql}
     )
     SELECT (SELECT COUNT(*)::int FROM matched) AS total,
            (SELECT json_object_agg(status, n) FROM (SELECT status, COUNT(*)::int AS n FROM matched GROUP BY status) counts) AS by_status,
            COALESCE((SELECT json_agg(page) FROM (SELECT * FROM matched ORDER BY sms_id DESC LIMIT ${limit} OFFSET ${offset}) page), '[]'::json) AS rows`,
    params
  );
  return result.rows[0] || { total: 0, by_status: null, rows: [] };
};

const countQueued = async () => {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM sms_outbox WHERE status IN ('queued', 'sending')`);
  return Number(result.rows[0]?.count || 0);
};

module.exports = {
  enqueue,
  findAttendanceSent,
  findPaymentFigures,
  findAttendanceFacts,
  findSenderName,
  countSentToday,
  claimDue,
  markSent,
  markRetry,
  markFailed,
  findAwaitingReport,
  setStatus,
  findMessages,
  countQueued,
};
