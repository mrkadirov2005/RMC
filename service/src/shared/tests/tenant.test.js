const { isGlobalUser, isCenterAdmin, getScopedCenterId, requireCenterId } = require('../tenant');

const response = () => {
  const res = { json: jest.fn() };
  res.status = jest.fn(() => res);
  return res;
};

describe('tenant scope', () => {
  test('identifies owner and center-admin roles case-insensitively', () => {
    expect(isGlobalUser({ userType: 'superuser', role: 'OWNER' })).toBe(true);
    expect(isCenterAdmin({ userType: 'superuser', role: 'Admin' })).toBe(true);
    expect(isGlobalUser({ userType: 'teacher', role: 'owner' })).toBe(false);
  });

  test('uses authenticated center before headers for non-owners', () => {
    expect(getScopedCenterId({
      user: { userType: 'superuser', role: 'admin', center_id: 5 },
      headers: { 'x-center-id': '99' },
    })).toEqual({ centerId: 5, isGlobal: false });
  });

  test('lets owners select scope from query, body, params, or headers', () => {
    const owner = { userType: 'superuser', role: 'owner' };
    expect(getScopedCenterId({ user: owner, query: { center_id: '7' } })).toEqual({ centerId: 7, isGlobal: false });
    expect(getScopedCenterId({ user: owner, body: { branchId: 8 } })).toEqual({ centerId: 8, isGlobal: false });
    expect(getScopedCenterId({ user: owner, headers: { 'x-center-id': '9' } })).toEqual({ centerId: 9, isGlobal: false });
  });

  test('returns global owner scope when absent and rejects invalid IDs', () => {
    const owner = { userType: 'superuser', role: 'owner' };
    expect(getScopedCenterId({ user: owner })).toEqual({ centerId: null, isGlobal: true });
    expect(getScopedCenterId({ user: owner, query: { center_id: '-1' } })).toEqual({ centerId: null, isGlobal: true });
  });

  test('requires a concrete positive center', () => {
    expect(requireCenterId(response(), 4)).toBe(true);
    const res = response();
    expect(requireCenterId(res, null)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
