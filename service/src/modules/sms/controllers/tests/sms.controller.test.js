jest.mock('../../services/sms.service', () => ({
  sendPaymentSms: jest.fn(async () => ({ queued: 1 })),
  sendAttendanceSms: jest.fn(async () => ({ queued: 1 })),
  getStatus: jest.fn(),
  listMessages: jest.fn(async () => ({ rows: [] })),
  sendTest: jest.fn(),
  listAttendanceSent: jest.fn(async () => []),
  senderNameOf: jest.fn(async (user) => (user.userType === 'teacher' ? 'Ibrohim M' : 'Admin Aka')),
}));
jest.mock('../../services/smsTemplates.service', () => ({
  listTemplates: jest.fn(async () => ({ templates: [], kinds: [] })),
  createTemplate: jest.fn(async (body) => ({ template_id: 1, ...body })),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  setTemplateActive: jest.fn(async (id, active) => ({ template_id: id, is_active: active })),
}));
jest.mock('../../../../shared/tenant', () => ({ getScopedCenterId: jest.fn(() => ({ centerId: 4, isGlobal: false })) }));

const controller = require('../sms.controller');
const service = require('../../services/sms.service');
const templates = require('../../services/smsTemplates.service');

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

  it('lets only the owner manage templates and passes on validation errors', async () => {
    const owner = { id: 1, userType: 'superuser', role: 'owner' };
    const admin = { id: 2, userType: 'superuser', role: 'admin' };

    const denied = response();
    await controller.createTemplate({ user: admin, body: { kind: 'attendance', name: 'X', body: 'Y' } }, denied);
    expect(denied.status).toHaveBeenCalledWith(403);
    expect(templates.createTemplate).not.toHaveBeenCalled();

    const created = response();
    await controller.createTemplate({ user: owner, body: { kind: 'attendance', name: 'X', body: 'Y' } }, created);
    expect(created.status).toHaveBeenCalledWith(201);

    templates.updateTemplate.mockRejectedValueOnce(Object.assign(new Error('Shablon matnini kiriting.'), { statusCode: 400 }));
    const invalid = response();
    await controller.updateTemplate({ user: owner, params: { id: '3' }, body: {} }, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);
    expect(invalid.json).toHaveBeenCalledWith({ error: 'Shablon matnini kiriting.' });

    const badId = response();
    await controller.deleteTemplate({ user: owner, params: { id: 'abc' } }, badId);
    expect(badId.status).toHaveBeenCalledWith(400);

    const activated = response();
    await controller.setTemplateActive({ user: owner, params: { id: '3' }, body: { active: true } }, activated);
    expect(templates.setTemplateActive).toHaveBeenCalledWith(3, true);
  });
});
