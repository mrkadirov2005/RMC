const pool = require('../../../db/pool');

const COLUMNS = `lead_id, center_id, stage, full_name, phone, parent_phone, subject, level, preferred_time, note,
  call_back_on::text AS call_back_on, outcome, outcome_note, closed_at, created_by_name, created_at`;

/** Open leads of a stage; the ones to call back soonest (or overdue) first, then the newest. */
const findOpen = async (stage: string, centerId?: number) => {
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM leads
     WHERE stage = $1 AND closed_at IS NULL AND deleted_at IS NULL AND ($2::int IS NULL OR center_id = $2)
     ORDER BY call_back_on ASC NULLS LAST, created_at DESC`,
    [stage, centerId ?? null]
  );
  return result.rows;
};

/** How many open leads are due for a call back by `today`. */
const countDue = async (today: string, centerId?: number) => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS due FROM leads
     WHERE closed_at IS NULL AND deleted_at IS NULL AND call_back_on <= $1::date AND ($2::int IS NULL OR center_id = $2)`,
    [today, centerId ?? null]
  );
  return result.rows[0].due;
};

const insert = async (row: Record<string, unknown>) => {
  const result = await pool.query(
    `INSERT INTO leads (center_id, stage, full_name, phone, parent_phone, subject, level, preferred_time, note, call_back_on, created_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11) RETURNING ${COLUMNS}`,
    [row.centerId, row.stage, row.fullName, row.phone, row.parentPhone, row.subject, row.level, row.preferredTime, row.note, row.callBackOn, row.createdByName]
  );
  return result.rows[0];
};

const update = async (leadId: number, row: Record<string, unknown>, centerId?: number) => {
  const result = await pool.query(
    `UPDATE leads SET stage = $2, full_name = $3, phone = $4, parent_phone = $5, subject = $6, level = $7,
       preferred_time = $8, note = $9, call_back_on = $10::date, updated_at = CURRENT_TIMESTAMP
     WHERE lead_id = $1 AND closed_at IS NULL AND deleted_at IS NULL AND ($11::int IS NULL OR center_id = $11)
     RETURNING ${COLUMNS}`,
    [leadId, row.stage, row.fullName, row.phone, row.parentPhone, row.subject, row.level, row.preferredTime, row.note, row.callBackOn, centerId ?? null]
  );
  return result.rows[0] || null;
};

/** Enrolled into a group, or lost; the lead leaves the open lists. */
const close = async (leadId: number, outcome: string, outcomeNote: string | null, centerId?: number) => {
  const result = await pool.query(
    `UPDATE leads SET outcome = $2, outcome_note = $3, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE lead_id = $1 AND closed_at IS NULL AND deleted_at IS NULL AND ($4::int IS NULL OR center_id = $4)`,
    [leadId, outcome, outcomeNote, centerId ?? null]
  );
  return result.rowCount > 0;
};

module.exports = { findOpen, countDue, insert, update, close };
export {};
