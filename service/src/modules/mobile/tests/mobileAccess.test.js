jest.mock('../repositories/mobileSession.repository', () => ({ findActiveSession: jest.fn() }));

const repo = require('../repositories/mobileSession.repository');
const { requireMobileRole, requireActiveMobileSession, pageParams, paged } = require('../mobileAccess');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('mobile access helpers', () => {
  // @MOB-020
  it('requireMobileRole lets only the named roles through, never an owner', () => {
    const next = jest.fn();
    const guard = requireMobileRole('parent');

    guard({ user: { userType: 'parent' } }, createResponse(), next);
    expect(next).toHaveBeenCalledTimes(1);

    const res = createResponse();
    guard({ user: { userType: 'superuser', role: 'owner' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).toHaveBeenCalledTimes(1);
  });

  // @MOB-023
  describe('requireActiveMobileSession', () => {
    beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));

    it('skips tokens without a mobile session', async () => {
      const next = jest.fn();
      await requireActiveMobileSession({ user: { id: 1 } }, createResponse(), next);
      expect(next).toHaveBeenCalled();
      expect(repo.findActiveSession).not.toHaveBeenCalled();
    });

    it('passes an active session that belongs to the token user', async () => {
      repo.findActiveSession.mockResolvedValue({ user_type: 'student', user_id: 7 });
      const next = jest.fn();
      await requireActiveMobileSession({ user: { id: 7, userType: 'student', sid: 3 } }, createResponse(), next);
      expect(next).toHaveBeenCalled();
    });

    it.each([
      ['revoked', null],
      ['owned by someone else', { user_type: 'student', user_id: 8 }],
    ])('rejects a session that is %s', async (_label, session) => {
      repo.findActiveSession.mockResolvedValue(session);
      const res = createResponse();
      const next = jest.fn();
      await requireActiveMobileSession({ user: { id: 7, userType: 'student', sid: 3 } }, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SESSION_REVOKED' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('answers 500 when the check fails', async () => {
      repo.findActiveSession.mockRejectedValue(new Error('db'));
      const res = createResponse();
      await requireActiveMobileSession({ user: { id: 7, sid: 3 } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // @MOB-020
  it('pageParams defaults to page 1 of 20 and caps the page size at 100', () => {
    expect(pageParams({})).toEqual({ page: 1, pageSize: 20, offset: 0 });
    expect(pageParams({ page: '3', page_size: '500' })).toEqual({ page: 3, pageSize: 100, offset: 200 });
    expect(pageParams({ page: '-2', page_size: 'x' })).toEqual({ page: 1, pageSize: 20, offset: 0 });
  });

  it('paged slices rows and reports the total', () => {
    expect(paged([1, 2, 3, 4, 5], 2, 2)).toEqual({ items: [3, 4], page: 2, page_size: 2, total: 5 });
  });
});
