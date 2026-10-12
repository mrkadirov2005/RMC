jest.mock('../../services/lessonControl.service', () => ({
  discipline: jest.fn(async () => ({ month: '2026-10', teachers: [{ teacher_id: 7, summary: { due: 3, late: 1, missing: 1, points: -10, bonus: 0 } }] })),
  requestReschedule: jest.fn(),
  addDayOff: jest.fn(),
  decideReschedule: jest.fn(),
}));
jest.mock('../../../payments/services/payment.service', () => ({ resolveCashierName: jest.fn(async () => 'Admin') }));
jest.mock('../../../../shared/tenant', () => ({ getScopedCenterId: jest.fn(() => ({ centerId: 4, isGlobal: false })) }));

const controller = require('../lessonControl.controller');
const service = require('../../services/lessonControl.service');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('lesson control access', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows KPI points to the owner but not to admins', async () => {
    const owner = createResponse();
    await controller.getDiscipline({ query: {}, user: { userType: 'superuser', role: 'owner' } }, owner);
    expect(owner.json.mock.calls[0][0].teachers[0].summary.points).toBe(-10);
    const admin = createResponse();
    await controller.getDiscipline({ query: {}, user: { userType: 'superuser', role: 'admin' } }, admin);
    expect(admin.json.mock.calls[0][0].teachers[0].summary.points).toBeUndefined();
    expect(admin.json.mock.calls[0][0].teachers[0].summary.late).toBe(1);
  });

  it('limits a teacher to their own record', async () => {
    await controller.getDiscipline({ query: { teacher_id: '99' }, user: { userType: 'teacher', id: 7 } }, createResponse());
    expect(service.discipline).toHaveBeenCalledWith({ teacher_id: '99' }, 4, 7);
  });

  it('lets only teachers ask for a move and only admins decide or add days off', async () => {
    const admin = { userType: 'superuser', role: 'admin', id: 1 };
    const asked = createResponse();
    await controller.requestReschedule({ body: {}, user: admin }, asked);
    expect(asked.status).toHaveBeenCalledWith(403);
    for (const handler of ['decideReschedule', 'addDayOff']) {
      const res = createResponse();
      await controller[handler]({ params: { id: '1' }, body: {}, user: { userType: 'teacher', id: 7 } }, res);
      expect(res.status).toHaveBeenCalledWith(403);
    }
    expect(service.decideReschedule).not.toHaveBeenCalled();
    expect(service.addDayOff).not.toHaveBeenCalled();
  });
});
