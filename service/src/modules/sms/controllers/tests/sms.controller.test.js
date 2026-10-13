jest.mock('../../services/sms.service', () => ({
  sendPaymentSms: jest.fn(async () => ({ queued: 1 })),
  sendAttendanceSms: jest.fn(async () => ({ queued: 1 })),
  getStatus: jest.fn(),
  listMessages: jest.fn(async () => ({ rows: [] })),
  sendTest: jest.fn(),
  listAttendanceSent: jest.fn(async () => []),
  senderNameOf: jest.fn(async (user) => (user.userType === 'teacher' ? 'Ibrohim M' : 'Admin Aka')),
}));
jest.mock('../../../../shared/tenant', () => ({ getScopedCenterId: jest.fn(() => ({ centerId: 4, isGlobal: false })) }));

const controller = require('../sms.controller');
const service = require('../../services/sms.service');

const response = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('sms controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets only admins send payment SMS', async () => {
    const res = response();
    await controller.sendPaymentSms({ user: { id: 7, userType: 'teacher' }, body: { type: 'waiting', student_ids: [1] } }, res);
    expect(res.status).toHaveBeenCalledWith(403);

    const ok = response();
    await controller.sendPaymentSms({ user: { id: 2, userType: 'superuser' }, body: { type: 'waiting', student_ids: [1, '2', 0], from: '2026-10-01', to: '2026-10-31' } }, ok);
    expect(service.sendPaymentSms).toHaveBeenCalledWith(expect.objectContaining({ type: 'waiting', studentIds: [1, 2], centerId: 4, senderName: 'Admin Aka' }));
    expect(ok.json).toHaveBeenCalledWith({ queued: 1 });
  });

  it('rejects an unknown payment message type', async () => {
    const res = response();
    await controller.sendPaymentSms({ user: { id: 2, userType: 'superuser' }, body: { type: 'other', student_ids: [1] } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("keeps a teacher's attendance SMS to their own groups", async () => {
    const res = response();
    await controller.sendAttendanceSms({ user: { id: 7, userType: 'teacher' }, body: { items: [{ student_id: 1, class_id: 3 }] } }, res);
    expect(service.sendAttendanceSms).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 7, centerId: 4, senderName: 'Ibrohim M' }));
  });

  it('shows the message list to the owner only', async () => {
    const admin = response();
    await controller.listMessages({ user: { id: 2, userType: 'superuser', role: 'admin' }, query: {} }, admin);
    expect(admin.status).toHaveBeenCalledWith(403);
    const owner = response();
    await controller.listMessages({ user: { id: 1, userType: 'superuser', role: 'owner' }, query: { kind: 'attendance' } }, owner);
    expect(service.listMessages).toHaveBeenCalledWith({ kind: 'attendance' });
  });
});
