// Developer locks: accounts only the developer can lock and unlock, checked on every login and
// every request (so a session already open stops too). ('all', 0) locks everyone but the developer.
const pool = require('../../db/pool');

export type LockUserType = 'owner' | 'superuser' | 'teacher' | 'student' | 'parent';
const LOCK_USER_TYPES: LockUserType[] = ['owner', 'superuser', 'teacher', 'student', 'parent'];

const CACHE_MS = 10_000;
let cache: { at: number; keys: Set<string> } | null = null;

const keyOf = (userType: string, userId: number) => `${userType}:${Number(userId)}`;

const loadLocks = async (): Promise<Set<string>> => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.keys;
  try {
    const { rows } = await pool.query('SELECT user_type, user_id FROM developer_locks');
    cache = { at: Date.now(), keys: new Set(rows.map((row: any) => keyOf(row.user_type, row.user_id))) };
  } catch (error) {
    // Before the migration has run there is nothing to enforce; keep serving.
    console.error('Developer lock check failed:', error);
    cache = { at: Date.now(), keys: cache?.keys || new Set() };
  }
  return cache.keys;
};

const clearCache = () => {
  cache = null;
};

const isDeveloperUser = (user: any) => Boolean(user && user.userType === 'superuser' && user.is_developer === true);

// The lock kind of a signed-in user: owners sign in as superusers with the owner role.
const lockTypeOf = (user: any): LockUserType | null => {
  if (!user) return null;
  if (user.userType === 'superuser') return String(user.role || '').toLowerCase() === 'owner' ? 'owner' : 'superuser';
  return LOCK_USER_TYPES.includes(user.userType) ? user.userType : null;
};

type LockState = { locked: false } | { locked: true; code: 'ACCOUNT_LOCKED' | 'SYSTEM_LOCKED'; error: string };

const ACCOUNT_LOCKED: LockState = { locked: true, code: 'ACCOUNT_LOCKED', error: 'Hisobingiz bloklangan. Iltimos, ma\'muriyatga murojaat qiling.' };
const SYSTEM_LOCKED: LockState = { locked: true, code: 'SYSTEM_LOCKED', error: 'Tizim vaqtincha yopilgan.' };

// The developer is never locked out, neither one by one nor by the lock on everyone.
const lockStateFor = async (userType: LockUserType | null, userId: number, developer = false): Promise<LockState> => {
  if (developer || !userType) return { locked: false };
  const keys = await loadLocks();
  if (keys.has(keyOf(userType, userId))) return ACCOUNT_LOCKED;
  if (keys.has(keyOf('all', 0))) return SYSTEM_LOCKED;
  return { locked: false };
};

const lockStateForUser = (user: any) => lockStateFor(lockTypeOf(user), Number(user?.id), isDeveloperUser(user));

// For login handlers: answers 423 and returns true when the account may not sign in.
const refuseLockedLogin = async (res: any, userType: LockUserType, userId: number, developer = false) => {
  const state = await lockStateFor(userType, userId, developer);
  if (!state.locked) return false;
  res.status(423).json({ error: state.error, code: state.code });
  return true;
};

module.exports = { LOCK_USER_TYPES, clearCache, isDeveloperUser, lockTypeOf, lockStateFor, lockStateForUser, refuseLockedLogin };
