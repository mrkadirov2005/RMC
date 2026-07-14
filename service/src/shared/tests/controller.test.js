jest.mock('../tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const { getScopedCenterId } = require('../tenant');
const { getCenterScope, getTeacherScope, sendScopeError } = require('../controller');

describe('shared controller helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a scoped center and teacher id for teacher requests', () => {
    getScopedCenterId.mockReturnValue({ centerId: 7, isGlobal: false });

    const scope = getCenterScope({ user: { userType: 'teacher', id: 42 } });

    expect(scope).toEqual({ ok: true, centerId: 7, isGlobal: false, teacherId: 42 });
    expect(getTeacherScope({ user: { userType: 'teacher', id: 42 } })).toBe(42);
  });

  it('rejects requests with no center and no global scope', () => {
    getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });

    const scope = getCenterScope({ user: { userType: 'superuser' } });

    expect(scope).toEqual({ ok: false, status: 403, body: { error: 'Center scope required.' } });
  });

  it('rejects global owner actions that require a concrete center', () => {
    getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });

    const scope = getCenterScope({ user: { userType: 'superuser', role: 'owner' } }, { requireConcreteCenter: true });

    expect(scope).toEqual({ ok: false, status: 400, body: { error: 'center_id is required for superuser actions.' } });
  });

  it('sends scope errors and returns true when a response was written', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));

    const sent = sendScopeError({ status }, { ok: false, status: 403, body: { error: 'Center scope required.' } });

    expect(sent).toBe(true);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Center scope required.' });
  });
});
