const frozenRows = jest.fn();

jest.mock('../../db/pool', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({ limit: frozenRows })),
      })),
    })),
  },
}));
jest.mock('../../db/schema', () => ({
  students: { isFrozen: 'is_frozen', studentId: 'student_id', deletedAt: 'deleted_at' },
}));
jest.mock('drizzle-orm', () => ({
  and: jest.fn((...values) => values),
  eq: jest.fn((...values) => values),
  isNull: jest.fn((value) => value),
}));

const jwt = require('jsonwebtoken');
const {
  generateToken,
  generateTokenWithExpiry,
  generatePaymentToken,
  verifyToken,
  requireAuth,
  requireRole,
  requireOwner,
  requireMuzaffarHardDelete,
  requireSelfOrAdmin,
  resolveJwtSecret,
} = require('../auth');

const response = () => {
  const res = { json: jest.fn() };
  res.status = jest.fn(() => res);
  return res;
};

describe('authentication middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    frozenRows.mockResolvedValue([{ is_frozen: false }]);
  });

  test('generates verifiable normal, custom-expiry, and payment tokens', () => {
    const payload = { id: 9, username: 'teacher', userType: 'teacher', center_id: 3 };
    expect(verifyToken(generateToken(payload))).toMatchObject(payload);
    expect(verifyToken(generateTokenWithExpiry(payload, '2h'))).toMatchObject(payload);
    expect(verifyToken(generatePaymentToken({ ...payload, payment_access: true }))).toMatchObject({
      ...payload,
      payment_access: true,
    });
  });

  test('production configuration refuses the development fallback secret', () => {
    expect(() => resolveJwtSecret('production', '')).toThrow('JWT_SECRET must be configured');
    expect(resolveJwtSecret('production', 'configured-secret')).toBe('configured-secret');
    expect(resolveJwtSecret('test', '')).toBeTruthy();
  });

  test.each([undefined, 'Basic abc', 'Bearer '])('rejects a missing or malformed bearer header: %s', async (authorization) => {
    const res = response();
    const next = jest.fn();
    await requireAuth({ headers: { authorization }, method: 'GET' }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects invalid and expired tokens with distinct messages', async () => {
    const invalidRes = response();
    await requireAuth({ headers: { authorization: 'Bearer invalid' }, method: 'GET' }, invalidRes, jest.fn());
    expect(invalidRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Invalid') }));

    const expired = jwt.sign({ id: 1, userType: 'student' }, require('../auth').JWT_SECRET, { expiresIn: -1 });
    const expiredRes = response();
    await requireAuth({ headers: { authorization: `Bearer ${expired}` }, method: 'GET' }, expiredRes, jest.fn());
    expect(expiredRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('expired') }));
  });

  test('attaches a valid user and permits reads without a frozen lookup', async () => {
    const req = { headers: { authorization: `Bearer ${generateToken({ id: 4, userType: 'student' })}` }, method: 'GET' };
    const next = jest.fn();
    await requireAuth(req, response(), next);
    expect(req.user).toMatchObject({ id: 4, userType: 'student' });
    expect(frozenRows).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test.each(['POST', 'PUT', 'PATCH', 'DELETE'])('blocks frozen student %s requests with 423', async (method) => {
    frozenRows.mockResolvedValue([{ is_frozen: true }]);
    const res = response();
    await requireAuth({
      headers: { authorization: `Bearer ${generateToken({ id: 4, userType: 'student' })}` },
      method,
    }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(423);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'STUDENT_ACCOUNT_FROZEN' }));
  });

  test('permits student writes when the active database record is not frozen', async () => {
    const next = jest.fn();
    await requireAuth({
      headers: { authorization: `Bearer ${generateToken({ id: 4, userType: 'student' })}` },
      method: 'POST',
    }, response(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('role and ownership middleware', () => {
  test('requireRole handles anonymous, allowed, denied, and owner-bypass users', () => {
    const middleware = requireRole('teacher');
    const anonymous = response();
    middleware({}, anonymous, jest.fn());
    expect(anonymous.status).toHaveBeenCalledWith(401);

    const allowedNext = jest.fn();
    middleware({ user: { userType: 'teacher' } }, response(), allowedNext);
    expect(allowedNext).toHaveBeenCalled();

    const denied = response();
    middleware({ user: { userType: 'student' } }, denied, jest.fn());
    expect(denied.status).toHaveBeenCalledWith(403);

    const ownerNext = jest.fn();
    middleware({ user: { userType: 'superuser', role: 'OWNER' } }, response(), ownerNext);
    expect(ownerNext).toHaveBeenCalled();
  });

  test('requireOwner allows only an owner superuser', () => {
    const next = jest.fn();
    requireOwner({ user: { userType: 'superuser', role: 'owner' } }, response(), next);
    expect(next).toHaveBeenCalled();
    const denied = response();
    requireOwner({ user: { userType: 'superuser', role: 'admin' } }, denied, jest.fn());
    expect(denied.status).toHaveBeenCalledWith(403);
  });

  test('hard delete requires the named owner identity', () => {
    const next = jest.fn();
    requireMuzaffarHardDelete({ user: { userType: 'superuser', role: 'owner', username: 'Muzaffar' } }, response(), next);
    expect(next).toHaveBeenCalled();
    const denied = response();
    requireMuzaffarHardDelete({ user: { userType: 'superuser', role: 'owner', username: 'other' } }, denied, jest.fn());
    expect(denied.status).toHaveBeenCalledWith(403);
  });

  test('self access rejects a different student while staff bypass it', () => {
    const middleware = requireSelfOrAdmin('studentId');
    const denied = response();
    middleware({ user: { id: 2, userType: 'student' }, params: { studentId: '3' } }, denied, jest.fn());
    expect(denied.status).toHaveBeenCalledWith(403);
    const selfNext = jest.fn();
    middleware({ user: { id: 2, userType: 'student' }, params: { studentId: '2' } }, response(), selfNext);
    expect(selfNext).toHaveBeenCalled();
    const staffNext = jest.fn();
    middleware({ user: { id: 8, userType: 'teacher' }, params: { studentId: '2' } }, response(), staffNext);
    expect(staffNext).toHaveBeenCalled();
  });
});
