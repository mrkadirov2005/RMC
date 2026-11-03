// Developer locks: accounts only the developer can lock and unlock, checked on every login and
// every request (so a session already open stops too). ('all', 0) locks everyone but the developer.
const seal = require('./seal');

export type LockUserType = 'owner' | 'superuser' | 'teacher' | 'student' | 'parent';
const LOCK_USER_TYPES: LockUserType[] = ['owner', 'superuser', 'teacher', 'student', 'parent'];

const CACHE_MS = 10_000;
const ERROR_CACHE_MS = 2_000;

interface LockSnapshot {
  keys: Set<string>;
  /** Developer accounts in the signed copy: the only ones let through when the seal is broken. */
  developerIds: Set<number>;
  /** The database matches the signed copy; otherwise everyone else is locked out. */
  intact: boolean;
}

let cache: { at: number; ttl: number; snapshot: LockSnapshot } | null = null;

const keyOf = (userType: string, userId: number) => `${userType}:${Number(userId)}`;

const loadLocks = async (): Promise<LockSnapshot> => {
  if (cache && Date.now() - cache.at < cache.ttl) return cache.snapshot;
  try {
    const result = await seal.check();
    const snapshot: LockSnapshot = {
      keys: new Set(result.current.locks.map(([type, id]: [string, number]) => keyOf(type, id))),
      developerIds: new Set((result.trusted?.developers || []).map(([id]: [number]) => Number(id))),
      intact: result.intact,
    };
    if (!snapshot.intact) console.error('Developer seal broken: the locks or developer accounts were changed outside the app.');
    cache = { at: Date.now(), ttl: CACHE_MS, snapshot };
  } catch (error) {
    // Unreadable lock data: closed in production (a dropped table must not open the system),
    // open elsewhere so tests and local runs without these tables keep working.
    console.error('Developer lock check failed:', error);
    const closed = process.env.NODE_ENV === 'production';
    cache = { at: Date.now(), ttl: ERROR_CACHE_MS, snapshot: { keys: new Set(), developerIds: new Set(), intact: !closed } };
  }
  return cache.snapshot;
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

// The developer is never locked out, neither one by one nor by the lock on everyone, as long as
// the account is a developer in the signed copy (a developer flag set in the database is not enough).
const lockStateFor = async (userType: LockUserType | null, userId: number, developer = false): Promise<LockState> => {
  if (!userType) return { locked: false };
  const snapshot = await loadLocks();
  if (developer && userType === 'owner' && snapshot.developerIds.has(Number(userId))) return { locked: false };
  if (!snapshot.intact) return SYSTEM_LOCKED;
  if (snapshot.keys.has(keyOf(userType, userId))) return ACCOUNT_LOCKED;
  if (snapshot.keys.has(keyOf('all', 0))) return SYSTEM_LOCKED;
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
