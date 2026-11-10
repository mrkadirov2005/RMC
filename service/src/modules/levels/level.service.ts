// Subject -> level -> group. A level carries the price for all its groups. Level prices change
// from a month (level_price_history), like group prices, and a group's place in a level is kept
// by month (class_level_history), so earlier months keep the price they had.
const priceService = require('../classes/services/classPrice.service');
const { levelPriceAtSql } = require('../classes/classPriceSql');

const { query, one, tx, monthOf, addMonths, shape, ensureInitial, syncClass, thisMonth } = priceService;

type Actor = { userType: string; id: number; name: string | null; centerId: number | null };

const money = (value: unknown) => (value == null ? null : Number(value));

// Subject rows double as "subject in a group" rows; levels hang off the subject's own row (no
// group), found by name, so unassigning a group from the subject never takes its levels along.
const findSubject = (q: any, subjectId: number, centerId: number | null) =>
  q.one(
    `SELECT subject_id, center_id, class_id, subject_name, subject_code FROM subjects
     WHERE subject_id = $1 AND ($2::int IS NULL OR center_id = $2)`,
    [subjectId, centerId]
  );

const catalogRow = async (q: any, subject: any, create: boolean) => {
  if (subject.class_id == null) return subject;
  const found = await q.one(
    `SELECT subject_id, center_id, class_id, subject_name, subject_code FROM subjects
     WHERE center_id = $1 AND class_id IS NULL AND lower(trim(subject_name)) = lower(trim($2))
     ORDER BY subject_id LIMIT 1`,
    [subject.center_id, subject.subject_name]
  );
  if (found || !create) return found;
  return q.one(
    `INSERT INTO subjects (center_id, class_id, subject_name, subject_code, total_marks, passing_marks)
     VALUES ($1, NULL, $2, $3, 100, 40)
     RETURNING subject_id, center_id, class_id, subject_name, subject_code`,
    [subject.center_id, subject.subject_name, subject.subject_code]
  );
};

const findLevel = (q: any, levelId: number, centerId: number | null, lock = false) =>
  q.one(
    `SELECT l.*, s.subject_name FROM subject_levels l LEFT JOIN subjects s ON s.subject_id = l.subject_id
     WHERE l.level_id = $1 AND l.deleted_at IS NULL AND ($2::int IS NULL OR l.center_id = $2)${lock ? ' FOR UPDATE OF l' : ''}`,
    [levelId, centerId]
  );

const shapeLevel = (row: any) => ({
  level_id: Number(row.level_id),
  subject_id: Number(row.subject_id),
  level_name: row.level_name,
  sort_order: Number(row.sort_order || 0),
  payment_amount: money(row.payment_amount),
});

/** A subject's levels with the groups in each this month, and the subject's groups in no level. */
const listForSubject = async (subjectId: number, centerId: number | null) => {
  const subject = await findSubject({ one }, subjectId, centerId);
  if (!subject) return { error: 'subject_not_found' };
  const catalog = await catalogRow({ one }, subject, false);
  const levels = catalog
    ? await query(
        `SELECT * FROM subject_levels WHERE subject_id = $1 AND deleted_at IS NULL ORDER BY sort_order, lower(level_name), level_id`,
        [catalog.subject_id]
      )
    : [];
  const levelIds = levels.map((level: any) => Number(level.level_id));
  const groups = levelIds.length
    ? await query(
        `SELECT c.class_id, c.class_name, c.level_id, c.payment_amount,
                NULLIF(trim(concat_ws(' ', t.first_name, t.last_name)), '') AS teacher_name,
                (SELECT clh.effective_from::text FROM class_level_history clh WHERE clh.class_id = c.class_id
                  AND clh.level_id = c.level_id ORDER BY clh.effective_from DESC, clh.history_id DESC LIMIT 1) AS since,
                (SELECT count(*)::int FROM students st WHERE st.class_id = c.class_id
                  AND COALESCE(st.status::text, 'Active') = 'Active') AS students
         FROM classes c LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
         WHERE c.deleted_at IS NULL AND c.level_id = ANY($1::int[])
         ORDER BY lower(c.class_name)`,
        [levelIds]
      )
    : [];
  const unleveled = await query(
    `SELECT DISTINCT c.class_id, c.class_name, c.payment_amount,
            NULLIF(trim(concat_ws(' ', t.first_name, t.last_name)), '') AS teacher_name
     FROM subjects s
     JOIN classes c ON c.class_id = s.class_id AND c.deleted_at IS NULL AND c.level_id IS NULL
     LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
     WHERE s.center_id = $1 AND lower(trim(s.subject_name)) = lower(trim($2))
     ORDER BY c.class_name`,
    [subject.center_id, subject.subject_name]
  );
  const group = (row: any) => ({
    class_id: Number(row.class_id),
    class_name: row.class_name,
    teacher_name: row.teacher_name ?? null,
    payment_amount: money(row.payment_amount),
    since: row.since ? String(row.since).slice(0, 7) : null,
    students: row.students == null ? null : Number(row.students),
  });
  return {
    subject: { subject_id: Number(subject.subject_id), subject_name: subject.subject_name },
    levels: levels.map((level: any) => ({
      ...shapeLevel(level),
      groups: groups.filter((row: any) => Number(row.level_id) === Number(level.level_id)).map(group),
    })),
    unleveled_groups: unleveled.map(group),
  };
};

const cleanName = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 100);
const cleanAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1e12 ? Math.round(amount * 100) / 100 : null;
};
const isUniqueViolation = (error: any) => error?.code === '23505';

/** Adds a level to a subject. Only the developer may give it a price straight away. */
const createLevel = async (subjectId: number, body: any, actor: Actor, isDeveloper: boolean) => {
  const name = cleanName(body?.level_name);
  if (!name) return { error: 'bad_name' };
  const hasAmount = body?.payment_amount != null && body.payment_amount !== '';
  const amount = hasAmount ? cleanAmount(body.payment_amount) : null;
  if (hasAmount && !isDeveloper) return { error: 'developer_only' };
  if (hasAmount && amount == null) return { error: 'bad_amount' };
  try {
    return await tx(async (q: any) => {
      const subject = await findSubject(q, subjectId, actor.centerId);
      if (!subject) return { error: 'subject_not_found' };
      const catalog = await catalogRow(q, subject, true);
      const order = await q.one(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM subject_levels WHERE subject_id = $1 AND deleted_at IS NULL',
        [catalog.subject_id]
      );
      const level = await q.one(
        `INSERT INTO subject_levels (center_id, subject_id, level_name, sort_order, payment_amount)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [catalog.center_id, catalog.subject_id, name, Number(order.next), amount]
      );
      if (amount != null) {
        await q.query(
          `INSERT INTO level_price_history (level_id, center_id, amount, effective_from, note, source, changed_by_type, changed_by_id, changed_by_name)
           VALUES ($1, $2, $3, DATE '2000-01-01', 'Level price', 'initial', $4, $5, $6)`,
          [level.level_id, level.center_id, amount, actor.userType, actor.id, actor.name]
        );
      }
      return shapeLevel(level);
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: 'level_exists' };
    throw error;
  }
};

/** Renames or reorders a level (its price changes only through changeLevelPrice). */
const updateLevel = async (levelId: number, body: any, actor: Actor) => {
  const level = await findLevel({ one }, levelId, actor.centerId);
  if (!level) return { error: 'level_not_found' };
  const name = body?.level_name === undefined ? level.level_name : cleanName(body.level_name);
  if (!name) return { error: 'bad_name' };
  const order = body?.sort_order === undefined ? Number(level.sort_order || 0) : Number(body.sort_order);
  if (!Number.isInteger(order)) return { error: 'bad_order' };
  try {
    const row = await one(
      'UPDATE subject_levels SET level_name = $2, sort_order = $3, updated_at = CURRENT_TIMESTAMP WHERE level_id = $1 RETURNING *',
      [levelId, name, order]
    );
    return shapeLevel(row);
  } catch (error) {
    if (isUniqueViolation(error)) return { error: 'level_exists' };
    throw error;
  }
};

/** Removes an empty level. Its price history stays: past months of groups once in it keep their price. */
const deleteLevel = async (levelId: number, actor: Actor) =>
  tx(async (q: any) => {
    const level = await findLevel(q, levelId, actor.centerId, true);
    if (!level) return { error: 'level_not_found' };
    const busy = await q.one(
      'SELECT 1 AS ok FROM classes WHERE level_id = $1 AND deleted_at IS NULL LIMIT 1',
      [levelId]
    );
    if (busy) return { error: 'level_has_groups' };
    await q.query('UPDATE subject_levels SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE level_id = $1', [levelId]);
    return { level_id: levelId, deleted: true };
  });

/** The level's prices, newest first. */
const levelHistory = async (levelId: number, centerId: number | null) => {
  const level = await findLevel({ one }, levelId, centerId);
  if (!level) return { error: 'level_not_found' };
  const rows = await query(
    `SELECT *, effective_from::text AS effective_from_text FROM level_price_history
     WHERE level_id = $1 ORDER BY effective_from DESC, history_id DESC`,
    [levelId]
  );
  return { ...shapeLevel(level), subject_name: level.subject_name ?? null, items: rows.map(shape) };
};

/** "Change level payment": a new price from a month for every group in the level. A level's
 * first price counts for all months. Developer only (checked by the controller). */
const changeLevelPrice = async (levelId: number, body: any, actor: Actor) => {
  const amount = cleanAmount(body?.amount);
  if (amount == null) return { error: 'bad_amount' };
  const now = thisMonth();
  const month = body?.effective_month == null || body.effective_month === '' ? now : monthOf(body.effective_month);
  if (!month || month < addMonths(now, -12) || month > addMonths(now, 12)) return { error: 'bad_month' };
  const note = String(body?.note || '').trim().slice(0, 500) || null;
  return tx(async (q: any) => {
    const level = await findLevel(q, levelId, actor.centerId, true);
    if (!level) return { error: 'level_not_found' };
    const first = !(await q.one('SELECT 1 AS ok FROM level_price_history WHERE level_id = $1 LIMIT 1', [levelId]));
    const before = first
      ? null
      : await q.one(`SELECT ${levelPriceAtSql('$1::int', '$2')} AS amount`, [levelId, month]);
    const row = await q.one(
      `INSERT INTO level_price_history
         (level_id, center_id, amount, previous_amount, effective_from, note, source, changed_by_type, changed_by_id, changed_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *, effective_from::text AS effective_from_text`,
      [levelId, level.center_id, amount, before?.amount ?? null, first ? '2000-01-01' : month, note,
        first ? 'initial' : 'manual', actor.userType, actor.id, actor.name]
    );
    const current = await q.one(
      `UPDATE subject_levels SET payment_amount = ${levelPriceAtSql('$1::int', '$2')}, updated_at = CURRENT_TIMESTAMP
       WHERE level_id = $1 RETURNING payment_amount`,
      [levelId, now]
    );
    const members = await q.query('SELECT DISTINCT class_id FROM class_level_history WHERE level_id = $1', [levelId]);
    for (const member of members) await syncClass(q, Number(member.class_id));
    return { level_id: levelId, entry: shape(row), current_amount: money(current?.payment_amount), groups_updated: members.length };
  });
};

/** Puts a group in a level (or out of any, level_id null) from a month: this month by default,
 * up to 12 months back. Months before keep the price the group had then. */
const setClassLevel = async (classId: number, body: any, actor: Actor) => {
  const levelId = body?.level_id == null || body.level_id === '' ? null : Number(body.level_id);
  if (levelId != null && !Number.isInteger(levelId)) return { error: 'level_not_found' };
  const now = thisMonth();
  const month = body?.effective_month == null || body.effective_month === '' ? now : monthOf(body.effective_month);
  if (!month || month < addMonths(now, -12) || month > now) return { error: 'bad_level_month' };
  return tx(async (q: any) => {
    const cls = await q.one(
      `SELECT class_id, center_id, class_name, payment_amount, level_id FROM classes
       WHERE class_id = $1 AND deleted_at IS NULL AND ($2::int IS NULL OR center_id = $2) FOR UPDATE`,
      [classId, actor.centerId]
    );
    if (!cls) return { error: 'not_found' };
    if (levelId != null) {
      const level = await findLevel(q, levelId, null);
      if (!level || Number(level.center_id) !== Number(cls.center_id)) return { error: 'level_not_found' };
    }
    if ((cls.level_id == null ? null : Number(cls.level_id)) === levelId) return { error: 'same_level' };
    // Keep the group's own price for the months before it joined a level.
    await ensureInitial(q, cls);
    await q.query(
      `INSERT INTO class_level_history (class_id, level_id, center_id, effective_from, changed_by_type, changed_by_id, changed_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [classId, levelId, cls.center_id, month, actor.userType, actor.id, actor.name]
    );
    const current = await syncClass(q, classId);
    return { class_id: classId, level_id: levelId, effective_from: month.slice(0, 7), current_amount: current };
  });
};

/** Whether levels hang off this subject row: then it can't be deleted (levels keep the price
 * history of their groups' past months). */
const subjectHasLevels = async (subjectId: number) =>
  Boolean(await one('SELECT 1 AS ok FROM subject_levels WHERE subject_id = $1 LIMIT 1', [subjectId]));

/** Every level in scope, for the group form's level picker. */
const listAll = async (centerId: number | null) => {
  const rows = await query(
    `SELECT l.*, s.subject_name FROM subject_levels l LEFT JOIN subjects s ON s.subject_id = l.subject_id
     WHERE l.deleted_at IS NULL AND ($1::int IS NULL OR l.center_id = $1)
     ORDER BY lower(s.subject_name), l.sort_order, lower(l.level_name)`,
    [centerId]
  );
  return rows.map((row: any) => ({ ...shapeLevel(row), subject_name: row.subject_name ?? null }));
};

module.exports = {
  listForSubject,
  listAll,
  createLevel,
  updateLevel,
  deleteLevel,
  levelHistory,
  changeLevelPrice,
  setClassLevel,
  subjectHasLevels,
};

export {};
