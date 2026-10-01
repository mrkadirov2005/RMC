jest.mock('../../services/superuser.service', () => ({
  listSuperusers: jest.fn(),
  getSuperuser: jest.fn(),
  createSuperuser: jest.fn(),
  updateSuperuser: jest.fn(),
  deleteSuperuser: jest.fn(),
  authenticate: jest.fn(),
  changePassword: jest.fn(),
}));

jest.mock('../../../../middleware/auth', () => ({
  generateToken: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const superuserController = require('../superuser.controller');
const superuserService = require('../../services/superuser.service');
const { generateToken } = require('../../../../middleware/auth');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('superusers controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 3, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('getAllSuperusers', () => {
    it('lists the superusers visible in the calling center', async () => {
      const res = createResponse();
      superuserService.listSuperusers.mockResolvedValue([{ superuser_id: 1 }]);

      await superuserController.getAllSuperusers({ user: { userType: 'superuser' } }, res);

      expect(superuserService.listSuperusers).toHaveBeenCalledWith(3);
      expect(res.json).toHaveBeenCalledWith([{ superuser_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      superuserService.listSuperusers.mockRejectedValue(new Error('offline'));

      await superuserController.getAllSuperusers({ user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Superuserlarni yuklab bo'lmadi", details: 'offline' });
    });
  });

  describe('getSuperuserById', () => {
    it('returns the superuser', async () => {
      const res = createResponse();
      superuserService.getSuperuser.mockResolvedValue({ superuser_id: 4 });

      await superuserController.getSuperuserById({ params: { id: '4' }, user: {} }, res);

      expect(superuserService.getSuperuser).toHaveBeenCalledWith(4, 3);
      expect(res.json).toHaveBeenCalledWith({ superuser_id: 4 });
    });

    it('returns 404 when the superuser is out of scope', async () => {
      const res = createResponse();
      superuserService.getSuperuser.mockResolvedValue(null);

      await superuserController.getSuperuserById({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Superuser topilmadi' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      superuserService.getSuperuser.mockRejectedValue(new Error('bad id'));

      await superuserController.getSuperuserById({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Superuserni yuklab bo'lmadi", details: 'bad id' });
    });
  });

  describe('createSuperuser', () => {
    it.each([
      ['branch_required', 400, { error: "Filial ko'rsatilishi shart. Avval filialni tanlang." }],
      ['username_taken', 400, { error: 'Bu foydalanuvchi nomi allaqachon mavjud' }],
      ['forbidden_role', 403, { error: 'Ega rolini faqat egalar tayinlay oladi.' }],
    ])('maps the %s result to a %d', async (error, status, payload) => {
      const res = createResponse();
      superuserService.createSuperuser.mockResolvedValue({ error });

      await superuserController.createSuperuser({ body: {}, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it('creates the account and returns the new row', async () => {
      const res = createResponse();
      const user = { userType: 'superuser', role: 'owner' };
      superuserService.createSuperuser.mockResolvedValue({ row: { superuser_id: 6 } });

      await superuserController.createSuperuser({ body: { username: 'ada' }, user }, res);

      expect(superuserService.createSuperuser).toHaveBeenCalledWith({ username: 'ada' }, user, 3);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ superuser_id: 6 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      superuserService.createSuperuser.mockRejectedValue(new Error('insert failed'));

      await superuserController.createSuperuser({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Superuserni yaratib bo'lmadi", details: 'insert failed' });
    });
  });

  describe('updateSuperuser', () => {
    it('refuses a non-owner assigning the owner role', async () => {
      const res = createResponse();
      superuserService.updateSuperuser.mockResolvedValue({ error: 'forbidden_role' });

      await superuserController.updateSuperuser({ params: { id: '4' }, body: { role: 'owner' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ega rolini faqat egalar tayinlay oladi.' });
    });

    it('returns 404 when the superuser is out of scope', async () => {
      const res = createResponse();
      superuserService.updateSuperuser.mockResolvedValue({ row: null });

      await superuserController.updateSuperuser({ params: { id: '4' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Superuser topilmadi' });
    });

    it('returns the updated row', async () => {
      const res = createResponse();
      const user = { userType: 'superuser', role: 'owner' };
      superuserService.updateSuperuser.mockResolvedValue({ row: { superuser_id: 4 } });

      await superuserController.updateSuperuser({ params: { id: '4' }, body: { role: 'admin' }, user }, res);

      expect(superuserService.updateSuperuser).toHaveBeenCalledWith(4, { role: 'admin' }, user, 3);
      expect(res.json).toHaveBeenCalledWith({ superuser_id: 4 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      superuserService.updateSuperuser.mockRejectedValue(new Error('conflict'));

      await superuserController.updateSuperuser({ params: { id: '4' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Superuserni yangilab bo'lmadi", details: 'conflict' });
    });
  });

  describe('deleteSuperuser', () => {
    it('refuses a non-owner deleting an owner account', async () => {
      const res = createResponse();
      superuserService.deleteSuperuser.mockResolvedValue({ error: 'forbidden_role' });

      await superuserController.deleteSuperuser({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Ega hisobini faqat egalar o'chira oladi." });
    });

    it('returns 404 when the superuser is out of scope', async () => {
      const res = createResponse();
      superuserService.deleteSuperuser.mockResolvedValue({ row: null });

      await superuserController.deleteSuperuser({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('confirms the deletion', async () => {
      const res = createResponse();
      const user = { role: 'owner' };
      superuserService.deleteSuperuser.mockResolvedValue({ row: { superuser_id: 4 } });

      await superuserController.deleteSuperuser({ params: { id: '4' }, user }, res);

      expect(superuserService.deleteSuperuser).toHaveBeenCalledWith(4, user, 3);
      expect(res.json).toHaveBeenCalledWith({ message: "Superuser muvaffaqiyatli o'chirildi", superuser: { superuser_id: 4 } });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      superuserService.deleteSuperuser.mockRejectedValue(new Error('locked'));

      await superuserController.deleteSuperuser({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Superuserni o'chirib bo'lmadi", details: 'locked' });
    });
  });

  describe('login', () => {
    it.each([
      ['locked', 403, { error: 'Hisob bloklangan' }],
      ['inactive', 403, { error: 'Hisob faol emas' }],
    ])('refuses a %s account', async (kind, status, payload) => {
      const res = createResponse();
      superuserService.authenticate.mockResolvedValue({ kind });

      await superuserController.login({ body: { username: 'ada', password: 'pw' } }, res);

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith(payload);
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('gives the same message for an unknown user and a bad password', async () => {
      const res = createResponse();
      superuserService.authenticate.mockResolvedValue({ kind: 'not_found' });

      await superuserController.login({ body: { username: 'ghost', password: 'pw' } }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Foydalanuvchi nomi yoki parol noto'g'ri" });
    });

    it('issues a token carrying the role and permissions, and returns no password fields', async () => {
      const res = createResponse();
      superuserService.authenticate.mockResolvedValue({
        kind: 'ok',
        superuser: {
          superuser_id: 2,
          username: 'ada',
          email: 'ada@example.com',
          first_name: 'Ada',
          last_name: 'Lovelace',
          role: 'owner',
          permissions: ['all'],
          branch_id: 5,
          center_id: 3,
          can_hard_delete: 1,
          password_hash: 'secret',
        },
      });
      generateToken.mockReturnValue('signed-token');

      await superuserController.login({ body: { username: 'ada', password: 'pw' } }, res);

      expect(generateToken).toHaveBeenCalledWith({
        id: 2,
        username: 'ada',
        email: 'ada@example.com',
        userType: 'superuser',
        role: 'owner',
        permissions: ['all'],
        branch_id: 5,
        center_id: 3,
        can_hard_delete: true,
      });
      const body = res.json.mock.calls[0][0];
      expect(body.token).toBe('signed-token');
      expect(body.superuser).not.toHaveProperty('password_hash');
      expect(body.superuser.can_hard_delete).toBe(true);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      superuserService.authenticate.mockRejectedValue(new Error('auth down'));

      await superuserController.login({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Tizimga kirib bo'lmadi", details: 'auth down' });
    });
  });

  describe('changePassword', () => {
    it('returns 404 when the account does not exist', async () => {
      const res = createResponse();
      superuserService.changePassword.mockResolvedValue({ ok: false, reason: 'not_found' });

      await superuserController.changePassword({ params: { id: '4' }, body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Superuser topilmadi' });
    });

    it('refuses a wrong current password', async () => {
      const res = createResponse();
      superuserService.changePassword.mockResolvedValue({ ok: false, reason: 'bad_password' });

      await superuserController.changePassword({ params: { id: '4' }, body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Joriy parol noto'g'ri" });
    });

    it('confirms a successful change without echoing either password', async () => {
      const res = createResponse();
      superuserService.changePassword.mockResolvedValue({ ok: true });

      await superuserController.changePassword({
        params: { id: '4' },
        body: { old_password: 'old', new_password: 'new' },
      }, res);

      expect(superuserService.changePassword).toHaveBeenCalledWith(4, 'old', 'new');
      expect(res.json).toHaveBeenCalledWith({ message: "Parol muvaffaqiyatli o'zgartirildi" });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      superuserService.changePassword.mockRejectedValue(new Error('hash failed'));

      await superuserController.changePassword({ params: { id: '4' }, body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Parolni o'zgartirib bo'lmadi", details: 'hash failed' });
    });
  });
});
