const pool = require('../../../db/pool');

const findAll = () =>
  pool.query('SELECT id, english, uzbek FROM translations ORDER BY id').then((result: any) => result.rows);

const findById = (id: string) =>
  pool.query('SELECT id, english, uzbek FROM translations WHERE id = $1', [id]).then((result: any) => result.rows[0] || null);

const upsert = (id: string, english: string, uzbek: string) =>
  pool
    .query(
      `
        INSERT INTO translations (id, english, uzbek)
        VALUES ($1, $2, $3)
        ON CONFLICT (id)
        DO UPDATE SET english = EXCLUDED.english, uzbek = EXCLUDED.uzbek
        RETURNING id, english, uzbek
      `,
      [id, english, uzbek]
    )
    .then((result: any) => result.rows[0]);

const bulkUpsert = async (rows: Array<{ id: string; english: string; uzbek: string }>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const saved: Array<{ id: string; english: string; uzbek: string }> = [];
    for (const row of rows) {
      const result = await client.query(
        `
          INSERT INTO translations (id, english, uzbek)
          VALUES ($1, $2, $3)
          ON CONFLICT (id)
          DO UPDATE SET english = EXCLUDED.english, uzbek = EXCLUDED.uzbek
          RETURNING id, english, uzbek
        `,
        [row.id, row.english, row.uzbek]
      );
      saved.push(result.rows[0]);
    }
    await client.query('COMMIT');
    return saved;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const remove = (id: string) =>
  pool.query('DELETE FROM translations WHERE id = $1 RETURNING id, english, uzbek', [id]).then((result: any) => result.rows[0] || null);

module.exports = { findAll, findById, upsert, bulkUpsert, remove };

export {};
