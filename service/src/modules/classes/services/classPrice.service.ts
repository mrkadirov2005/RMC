// A group's price over time (class_price_history). Each month is billed at the price in effect
// for it, so a new price only counts from the month it starts. classes.payment_amount stays the
// price in effect this month, for everything that shows "the group's price".
const pool = require('../../../db/pool');
const { priceAtSql, ownPriceAtSql, levelPriceAtSql } = require('../classPriceSql');
const { lessonDaysOf } = require('../../salaries/services/groupPayments');

const query = (text: string, params: any[] = []) => pool.query(text, params).then((r: any) => r.rows);
const one = (text: string, params: any[] = []) => query(text, params).then((rows: any[]) => rows[0] || null);

// Runs work on one client inside BEGIN/COMMIT; the callback gets query/one bound to that client.
const tx = async <T>(work: (q: { query: typeof query; one: typeof one }) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  const q = (text: string, params: any[] = []) => client.query(text, params).then((r: any) => r.rows);
  const o = (text: string, params: any[] = []) => q(text, params).then((rows: any[]) => rows[0] || null);
  try {
    await client.query('BEGIN');
    const result = await work({ query: q, one: o });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

// Tashkent is UTC+5 all year: the month a price starts is Tashkent's month.
const tashkentDay = (now = new Date()) => new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

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
    `SELECT class_id, center_id, class_name, teacher_id, payment_amount, level_id FROM classes
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

/** The group's own prices, newest first, the price this month, and its level (if any): the
 * level's prices and the months the group joined or left levels. */
const history = async (classId: number, centerId: number | null, teacherId: number | null = null) => {
  const cls = await findClass({ one }, classId, centerId, teacherId);
  if (!cls) return { error: 'not_found' };
  const rows = await query(
    `SELECT *, effective_from::text AS effective_from_text FROM class_price_history
     WHERE class_id = $1 ORDER BY effective_from DESC, history_id DESC`,
    [classId]
  );
  const level = cls.level_id
    ? await one(
        `SELECT l.level_id, l.level_name, l.payment_amount, s.subject_id, s.subject_name
         FROM subject_levels l LEFT JOIN subjects s ON s.subject_id = l.subject_id WHERE l.level_id = $1`,
        [cls.level_id]
      )
    : null;
  const levelItems = level
    ? await query(
        `SELECT *, effective_from::text AS effective_from_text FROM level_price_history
         WHERE level_id = $1 ORDER BY effective_from DESC, history_id DESC`,
        [cls.level_id]
      )
    : [];
  const moves = await query(
    `SELECT clh.history_id, clh.level_id, clh.effective_from::text AS effective_from, clh.changed_by_name, clh.created_at,
            l.level_name, s.subject_name
     FROM class_level_history clh
     LEFT JOIN subject_levels l ON l.level_id = clh.level_id
     LEFT JOIN subjects s ON s.subject_id = l.subject_id
     WHERE clh.class_id = $1 ORDER BY clh.effective_from DESC, clh.history_id DESC`,
    [classId]
  );
  return {
    class_id: classId,
    current_amount: Number(cls.payment_amount || 0),
    items: rows.map(shape),
    level: level
      ? {
          level_id: Number(level.level_id),
          level_name: level.level_name,
          subject_id: level.subject_id == null ? null : Number(level.subject_id),
          subject_name: level.subject_name ?? null,
          current_amount: level.payment_amount == null ? null : Number(level.payment_amount),
          items: levelItems.map(shape),
        }
      : null,
    level_moves: moves.map((move: any) => ({
      history_id: move.history_id,
      level_id: move.level_id == null ? null : Number(move.level_id),
      level_name: move.level_name ?? null,
      subject_name: move.subject_name ?? null,
      effective_from: String(move.effective_from).slice(0, 7),
      changed_by_name: move.changed_by_name ?? null,
      created_at: move.created_at,
    })),
  };
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
  const before = await q.one(`SELECT ${ownPriceAtSql('$1::int', '$2', '$3::numeric')} AS amount`, [cls.class_id, month, cls.payment_amount]);
  const row = await q.one(
    `INSERT INTO class_price_history
       (class_id, center_id, amount, previous_amount, effective_from, note, source, changed_by_type, changed_by_id, changed_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, 'manual', $7, $8, $9)
     RETURNING *, effective_from::text AS effective_from_text`,
    [cls.class_id, cls.center_id, amount, before?.amount ?? null, month, note, actor.userType, actor.id, actor.name]
  );
  const current = await syncClass(q, cls.class_id);
  return { entry: shape(row), current_amount: current };
};

/** Keeps the group's shown price (and level) on what is in effect this month; returns the price. */
const syncClass = async (q: any, classId: number) => {
  const row = await q.one(
    `UPDATE classes c SET
       payment_amount = ${priceAtSql('c.class_id', '$2', 'c.payment_amount')},
       level_id = (SELECT clh.level_id FROM class_level_history clh WHERE clh.class_id = c.class_id
                   AND clh.effective_from <= $2::date ORDER BY clh.effective_from DESC, clh.history_id DESC LIMIT 1),
       updated_at = CURRENT_TIMESTAMP
     WHERE c.class_id = $1 RETURNING c.payment_amount`,
    [classId, thisMonth()]
  );
  return Number(row?.payment_amount || 0);
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
    // A group in a level takes the level's price: change it on the level.
    if (cls.level_id) return { error: 'in_level' };
    return { class_id: classId, ...(await record(q, cls, Math.round(amount * 100) / 100, month, note, actor)) };
  });
};

/** Every group's price over time in scope, for pages that work out many groups' months at once:
 * { [class_id]: [{ amount, effective_from (YYYY-MM) }] }, newest first; the oldest entry starts
 * at 2000-01. Worked out month by month (5 years back, a year ahead) with the same SQL as the
 * backend, so a group's own price changes and its level's prices both count. Groups with no
 * history and no level have no entry (their price is the group's price). */
const allHistories = async (centerId: number | null, teacherId: number | null = null) => {
  const rows = await query(
    `WITH scope AS (
       SELECT c.class_id, c.payment_amount FROM classes c
       WHERE c.deleted_at IS NULL AND ($1::int IS NULL OR c.center_id = $1) AND ($2::int IS NULL OR c.teacher_id = $2)
         AND (EXISTS (SELECT 1 FROM class_price_history h WHERE h.class_id = c.class_id)
              OR EXISTS (SELECT 1 FROM class_level_history x WHERE x.class_id = c.class_id))
     ), months AS (
       SELECT generate_series(($3::date - INTERVAL '60 months')::date, ($3::date + INTERVAL '12 months')::date, INTERVAL '1 month')::date AS m
     )
     SELECT s.class_id, to_char(months.m, 'YYYY-MM') AS month, ${priceAtSql('s.class_id', 'months.m', 's.payment_amount')} AS amount
     FROM scope s CROSS JOIN months ORDER BY s.class_id, months.m`,
    [centerId, teacherId, thisMonth()]
  );
  const byClass: Record<string, Array<{ amount: number; effective_from: string }>> = {};
  rows.forEach((row: any) => {
    const list = (byClass[row.class_id] ||= []);
    const amount = Number(row.amount);
    if (!list.length) list.push({ amount, effective_from: '2000-01' });
    else if (list[list.length - 1].amount !== amount) list.push({ amount, effective_from: String(row.month) });
  });
  Object.values(byClass).forEach((list) => list.reverse());
  // Every group's lesson days, for a month a student joined or left partway (12 lessons a month).
  const sections = await query(
    `SELECT c.class_id, c.section FROM classes c
     WHERE c.deleted_at IS NULL AND ($1::int IS NULL OR c.center_id = $1) AND ($2::int IS NULL OR c.teacher_id = $2)`,
    [centerId, teacherId]
  );
  const schedules: Record<string, string[]> = {};
  sections.forEach((row: any) => {
    const days = lessonDaysOf(row.section);
    if (days.length) schedules[row.class_id] = days;
  });
  return { classes: byClass, schedules };
};

/** Whether the group's price has been changed from the payments section yet. */
const hasHistory = async (classId: number) =>
  Boolean(await one('SELECT 1 AS ok FROM class_price_history WHERE class_id = $1 LIMIT 1', [classId]));

/** A planned price (or level move) starts when its month comes: keep each level's and group's
 * shown price, and each group's level, on what is in effect this month. */
const syncCurrentPrices = async () => {
  const month = thisMonth();
  await query(
    `UPDATE subject_levels l SET payment_amount = cur.amount, updated_at = CURRENT_TIMESTAMP
     FROM (SELECT l2.level_id, ${levelPriceAtSql('l2.level_id', '$1')} AS amount FROM subject_levels l2) cur
     WHERE cur.level_id = l.level_id AND cur.amount IS NOT NULL AND l.payment_amount IS DISTINCT FROM cur.amount`,
    [month]
  );
  return query(
    `UPDATE classes c SET payment_amount = cur.amount, level_id = cur.level_id, updated_at = CURRENT_TIMESTAMP
     FROM (
       SELECT c2.class_id,
              ${priceAtSql('c2.class_id', '$1', 'c2.payment_amount')} AS amount,
              (SELECT clh.level_id FROM class_level_history clh WHERE clh.class_id = c2.class_id
                AND clh.effective_from <= $1::date ORDER BY clh.effective_from DESC, clh.history_id DESC LIMIT 1) AS level_id
       FROM classes c2
       WHERE c2.deleted_at IS NULL
         AND (EXISTS (SELECT 1 FROM class_price_history h WHERE h.class_id = c2.class_id)
              OR EXISTS (SELECT 1 FROM class_level_history x WHERE x.class_id = c2.class_id))
     ) cur
     WHERE cur.class_id = c.class_id
       AND (c.payment_amount IS DISTINCT FROM cur.amount OR c.level_id IS DISTINCT FROM cur.level_id)
     RETURNING c.class_id`,
    [month]
  );
};

// Checks every 10 minutes, so a planned price takes over soon after its month starts.
const startPriceSync = () => {
  if (process.env.NODE_ENV === 'test') return null;
  const run = () => syncCurrentPrices().catch((error: any) => console.error('[class-prices] sync failed:', error?.message || error));
  void run();
  const timer = setInterval(run, 10 * 60 * 1000);
  timer.unref?.();
  return timer;
};

module.exports = {
  priceAtSql,
  history,
  allHistories,
  changePrice,
  hasHistory,
  syncCurrentPrices,
  startPriceSync,
  thisMonth,
  // For the level service.
  query,
  one,
  tx,
  monthOf,
  addMonths,
  shape,
  ensureInitial,
  syncClass,
};

export {};
