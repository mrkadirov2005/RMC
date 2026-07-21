const pool = require('../../../db/pool');
const { db, sql } = pool;

const findAll = () =>
  db.execute(sql`SELECT id, english, uzbek FROM translations ORDER BY id`).then((result: any) => result.rows);

const findById = (id: string) =>
  db.execute(sql`SELECT id, english, uzbek FROM translations WHERE id = ${id}`).then((result: any) => result.rows[0] || null);

const upsert = (id: string, english: string, uzbek: string) =>
  db
    .execute(sql`
        INSERT INTO translations (id, english, uzbek)
        VALUES (${id}, ${english}, ${uzbek})
        ON CONFLICT (id)
        DO UPDATE SET english = EXCLUDED.english, uzbek = EXCLUDED.uzbek
        RETURNING id, english, uzbek
      `)
    .then((result: any) => result.rows[0]);

const bulkUpsert = (rows: Array<{ id: string; english: string; uzbek: string }>) =>
  db.transaction(async (tx: any) => {
    const saved: Array<{ id: string; english: string; uzbek: string }> = [];
    for (const row of rows) {
      const result = await tx.execute(sql`
          INSERT INTO translations (id, english, uzbek)
          VALUES (${row.id}, ${row.english}, ${row.uzbek})
          ON CONFLICT (id)
          DO UPDATE SET english = EXCLUDED.english, uzbek = EXCLUDED.uzbek
          RETURNING id, english, uzbek
        `);
      saved.push(result.rows[0]);
    }
    return saved;
  });

const remove = (id: string) =>
  db.execute(sql`DELETE FROM translations WHERE id = ${id} RETURNING id, english, uzbek`).then((result: any) => result.rows[0] || null);

module.exports = { findAll, findById, upsert, bulkUpsert, remove };

export {};
