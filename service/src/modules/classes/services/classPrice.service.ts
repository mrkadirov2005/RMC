// A group's price over time (class_price_history). Each month is billed at the price in effect
// for it, so a new price only counts from the month it starts. classes.payment_amount stays the
// price in effect this month, for everything that shows "the group's price".
const { query, one, tx, tashkentDay } = require('../../appkit/kit');
const { priceAtSql } = require('../classPriceSql');

type Actor = { userType: string; id: number; name: string | null };

const thisMonth = (now = new Date()) => `${tashkentDay(now).slice(0, 7)}-01`;
const monthOf = (value: unknown) => {
  const text = String(value || '').trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(text) ? `${text}-01` : null;
};
const addMonths = (month: string, count: number) => {
  const date = new Date(`${month}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + count);
  return date.toISOString().slice(0, 10);
};

const findClass = (q: any, classId: number, centerId: number | null, teacherId: number | null, lock = false) =>
  q.one(
    `SELECT class_id, center_id, class_name, teacher_id, payment_amount FROM classes
     WHERE class_id = $1 AND deleted_at IS NULL AND ($2::int IS NULL OR center_id = $2)
       AND ($3::int IS NULL OR teacher_id = $3)${lock ? ' FOR UPDATE' : ''}`,
    [classId, centerId, teacherId]
  );

const shape = (row: any) => ({
  history_id: row.history_id,
  amount: Number(row.amount),
  previous_amount: row.previous_amount == null ? null : Number(row.previous_amount),
  effective_from: String(row.effective_from_text || row.effective_from).slice(0, 7),
  note: row.note ?? null,
  source: row.source,
  changed_by_name: row.changed_by_name ?? null,
  created_at: row.created_at,
});

/** The group's prices, newest first, and the price this month. */
const history = async (classId: number, centerId: number | null, teacherId: number | null = null) => {
  const cls = await findClass({ one }, classId, centerId, teacherId);
  if (!cls) return { error: 'not_found' };
  const rows = await query(
    `SELECT *, effective_from::text AS effective_from_text FROM class_price_history
     WHERE class_id = $1 ORDER BY effective_from DESC, history_id DESC`,
    [classId]
  );
  return { class_id: classId, current_amount: Number(cls.payment_amount || 0), items: rows.map(shape) };
};

// The group's first price change: keep what it cost before, for all earlier months.
const ensureInitial = async (q: any, cls: any) => {
  const existing = await q.one('SELECT 1 AS ok FROM class_price_history WHERE class_id = $1 LIMIT 1', [cls.class_id]);
  if (existing || cls.payment_amount == null) return;
  await q.query(
    `INSERT INTO class_price_history (class_id, center_id, amount, effective_from, note, source)
     VALUES ($1, $2, $3, DATE '2000-01-01', 'Price before the first change', 'initial')`,
    [cls.class_id, cls.center_id, cls.payment_amount]
  );
};

const record = async (q: any, cls: any, amount: number, month: string, note: string | null, actor: Actor) => {
  await ensureInitial(q, cls);
  const before = await q.one(`SELECT ${priceAtSql('$1', '$2', '$3::numeric')} AS amount`, [cls.class_id, month, cls.payment_amount]);
  const row = await q.one(
    `INSERT INTO class_price_history
       (class_id, center_id, amount, previous_amount, effective_from, note, source, changed_by_type, changed_by_id, changed_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, 'manual', $7, $8, $9)
     RETURNING *, effective_from::text AS effective_from_text`,
    [cls.class_id, cls.center_id, amount, before?.amount ?? null, month, note, actor.userType, actor.id, actor.name]
  );
  // The group's shown price follows the price in effect this month.
  const current = await q.one(`SELECT ${priceAtSql('$1', '$2', '$3::numeric')} AS amount`, [cls.class_id, thisMonth(), cls.payment_amount]);
  await q.query('UPDATE classes SET payment_amount = $2, updated_at = CURRENT_TIMESTAMP WHERE class_id = $1', [cls.class_id, current.amount]);
  return { entry: shape(row), current_amount: Number(current.amount) };
};

/** "Change group payment": a new price from a month (this month by default; up to 12 months back
 * to correct a missed change, or up to 12 ahead to plan one). */
const changePrice = async (classId: number, body: any, centerId: number | null, actor: Actor) => {
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) return { error: 'bad_amount' };
  const now = thisMonth();
  const month = body?.effective_month == null || body.effective_month === '' ? now : monthOf(body.effective_month);
  if (!month || month < addMonths(now, -12) || month > addMonths(now, 12)) return { error: 'bad_month' };
  const note = String(body?.note || '').trim().slice(0, 500) || null;
  return tx(async (q: any) => {
    const cls = await findClass(q, classId, centerId, null, true);
    if (!cls) return { error: 'not_found' };
    return { class_id: classId, ...(await record(q, cls, Math.round(amount * 100) / 100, month, note, actor)) };
  });
};

/** Whether the group's price has been changed from the payments section yet. */
const hasHistory = async (classId: number) =>
  Boolean(await one('SELECT 1 AS ok FROM class_price_history WHERE class_id = $1 LIMIT 1', [classId]));

/** A planned price starts when its month comes: keep classes.payment_amount on this month's price. */
const syncCurrentPrices = () =>
  query(
    `UPDATE classes c SET payment_amount = cur.amount, updated_at = CURRENT_TIMESTAMP
     FROM (
       SELECT DISTINCT ON (class_id) class_id, amount FROM class_price_history
       WHERE effective_from <= $1::date ORDER BY class_id, effective_from DESC, history_id DESC
     ) cur
     WHERE cur.class_id = c.class_id AND c.payment_amount IS DISTINCT FROM cur.amount
     RETURNING c.class_id`,
    [thisMonth()]
  );

module.exports = { priceAtSql, history, changePrice, hasHistory, syncCurrentPrices, thisMonth };

export {};
