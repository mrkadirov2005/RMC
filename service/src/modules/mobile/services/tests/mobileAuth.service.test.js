jest.mock('../../../students/services/student.service', () => ({
  authenticate: jest.fn(),
  getStudent: jest.fn(),
}));
jest.mock('../../../parents/services/parent.service', () => ({
  authenticate: jest.fn(),
  getParent: jest.fn(),
}));
jest.mock('../../repositories/mobileSession.repository', () => ({
  withTransaction: jest.fn((callback) => callback('tx')),
  createSession: jest.fn(),
  insertRefreshToken: jest.fn(),
  findRefreshTokenForUpdate: jest.fn(),
  markTokenUsed: jest.fn(),
  touchSession: jest.fn(),
  revokeSession: jest.fn(),
  findActiveSession: jest.fn(),
  listActiveSessions: jest.fn(),
  findUserSession: jest.fn(),
}));

const { verifyToken } = require('../../../../middleware/auth');
const studentService = require('../../../students/services/student.service');
const parentService = require('../../../parents/services/parent.service');
const repo = require('../../repositories/mobileSession.repository');
const service = require('../mobileAuth.service');

const student = { student_id: 7, first_name: 'Aziza', last_name: 'K', email: 'a@x.uz', class_id: 3, center_id: 2, is_frozen: false, status: 'Active' };
const parent = { parent_id: 11, first_name: 'Ota', last_name: 'K', email: null, status: 'Active', phone: '+998' };
const device = { device_id: 'dev-1', device_name: 'Pixel', platform: 'android', app_version: '1.0.0' };

const futureToken = (overrides = {}) => ({
  token_id: 50,
  session_id: 9,
  expires_at: new Date(Date.now() + 60_000),
  used_at: null,
  revoked_at: null,
  session_revoked_at: null,
  user_type: 'student',
  user_id: 7,
  center_id: 2,
  ...overrides,
});

describe('mobile auth service', () => {
  beforeEach(() => {
    repo.withTransaction.mockImplementation((callback) => callback('tx'));
    repo.createSession.mockResolvedValue({ session_id: 9 });
    studentService.authenticate.mockResolvedValue({ kind: 'invalid' });
    parentService.authenticate.mockResolvedValue({ kind: 'invalid' });
  });

  // @MOB-022
  describe('login', () => {
    it('signs a student in with a short access token carrying the session id', async () => {
      studentService.authenticate.mockResolvedValue({ kind: 'ok', student });

      const result = await service.login({ username: 'aziza', password: 'pw', ...device });

      expect(result.kind).toBe('ok');
      expect(result.user).toMatchObject({ role: 'student', id: 7, center_id: 2 });
      expect(result.expires_in).toBe(900);
      const claims = verifyToken(result.access_token);
      expect(claims).toMatchObject({ id: 7, userType: 'student', center_id: 2, class_id: 3, sid: 9 });
      expect(claims.exp - claims.iat).toBe(15 * 60);
      expect(repo.createSession).toHaveBeenCalledWith('tx', expect.objectContaining({ userType: 'student', userId: 7, deviceId: 'dev-1', platform: 'android' }));
    });

    it('stores only a hash of the refresh token', async () => {
      studentService.authenticate.mockResolvedValue({ kind: 'ok', student });

      const result = await service.login({ username: 'aziza', password: 'pw', ...device });

      const [, sessionId, storedHash, expiresAt] = repo.insertRefreshToken.mock.calls[0];
      expect(sessionId).toBe(9);
      expect(storedHash).toBe(service.hashToken(result.refresh_token));
      expect(storedHash).not.toBe(result.refresh_token);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);
    });

    it('signs a parent in when only the parent account matches', async () => {
      parentService.authenticate.mockResolvedValue({ kind: 'ok', parent });

      const result = await service.login({ username: 'ota', password: 'pw', ...device });

      expect(result.user).toMatchObject({ role: 'parent', id: 11 });
      expect(verifyToken(result.access_token)).toMatchObject({ id: 11, userType: 'parent', sid: 9 });
    });

    it('asks for the role when the same credentials open a student and a parent account', async () => {
      studentService.authenticate.mockResolvedValue({ kind: 'ok', student });
      parentService.authenticate.mockResolvedValue({ kind: 'ok', parent });

      await expect(service.login({ username: 'x', password: 'pw', ...device })).resolves.toEqual({ kind: 'role_required' });
      expect(repo.createSession).not.toHaveBeenCalled();
    });

    it('checks only the requested role when one is given', async () => {
      parentService.authenticate.mockResolvedValue({ kind: 'ok', parent });

      const result = await service.login({ username: 'x', password: 'pw', role: 'parent', ...device });

      expect(studentService.authenticate).not.toHaveBeenCalled();
      expect(result.user.role).toBe('parent');
    });

    it('reports inactive accounts and wrong passwords without creating a session', async () => {
      studentService.authenticate.mockResolvedValue({ kind: 'inactive' });
      await expect(service.login({ username: 'x', password: 'pw', ...device })).resolves.toEqual({ kind: 'inactive' });

      studentService.authenticate.mockResolvedValue({ kind: 'invalid' });
      await expect(service.login({ username: 'x', password: 'bad', ...device })).resolves.toEqual({ kind: 'invalid' });
      expect(repo.createSession).not.toHaveBeenCalled();
    });
  });

  // @MOB-023
  describe('refresh', () => {
    it('rotates the token: marks the old one used and issues a new pair', async () => {
      repo.findRefreshTokenForUpdate.mockResolvedValue(futureToken());
      studentService.getStudent.mockResolvedValue({ ...student, is_frozen: true });

      const result = await service.refresh('old-token');

      expect(repo.findRefreshTokenForUpdate).toHaveBeenCalledWith('tx', service.hashToken('old-token'));
      expect(repo.markTokenUsed).toHaveBeenCalledWith('tx', 50);
      expect(repo.touchSession).toHaveBeenCalledWith('tx', 9);
      expect(result.kind).toBe('ok');
      expect(result.refresh_token).not.toBe('old-token');
      expect(verifyToken(result.access_token)).toMatchObject({ id: 7, sid: 9, is_frozen: true });
    });

    it('revokes the whole session when a used token comes back', async () => {
      repo.findRefreshTokenForUpdate.mockResolvedValue(futureToken({ used_at: new Date() }));

      await expect(service.refresh('stolen')).resolves.toEqual({ kind: 'reused' });
      expect(repo.revokeSession).toHaveBeenCalledWith('tx', 9);
      expect(repo.insertRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects unknown, revoked and expired tokens', async () => {
      repo.findRefreshTokenForUpdate.mockResolvedValueOnce(null);
      await expect(service.refresh('x')).resolves.toEqual({ kind: 'invalid' });

      repo.findRefreshTokenForUpdate.mockResolvedValueOnce(futureToken({ session_revoked_at: new Date() }));
      await expect(service.refresh('x')).resolves.toEqual({ kind: 'invalid' });

      repo.findRefreshTokenForUpdate.mockResolvedValueOnce(futureToken({ expires_at: new Date(Date.now() - 1000) }));
      await expect(service.refresh('x')).resolves.toEqual({ kind: 'expired' });
      expect(repo.insertRefreshToken).not.toHaveBeenCalled();
    });

    it('ends the session when the account is no longer active', async () => {
      repo.findRefreshTokenForUpdate.mockResolvedValue(futureToken({ user_type: 'parent', user_id: 11 }));
      parentService.getParent.mockResolvedValue({ ...parent, status: 'Inactive' });

      await expect(service.refresh('x')).resolves.toEqual({ kind: 'inactive' });
      expect(repo.revokeSession).toHaveBeenCalledWith('tx', 9);
    });
  });

  // @MOB-023
  it('logout revokes the session of a known token and ignores unknown ones', async () => {
    repo.findRefreshTokenForUpdate.mockResolvedValueOnce(futureToken());
    await service.logout('t');
    expect(repo.revokeSession).toHaveBeenCalledWith('tx', 9);

    repo.revokeSession.mockClear();
    repo.findRefreshTokenForUpdate.mockResolvedValueOnce(null);
    await expect(service.logout('unknown')).resolves.toEqual({ kind: 'ok' });
    expect(repo.revokeSession).not.toHaveBeenCalled();
  });

  // @MOB-023
  it('me returns the current profile, or null for a removed account', async () => {
    studentService.getStudent.mockResolvedValueOnce({ ...student, class_name: 'B1' });
    await expect(service.me({ userType: 'student', id: 7 })).resolves.toMatchObject({ role: 'student', class_name: 'B1' });

    parentService.getParent.mockResolvedValueOnce(parent);
    await expect(service.me({ userType: 'parent', id: 11 })).resolves.toMatchObject({ role: 'parent', phone: '+998' });

    studentService.getStudent.mockResolvedValueOnce(null);
    await expect(service.me({ userType: 'student', id: 7 })).resolves.toBeNull();
  });

  // @MOB-023
  it('lists devices with the current one marked and revokes only the user own sessions', async () => {
    repo.listActiveSessions.mockResolvedValue([{ session_id: 9 }, { session_id: 10 }]);
    await expect(service.listDevices({ userType: 'parent', id: 11, sid: 10 })).resolves.toEqual([
      { session_id: 9, is_current: false },
      { session_id: 10, is_current: true },
    ]);

    repo.findUserSession.mockResolvedValueOnce(null);
    await expect(service.revokeDevice({ userType: 'parent', id: 11 }, 99)).resolves.toBe(false);
    expect(repo.revokeSession).not.toHaveBeenCalled();

    repo.findUserSession.mockResolvedValueOnce({ session_id: 9 });
    await expect(service.revokeDevice({ userType: 'parent', id: 11 }, 9)).resolves.toBe(true);
    expect(repo.revokeSession).toHaveBeenCalledWith('tx', 9);
  });
});
