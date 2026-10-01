jest.mock('../../services/parent.service', () => ({
  listParents: jest.fn(),
  getParent: jest.fn(),
  createParent: jest.fn(),
  updateParent: jest.fn(),
  deleteParent: jest.fn(),
  assignStudent: jest.fn(),
  authenticate: jest.fn(),
  getMyStudents: jest.fn(),
  getMyStudentPayments: jest.fn(),
  getMyStudentAttendance: jest.fn(),
  getMyStudentGrades: jest.fn(),
  getMyStudentTests: jest.fn(),
}));

jest.mock('../../../../middleware/auth', () => ({
  generateToken: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const parentController = require('../parent.controller');
const parentService = require('../../services/parent.service');
const { generateToken } = require('../../../../middleware/auth');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('parents controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 2, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to the tenant-bound handlers', () => {
    const handlers = [
      ['getAllParents', {}],
      ['getParentById', { params: { id: '1' } }],
      ['createParent', { body: {} }],
      ['updateParent', { params: { id: '1' }, body: {} }],
      ['deleteParent', { params: { id: '1' } }],
      ['assignStudent', { body: {} }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await parentController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Markaz tanlanishi shart.' });
    });

    it('createParent makes a superuser name a center', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await parentController.createParent({ body: {}, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    });
  });

  describe('getAllParents', () => {
    it('lists parents in the scoped center', async () => {
      const res = createResponse();
      parentService.listParents.mockResolvedValue([{ parent_id: 1 }]);

      await parentController.getAllParents({ user: { userType: 'admin' } }, res);

      expect(parentService.listParents).toHaveBeenCalledWith(2);
      expect(res.json).toHaveBeenCalledWith([{ parent_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      parentService.listParents.mockRejectedValue(new Error('offline'));

      await parentController.getAllParents({ user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Ota-onalarni yuklab bo'lmadi", details: 'offline' });
    });
  });

  describe('getParentById', () => {
    it('returns the parent', async () => {
      const res = createResponse();
      parentService.getParent.mockResolvedValue({ parent_id: 5 });

      await parentController.getParentById({ params: { id: '5' }, user: {} }, res);

      expect(parentService.getParent).toHaveBeenCalledWith(5, 2);
      expect(res.json).toHaveBeenCalledWith({ parent_id: 5 });
    });

    it('returns 404 when the parent is out of scope', async () => {
      const res = createResponse();
      parentService.getParent.mockResolvedValue(null);

      await parentController.getParentById({ params: { id: '5' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ota-ona topilmadi' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      parentService.getParent.mockRejectedValue(new Error('bad id'));

      await parentController.getParentById({ params: { id: '5' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Ota-onani yuklab bo'lmadi", details: 'bad id' });
    });
  });

  describe('createParent', () => {
    it('stamps the scoped center and returns the created row', async () => {
      const res = createResponse();
      parentService.createParent.mockResolvedValue({ row: { parent_id: 9 } });

      await parentController.createParent({ body: { first_name: 'Ada', center_id: 999 }, user: { userType: 'admin' } }, res);

      expect(parentService.createParent).toHaveBeenCalledWith({ first_name: 'Ada', center_id: 2 });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Ota-ona yaratildi', parent: { parent_id: 9 } });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      parentService.createParent.mockRejectedValue(new Error('duplicate'));

      await parentController.createParent({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Ota-onani yaratib bo'lmadi", details: 'duplicate' });
    });
  });

  describe('updateParent', () => {
    it('returns the updated parent', async () => {
      const res = createResponse();
      parentService.updateParent.mockResolvedValue({ parent_id: 5 });

      await parentController.updateParent({ params: { id: '5' }, body: { email: 'a@b.c' }, user: {} }, res);

      expect(parentService.updateParent).toHaveBeenCalledWith(5, { email: 'a@b.c' }, 2);
      expect(res.json).toHaveBeenCalledWith({ message: 'Ota-ona yangilandi', parent: { parent_id: 5 } });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      parentService.updateParent.mockResolvedValue(null);

      await parentController.updateParent({ params: { id: '5' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ota-ona topilmadi' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      parentService.updateParent.mockRejectedValue(new Error('conflict'));

      await parentController.updateParent({ params: { id: '5' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Ota-onani yangilab bo'lmadi", details: 'conflict' });
    });
  });

  describe('deleteParent', () => {
    it('confirms the deletion', async () => {
      const res = createResponse();
      parentService.deleteParent.mockResolvedValue({ parent_id: 5 });

      await parentController.deleteParent({ params: { id: '5' }, user: {} }, res);

      expect(parentService.deleteParent).toHaveBeenCalledWith(5, 2);
      expect(res.json).toHaveBeenCalledWith({ message: "Ota-ona o'chirildi", parent: { parent_id: 5 } });
    });

    it('returns 404 when the parent is out of scope', async () => {
      const res = createResponse();
      parentService.deleteParent.mockResolvedValue(null);

      await parentController.deleteParent({ params: { id: '5' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      parentService.deleteParent.mockRejectedValue(new Error('locked'));

      await parentController.deleteParent({ params: { id: '5' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Ota-onani o'chirib bo'lmadi", details: 'locked' });
    });
  });

  describe('assignStudent', () => {
    it('refuses a student from another center', async () => {
      const res = createResponse();
      parentService.assignStudent.mockResolvedValue({ error: 'invalid_center' });

      await parentController.assignStudent({ body: { parent_id: 1, student_id: 2 }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "O'quvchi bu markazga tegishli emas." });
    });

    it('confirms the assignment', async () => {
      const res = createResponse();
      parentService.assignStudent.mockResolvedValue({});

      await parentController.assignStudent({ body: { parent_id: 1, student_id: 2 }, user: {} }, res);

      expect(parentService.assignStudent).toHaveBeenCalledWith({ parent_id: 1, student_id: 2 }, 2);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Student assigned to parent' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      parentService.assignStudent.mockRejectedValue(new Error('assign failed'));

      await parentController.assignStudent({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "O'quvchini biriktirib bo'lmadi", details: 'assign failed' });
    });
  });

  describe('parentLogin', () => {
    it('refuses an inactive account with a distinct 403', async () => {
      const res = createResponse();
      parentService.authenticate.mockResolvedValue({ kind: 'inactive' });

      await parentController.parentLogin({ body: { username: 'ada', password: 'pw' } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Parent account is not active' });
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('gives the same message for an unknown user and a bad password', async () => {
      const res = createResponse();
      parentService.authenticate.mockResolvedValue({ kind: 'not_found' });

      await parentController.parentLogin({ body: { username: 'ghost', password: 'pw' } }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Foydalanuvchi nomi yoki parol noto'g'ri" });
    });

    it('issues a parent token and returns a trimmed profile', async () => {
      const res = createResponse();
      parentService.authenticate.mockResolvedValue({
        kind: 'ok',
        parent: {
          parent_id: 11,
          first_name: 'Ada',
          last_name: 'Lovelace',
          email: 'ada@example.com',
          password_hash: 'secret',
        },
      });
      generateToken.mockReturnValue('signed-token');

      await parentController.parentLogin({ body: { username: 'ada', password: 'pw' } }, res);

      expect(parentService.authenticate).toHaveBeenCalledWith('ada', 'pw');
      expect(generateToken).toHaveBeenCalledWith({ id: 11, email: 'ada@example.com', userType: 'parent' });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Tizimga muvaffaqiyatli kirildi',
        token: 'signed-token',
        parent: {
          parent_id: 11,
          first_name: 'Ada',
          last_name: 'Lovelace',
          email: 'ada@example.com',
        },
      });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      parentService.authenticate.mockRejectedValue(new Error('auth down'));

      await parentController.parentLogin({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Tizimga kirib bo'lmadi", details: 'auth down' });
    });
  });

  describe('parent portal reads', () => {
    const portalHandlers = [
      ['getMyStudents', 'getMyStudents', "Ota-ona o'quvchilarini yuklab bo'lmadi"],
      ['getMyStudentPayments', 'getMyStudentPayments', "To'lovlarni yuklab bo'lmadi"],
      ['getMyStudentAttendance', 'getMyStudentAttendance', "Davomatni yuklab bo'lmadi"],
      ['getMyStudentGrades', 'getMyStudentGrades', "Baholarni yuklab bo'lmadi"],
      ['getMyStudentTests', 'getMyStudentTests', "Topshirilgan testlarni yuklab bo'lmadi"],
    ];

    it.each(portalHandlers)('%s reads only the signed-in parent own records', async (handler, method) => {
      const res = createResponse();
      parentService[method].mockResolvedValue([{ student_id: 1 }]);

      await parentController[handler]({ user: { id: 11, userType: 'parent' } }, res);

      expect(parentService[method]).toHaveBeenCalledWith(11);
      expect(res.json).toHaveBeenCalledWith([{ student_id: 1 }]);
    });

    it.each(portalHandlers)('%s reports a service failure as a 500', async (handler, method, message) => {
      const res = createResponse();
      parentService[method].mockRejectedValue(new Error('portal down'));

      await parentController[handler]({ user: { id: 11 } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: message, details: 'portal down' });
    });
  });
});
