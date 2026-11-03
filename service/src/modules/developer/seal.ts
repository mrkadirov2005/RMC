// The seal over the developer's locks and the developer accounts: a copy of them signed with a key
// derived from JWT_SECRET, which only the server process has. A change made straight in the
// database (a lock deleted, an owner made developer, the developer's password replaced) no longer
// matches the signed copy, and the system closes for everyone but the developer accounts in that
// copy until the developer restores or accepts the change. The first seal is written by the
// 20261103000002 migration, which builds the same payload; keep the two in step.
const crypto = require('node:crypto');
const pool = require('../../db/pool');

const DEVELOPMENT_SECRET = 'crm_jwt_secret_key_2024_change_in_production';

type LockTuple = [string, number];
type DeveloperTuple = [number, string, string];
export interface SealState {
  locks: LockTuple[];
  developers: DeveloperTuple[];
}

const sealKey = () => {
  const secret = String(process.env.JWT_SECRET || '').trim() || (process.env.NODE_ENV === 'production' ? '' : DEVELOPMENT_SECRET);
  if (!secret) throw new Error('JWT_SECRET must be configured in production.');
  return crypto.createHash('sha256').update(`rmc-developer-seal:${secret}`).digest();
};

const sign = (payload: string) => crypto.createHmac('sha256', sealKey()).update(payload).digest('hex');

const compareTuples = (a: any[], b: any[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
};

const serialize = (state: SealState) =>
  JSON.stringify({ v: 1, locks: [...state.locks].sort(compareTuples), developers: [...state.developers].sort(compareTuples) });

const readState = async (db: any = pool): Promise<SealState> => {
  const locks = (await db.query('SELECT user_type, user_id FROM developer_locks')).rows.map(
    (row: any): LockTuple => [String(row.user_type), Number(row.user_id)]
  );
  const developers = (await db.query('SELECT owner_id, username, password_hash FROM owners WHERE COALESCE(is_developer, FALSE)')).rows.map(
    (row: any): DeveloperTuple => [Number(row.owner_id), String(row.username ?? ''), String(row.password_hash ?? '')]
  );
  return { locks, developers };
};

const sameSignature = (a: string, b: string) => {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export interface SealCheck {
  /** The database matches the signed copy. */
  intact: boolean;
  /** The signed copy itself is genuine (its row was not edited or removed). */
  authentic: boolean;
  /** The signed copy, when genuine: the state to trust and to restore. */
  trusted: SealState | null;
  current: SealState;
}

const check = async (db: any = pool): Promise<SealCheck> => {
  const current = await readState(db);
  const row = (await db.query('SELECT payload, signature FROM developer_seal WHERE seal_id = 1')).rows[0];
  const authentic = Boolean(row && sameSignature(sign(row.payload), row.signature));
  const trusted: SealState | null = authentic ? JSON.parse(row.payload) : null;
  return { intact: authentic && row.payload === serialize(current), authentic, trusted, current };
};

// Signs the database as it is now. Only for changes the developer makes (or accepts).
const reseal = async (db: any = pool) => {
  const payload = serialize(await readState(db));
  await db.query(
    `INSERT INTO developer_seal (seal_id, payload, signature, sealed_at) VALUES (1, $1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (seal_id) DO UPDATE SET payload = EXCLUDED.payload, signature = EXCLUDED.signature, sealed_at = EXCLUDED.sealed_at`,
    [payload, sign(payload)]
  );
};

module.exports = { check, reseal, serialize, sign };
