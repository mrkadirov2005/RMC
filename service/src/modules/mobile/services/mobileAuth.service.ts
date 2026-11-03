const crypto = require('crypto');
const accessLock = require('../../developer/accessLock');
const { generateTokenWithExpiry } = require('../../../middleware/auth');
const studentService = require('../../students/services/student.service');
const parentService = require('../../parents/services/parent.service');
const sessionRepository = require('../repositories/mobileSession.repository');

const ACCESS_TOKEN_TTL = process.env.MOBILE_ACCESS_TOKEN_TTL || '15m';
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.MOBILE_ACCESS_TOKEN_TTL_SECONDS || 15 * 60);
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.MOBILE_REFRESH_TOKEN_TTL_DAYS || 30);

type Role = 'student' | 'parent';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newRefreshToken = () => crypto.randomBytes(48).toString('base64url');
const refreshExpiry = () => new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

// The same claims the web logins put in their tokens, plus `sid` (the mobile session), so a
// mobile access token also works on the existing student and parent endpoints.
const accessPayload = (role: Role, account: any, sessionId: number) =>
  role === 'student'
    ? {
        id: account.student_id,
        email: account.email,
        userType: 'student',
        class_id: account.class_id,
        center_id: account.center_id,
        is_frozen: Boolean(account.is_frozen),
        sid: sessionId,
      }
    : { id: account.parent_id, email: account.email, userType: 'parent', sid: sessionId };

const accountId = (role: Role, account: any) => (role === 'student' ? account.student_id : account.parent_id);

const publicAccount = (role: Role, account: any) =>
  role === 'student'
    ? {
        role,
        id: account.student_id,
        first_name: account.first_name,
        last_name: account.last_name,
        email: account.email ?? null,
        center_id: account.center_id ?? null,
        class_id: account.class_id ?? null,
        is_frozen: Boolean(account.is_frozen),
      }
    : {
        role,
        id: account.parent_id,
        first_name: account.first_name,
        last_name: account.last_name,
        email: account.email ?? null,
      };

const authenticateAs = (role: Role, username: string, password: string) =>
  role === 'student' ? studentService.authenticate(username, password) : parentService.authenticate(username, password);

const accountOf = (role: Role, result: any) => (role === 'student' ? result.student : result.parent);

// @MOB-022 Finds the account. With no role, a username that signs in as both a student and a
// parent is ambiguous and the app must ask which one.
const resolveAccount = async (username: string, password: string, role?: Role) => {
  const roles: Role[] = role ? [role] : ['student', 'parent'];
  const results = await Promise.all(roles.map((r) => authenticateAs(r, username, password)));
  const ok = roles.map((r, i) => ({ role: r, result: results[i] })).filter((entry) => entry.result.kind === 'ok');
  if (ok.length > 1) return { kind: 'role_required' as const };
  if (ok.length === 1) return { kind: 'ok' as const, role: ok[0].role, account: accountOf(ok[0].role, ok[0].result) };
  if (results.some((result: any) => result.kind === 'inactive')) return { kind: 'inactive' as const };
  return { kind: 'invalid' as const };
};

const issueTokens = async (tx: any, role: Role, account: any, sessionId: number) => {
  const refreshToken = newRefreshToken();
  await sessionRepository.insertRefreshToken(tx, sessionId, hashToken(refreshToken), refreshExpiry());
  return {
    access_token: generateTokenWithExpiry(accessPayload(role, account, sessionId), ACCESS_TOKEN_TTL),
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
  };
};

// @MOB-022 Sign in on a device: a new session and the first token pair.
const login = async (body: any) => {
  const found = await resolveAccount(body.username, body.password, body.role);
  if (found.kind !== 'ok') return found;
  const { role, account } = found;
  const lock = await accessLock.lockStateFor(role, accountId(role, account));
  if (lock.locked) return { kind: 'locked' as const, error: lock.error, code: lock.code };
  return sessionRepository.withTransaction(async (tx: any) => {
    const session = await sessionRepository.createSession(tx, {
      userType: role,
      userId: accountId(role, account),
      centerId: role === 'student' ? account.center_id : null,
      deviceId: body.device_id,
      deviceName: body.device_name,
      platform: body.platform,
      appVersion: body.app_version,
    });
    const tokens = await issueTokens(tx, role, account, session.session_id);
    return { kind: 'ok' as const, ...tokens, session_id: session.session_id, user: publicAccount(role, account) };
  });
};

// The account as it is now, so a refresh never extends access for a deleted, inactive or
// newly frozen account with stale claims.
const loadAccount = async (role: Role, userId: number) => {
  if ((await accessLock.lockStateFor(role, userId)).locked) return null;
  if (role === 'student') {
    const student = await studentService.getStudent(userId);
    return student && student.status === 'Active' ? student : null;
  }
  const parent = await parentService.getParent(userId);
  return parent && parent.status === 'Active' ? parent : null;
};

// @MOB-023 Rotates the refresh token. A token presented twice revokes its whole session.
const refresh = async (refreshToken: string) =>
  sessionRepository.withTransaction(async (tx: any) => {
    const token = await sessionRepository.findRefreshTokenForUpdate(tx, hashToken(refreshToken));
    if (!token) return { kind: 'invalid' as const };
    if (token.session_revoked_at || token.revoked_at) return { kind: 'invalid' as const };
    if (token.used_at) {
      await sessionRepository.revokeSession(tx, token.session_id);
      return { kind: 'reused' as const };
    }
    if (new Date(token.expires_at).getTime() <= Date.now()) return { kind: 'expired' as const };

    const role = token.user_type as Role;
    const account = await loadAccount(role, token.user_id);
    if (!account) {
      await sessionRepository.revokeSession(tx, token.session_id);
      return { kind: 'inactive' as const };
    }
    await sessionRepository.markTokenUsed(tx, token.token_id);
    await sessionRepository.touchSession(tx, token.session_id);
    const tokens = await issueTokens(tx, role, account, token.session_id);
    return { kind: 'ok' as const, ...tokens, session_id: token.session_id, user: publicAccount(role, account) };
  });

// @MOB-023 Sign out the device that holds this refresh token. Unknown tokens are ignored.
const logout = async (refreshToken: string) =>
  sessionRepository.withTransaction(async (tx: any) => {
    const token = await sessionRepository.findRefreshTokenForUpdate(tx, hashToken(refreshToken));
    if (token) await sessionRepository.revokeSession(tx, token.session_id);
    return { kind: 'ok' as const };
  });

// @MOB-023 The signed-in user's profile.
const me = async (user: any) => {
  const role = user.userType as Role;
  const account = await loadAccount(role, user.id);
  if (!account) return null;
  const profile: any = publicAccount(role, account);
  if (role === 'student') {
    profile.class_name = account.class_name ?? null;
  } else {
    profile.phone = account.phone ?? null;
  }
  return profile;
};

const listDevices = async (user: any) => {
  const sessions = await sessionRepository.listActiveSessions(user.userType, user.id);
  return sessions.map((session: any) => ({ ...session, is_current: session.session_id === user.sid }));
};

// @MOB-023 Sign out one of the user's own devices.
const revokeDevice = async (user: any, sessionId: number) => {
  const session = await sessionRepository.findUserSession(user.userType, user.id, sessionId);
  if (!session) return false;
  await sessionRepository.withTransaction((tx: any) => sessionRepository.revokeSession(tx, sessionId));
  return true;
};

module.exports = {
  hashToken,
  resolveAccount,
  login,
  refresh,
  logout,
  me,
  listDevices,
  revokeDevice,
  ACCESS_TOKEN_TTL,
};

export {};
