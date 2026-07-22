const pool = require('../../../db/pool');
const { db } = pool;
const { eq } = require('drizzle-orm');
const { translations } = require('../../../db/schema');

const findAll = () =>
  db.select().from(translations).orderBy(translations.id);

const findById = (id: string) =>
  db.select().from(translations).where(eq(translations.id, id)).then((rows: any[]) => rows[0] || null);

const upsert = (id: string, english: string, uzbek: string) =>
  db
    .insert(translations)
    .values({ id, english, uzbek })
    .onConflictDoUpdate({
      target: translations.id,
      set: { english, uzbek },
    })
    .returning()
    .then((rows: any[]) => rows[0]);

const bulkUpsert = (rows: Array<{ id: string; english: string; uzbek: string }>) =>
  db.transaction(async (tx: any) => {
    const saved: Array<{ id: string; english: string; uzbek: string }> = [];
    for (const row of rows) {
      const result = await tx
        .insert(translations)
        .values(row)
        .onConflictDoUpdate({
          target: translations.id,
          set: { english: row.english, uzbek: row.uzbek },
        })
        .returning();
      saved.push(result[0]);
    }
    return saved;
  });

const remove = (id: string) =>
  db.delete(translations).where(eq(translations.id, id)).returning().then((rows: any[]) => rows[0] || null);

module.exports = { findAll, findById, upsert, bulkUpsert, remove };

export {};
