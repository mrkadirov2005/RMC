const { requirePermission, requirePermissions, requireOwnership, canAccessStudentData } = require('../rbac');

const response = () => {
  const res = { json: jest.fn() };
  res.status = jest.fn(() => res);
  return res;
};

describe('fine-grained RBAC', () => {
  test('single permission supports explicit staff permission and owner bypass', () => {
    const middleware = requirePermission('CRUD_STUDENT');
    for (const user of [
      { userType: 'superuser', permissions: ['CRUD_STUDENT'] },
      { userType: 'teacher', roles: ['CRUD_STUDENT'] },
      { userType: 'superuser', role: 'owner' },
    ]) {
      const next = jest.fn();
      middleware({ user }, response(), next);
      expect(next).toHaveBeenCalled();
    }
  });

  test('single permission rejects anonymous and unpermitted users', () => {
    const middleware = requirePermission('CRUD_STUDENT');
    const anonymous = response();
    middleware({}, anonymous, jest.fn());
    expect(anonymous.status).toHaveBeenCalledWith(401);
    const denied = response();
    middleware({ user: { userType: 'teacher', permissions: [] } }, denied, jest.fn());
    expect(denied.status).toHaveBeenCalledWith(403);
  });

  test('multiple permissions distinguish any from all', () => {
    const user = { userType: 'superuser', permissions: ['A'] };
    const anyNext = jest.fn();
    requirePermissions(['A', 'B'])({ user }, response(), anyNext);
    expect(anyNext).toHaveBeenCalled();
    const denied = response();
    requirePermissions(['A', 'B'], true)({ user }, denied, jest.fn());
    expect(denied.status).toHaveBeenCalledWith(403);
  });

  test('resource ownership and student-data access enforce self IDs', () => {
    const ownershipNext = jest.fn();
    requireOwnership('studentId')({ user: { id: 7, userType: 'student' }, params: { studentId: '7' } }, response(), ownershipNext);
    expect(ownershipNext).toHaveBeenCalled();
    const deniedOwnership = response();
    requireOwnership('studentId')({ user: { id: 7, userType: 'student' }, params: { studentId: '8' } }, deniedOwnership, jest.fn());
    expect(deniedOwnership.status).toHaveBeenCalledWith(403);

    const accessNext = jest.fn();
    canAccessStudentData()({ user: { id: 7, userType: 'student' }, params: { id: '7' } }, response(), accessNext);
    expect(accessNext).toHaveBeenCalled();
  });
});
