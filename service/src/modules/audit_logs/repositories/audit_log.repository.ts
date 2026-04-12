const pool = require('../../../db/pool');

const findFiltered = (conditions: string[], params: any[], limit?: number, offset?: number) => {
  let query = 'SELECT * FROM audit_logs';
  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ' ORDER BY created_at DESC';
  const p = [...params];
  if (limit != null) {
    p.push(limit);
    query += ` LIMIT $${p.length}`;
  }
  if (offset != null) {
    p.push(offset);
    query += ` OFFSET $${p.length}`;
  }
  return pool.query(query, p).then((r: any) => r.rows);
};

module.exports = { findFiltered };

export {};
