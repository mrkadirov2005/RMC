// SQL for a group's price in a month. `classId` and `month` are SQL expressions (qualify column
// names: they are used inside subqueries); `fallback` (usually c.payment_amount) is used when the
// group has no price history yet.
//
// 1. If the group was in a level that month (class_level_history), the level's price for the month.
// 2. Otherwise the group's own price (class_price_history): the latest price whose start month is
//    on or before it; a month before the first change uses the price that change replaced, so
//    months paid at the old price stay paid even without an "initial" row.

/** A level's price in a month, or NULL when the level had no price then. */
const levelPriceAtSql = (levelId: string, month: string) =>
  `COALESCE((SELECT lh.amount FROM level_price_history lh WHERE lh.level_id = ${levelId}
     AND lh.effective_from <= (${month})::date ORDER BY lh.effective_from DESC, lh.history_id DESC LIMIT 1),
   (SELECT lh.previous_amount FROM level_price_history lh WHERE lh.level_id = ${levelId}
     AND lh.effective_from > (${month})::date ORDER BY lh.effective_from ASC, lh.history_id ASC LIMIT 1))`;

/** The group's own price in a month (ignoring levels). */
const ownPriceAtSql = (classId: string, month: string, fallback: string) =>
  `COALESCE((SELECT h.amount FROM class_price_history h WHERE h.class_id = ${classId}
     AND h.effective_from <= (${month})::date ORDER BY h.effective_from DESC, h.history_id DESC LIMIT 1),
   (SELECT h.previous_amount FROM class_price_history h WHERE h.class_id = ${classId}
     AND h.effective_from > (${month})::date ORDER BY h.effective_from ASC, h.history_id ASC LIMIT 1),
   ${fallback}, 0)`;

const priceAtSql = (classId: string, month: string, fallback: string) =>
  `COALESCE((SELECT ${levelPriceAtSql('clh.level_id', month)} FROM class_level_history clh
     WHERE clh.class_id = ${classId} AND clh.effective_from <= (${month})::date
     ORDER BY clh.effective_from DESC, clh.history_id DESC LIMIT 1),
   ${ownPriceAtSql(classId, month, fallback)})`;

module.exports = { priceAtSql, levelPriceAtSql, ownPriceAtSql };

export {};
