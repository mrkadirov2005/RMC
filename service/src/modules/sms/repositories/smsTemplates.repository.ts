const pool = require('../../../db/pool');

const FIELDS = 'template_id, kind, name, body, is_active, created_at, updated_at';

const findAll = async () =>
  (await pool.query(`SELECT ${FIELDS} FROM sms_templates ORDER BY kind, is_active DESC, name, template_id`)).rows;

/** The active template's text per SMS type, e.g. { payment_waiting: 'Hurmatli ...' }. */
const findActiveBodies = async (): Promise<Record<string, string>> => {
  const result = await pool.query('SELECT kind, body FROM sms_templates WHERE is_active');
  return Object.fromEntries(result.rows.map((row: any) => [row.kind, row.body]));
};

const create = async ({ kind, name, body }: { kind: string; name: string; body: string }) =>
  (await pool.query(`INSERT INTO sms_templates (kind, name, body) VALUES ($1, $2, $3) RETURNING ${FIELDS}`, [kind, name, body])).rows[0];

const update = async (id: number, { name, body }: { name: string; body: string }) =>
  (await pool.query(
    `UPDATE sms_templates SET name = $2, body = $3, updated_at = CURRENT_TIMESTAMP WHERE template_id = $1 RETURNING ${FIELDS}`,
    [id, name, body]
  )).rows[0] || null;

const remove = async (id: number) =>
  ((await pool.query('DELETE FROM sms_templates WHERE template_id = $1', [id])).rowCount || 0) > 0;

/** Makes this the one template used for its type (the type's other templates stop being used), or stops using it. */
const setActive = async (id: number, active: boolean) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT kind FROM sms_templates WHERE template_id = $1 FOR UPDATE', [id]);
    if (!found.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    if (active) {
      await client.query(
        'UPDATE sms_templates SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE kind = $1 AND is_active AND template_id <> $2',
        [found.rows[0].kind, id]
      );
    }
    const result = await client.query(
      `UPDATE sms_templates SET is_active = $2, updated_at = CURRENT_TIMESTAMP WHERE template_id = $1 RETURNING ${FIELDS}`,
      [id, active]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { findAll, findActiveBodies, create, update, remove, setActive };

export {};
