// SQL for a group's price in a month, from class_price_history: the latest price whose start
// month is on or before it. `classId` and `month` are SQL expressions; `fallback` (usually
// c.payment_amount) is used when the group has no history yet.
const priceAtSql = (classId: string, month: string, fallback: string) =>
  `COALESCE((SELECT h.amount FROM class_price_history h WHERE h.class_id = ${classId}
     AND h.effective_from <= (${month})::date ORDER BY h.effective_from DESC, h.history_id DESC LIMIT 1), ${fallback}, 0)`;

module.exports = { priceAtSql };

export {};
