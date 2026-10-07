jest.mock('../../services/absenceAlert.service', () => ({
  listAlerts: jest.fn(),
  resolveAlert: jest.fn(),
}));
jest.mock('../../../../shared/tenant', () => ({ getScopedCenterId: jest.fn() }));

const controller = require('../absenceAlert.controller');
const service = require('../../services/absenceAlert.service');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('absence alerts controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 4, isGlobal: false });
  });

  afterEach(() => console.error.mockRestore());

  it('limits a teacher to their own groups', async () => {
    const res = createResponse();
    service.listAlerts.mockResolvedValue([{ student_id: 1 }]);

    await controller.getAlerts({ user: { id: 7, userType: 'teacher' } }, res);

    expect(service.listAlerts).toHaveBeenCalledWith({ centerId: 4, teacherId: 7 });
    expect(res.json).toHaveBeenCalledWith([{ student_id: 1 }]);
  });

  it('shows an admin the whole branch', async () => {
    const res = createResponse();
    service.listAlerts.mockResolvedValue([]);

    await controller.getAlerts({ user: { id: 2, userType: 'superuser', role: 'admin' } }, res);

    expect(service.listAlerts).toHaveBeenCalledWith({ centerId: 4, teacherId: undefined });
  });

  it('resolves an alert with the acting user', async () => {
    const res = createResponse();
    const user = { id: 2, userType: 'superuser', role: 'admin' };
    service.resolveAlert.mockResolvedValue({ resolution: { resolution_id: 5 }, frozen: true });

    await controller.resolveAlert({ body: { student_id: '10', class_id: '1', outcome: 'sick', note: 'Isitma' }, user }, res);

    expect(service.resolveAlert).toHaveBeenCalledWith({ studentId: 10, classId: 1, outcome: 'sick', note: 'Isitma', centerId: 4, actingUser: user });
    expect(res.json).toHaveBeenCalledWith({ resolution: { resolution_id: 5 }, frozen: true });
  });

  it('rejects a bad outcome and a missing alert', async () => {
    const bad = createResponse();
    service.resolveAlert.mockResolvedValueOnce({ error: 'invalid_outcome' });
    await controller.resolveAlert({ body: { student_id: 10, class_id: 1, outcome: 'x' }, user: {} }, bad);
    expect(bad.status).toHaveBeenCalledWith(400);

    const missing = createResponse();
    service.resolveAlert.mockResolvedValueOnce({ error: 'not_found' });
    await controller.resolveAlert({ body: { student_id: 10, class_id: 1, outcome: 'left' }, user: {} }, missing);
    expect(missing.status).toHaveBeenCalledWith(404);
  });

  it('needs a student and a group', async () => {
    const res = createResponse();
    await controller.resolveAlert({ body: { outcome: 'left' }, user: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(service.resolveAlert).not.toHaveBeenCalled();
  });
});
