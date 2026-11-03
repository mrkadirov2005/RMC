// The signed copy of the developer's locks and developer accounts (see
// service/src/modules/developer/seal.ts, whose payload and key this must build identically), sealed
// here over the state at migration time so the seal exists from the first start.
const crypto = require('node:crypto');

const DEVELOPMENT_SECRET = 'crm_jwt_secret_key_2024_change_in_production';

const sealKey = () => {
  const secret = String(process.env.JWT_SECRET || '').trim() || (process.env.NODE_ENV === 'production' ? '' : DEVELOPMENT_SECRET);
  if (!secret) throw new Error('JWT_SECRET must be configured in production.');
  return crypto.createHash('sha256').update(`rmc-developer-seal:${secret}`).digest();
};

const compareTuples = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
};

module.exports = {
  async up(queryInterface) {
    const run = (sql) => queryInterface.sequelize.query(sql, { type: queryInterface.sequelize.QueryTypes.SELECT });
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS developer_seal (
        seal_id SMALLINT PRIMARY KEY CHECK (seal_id = 1),
        payload TEXT NOT NULL,
        signature TEXT NOT NULL,
        sealed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const locks = (await run('SELECT user_type, user_id FROM developer_locks')).map((row) => [String(row.user_type), Number(row.user_id)]);
    const developers = (await run('SELECT owner_id, username, password_hash FROM owners WHERE COALESCE(is_developer, FALSE)')).map(
      (row) => [Number(row.owner_id), String(row.username ?? ''), String(row.password_hash ?? '')]
    );
    const payload = JSON.stringify({ v: 1, locks: locks.sort(compareTuples), developers: developers.sort(compareTuples) });
    const signature = crypto.createHmac('sha256', sealKey()).update(payload).digest('hex');
    await queryInterface.sequelize.query(
      `INSERT INTO developer_seal (seal_id, payload, signature) VALUES (1, :payload, :signature)
       ON CONFLICT (seal_id) DO UPDATE SET payload = EXCLUDED.payload, signature = EXCLUDED.signature, sealed_at = CURRENT_TIMESTAMP`,
      { replacements: { payload, signature } }
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS developer_seal;');
  },
};
