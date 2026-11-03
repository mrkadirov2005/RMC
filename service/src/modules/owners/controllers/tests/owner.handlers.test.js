jest.mock('../../services/owner.service', () => ({
  listOwners: jest.fn(),
  getOwner: jest.fn(),
  createOwner: jest.fn(),
  updateOwner: jest.fn(),
  deleteOwner: jest.fn(),
  authenticate: jest.fn(),
  changePassword: jest.fn(),
}));

jest.mock('../../../../middleware/auth', () => ({
  generateToken: jest.fn(),
}));

jest.mock('../../repositories/owner.repository', () => ({
  isDeveloper: jest.fn(async () => false),
}));

jest.mock('../../../developer/seal', () => ({
  reseal: jest.fn(async () => undefined),
}));

const controller = require('../owner.controller');
const ownerService = require('../../services/owner.service');
const { generateToken } = require('../../../../middleware/auth');
const ownerRepository = require('../../repositories/owner.repository');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const ownerRow = (overrides = {}) => ({
  owner_id: 1,
  username: 'ada',
  email: 'ada@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  status: 'Active',
  password_hash: 'secret',
  ...overrides,
});

describe('owners controller handlers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'test';
    delete process.env.OWNER_INVITE_KEY;
  });

  afterEach(() => {
    console.error.mockRestore();
    process.env = { ...originalEnv };
  });

  describe('getAllOwners', () => {
    it('lists the owners', async () => {
      const res = createResponse();
      ownerService.listOwners.mockResolvedValue([{ owner_id: 1 }]);

      await controller.getAllOwners({}, res);

      expect(res.json).toHaveBeenCalledWith([{ owner_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      ownerService.listOwners.mockRejectedValue(new Error('offline'));

      await controller.getAllOwners({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Egalarni yuklab bo'lmadi", details: 'offline' });
    });
  });

  describe('getOwnerById', () => {
    it('returns the owner', async () => {
      const res = createResponse();
      ownerService.getOwner.mockResolvedValue({ owner_id: 1 });

      await controller.getOwnerById({ params: { id: '1' } }, res);

      expect(ownerService.getOwner).toHaveBeenCalledWith(1, false);
      expect(res.json).toHaveBeenCalledWith({ owner_id: 1 });
    });

    it('returns 404 when the owner does not exist', async () => {
      const res = createResponse();
      ownerService.getOwner.mockResolvedValue(null);

      await controller.getOwnerById({ params: { id: '1' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ega topilmadi' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      ownerService.getOwner.mockRejectedValue(new Error('bad id'));

      await controller.getOwnerById({ params: { id: '1' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Egani yuklab bo'lmadi", details: 'bad id' });
    });
  });

  describe('createOwner', () => {
    const validBody = {
      username: 'ada',
      password: 'Str0ngPassword!',
      email: 'ada@example.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
    };

    it('refuses a body that fails validation', async () => {
      const res = createResponse();

      await controller.createOwner({ body: { username: '' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Kiritilgan ma'lumotlar noto'g'ri" }));
      expect(ownerService.createOwner).not.toHaveBeenCalled();
    });

    it('refuses a username that is already taken', async () => {
      const res = createResponse();
      ownerService.createOwner.mockResolvedValue({ error: 'username_taken' });

      await controller.createOwner({ body: validBody }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Bu foydalanuvchi nomi allaqachon mavjud' });
    });

    it('returns the created owner row', async () => {
      const res = createResponse();
      ownerService.createOwner.mockResolvedValue({ row: { owner_id: 2 } });

      await controller.createOwner({ body: validBody }, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ owner_id: 2 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      ownerService.createOwner.mockRejectedValue(new Error('insert failed'));

      await controller.createOwner({ body: validBody }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Egani yaratib bo'lmadi", details: 'insert failed' });
    });
  });

  describe('updateOwner', () => {
    it('refuses a body that fails validation', async () => {
      const res = createResponse();

      await controller.updateOwner({ params: { id: '1' }, body: { email: 'not-an-email' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ownerService.updateOwner).not.toHaveBeenCalled();
    });

    it('returns the updated owner', async () => {
      const res = createResponse();
      ownerService.updateOwner.mockResolvedValue({ owner_id: 1 });

      await controller.updateOwner({ params: { id: '1' }, body: { first_name: 'Ada' } }, res);

      expect(ownerService.updateOwner).toHaveBeenCalledWith(1, expect.objectContaining({ first_name: 'Ada' }));
      expect(res.json).toHaveBeenCalledWith({ owner_id: 1 });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      ownerService.updateOwner.mockResolvedValue(null);

      await controller.updateOwner({ params: { id: '1' }, body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ega topilmadi' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      ownerService.updateOwner.mockRejectedValue(new Error('conflict'));

      await controller.updateOwner({ params: { id: '1' }, body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Egani yangilab bo'lmadi", details: 'conflict' });
    });
  });

  describe('the developer account', () => {
    it('cannot be edited or removed here', async () => {
      ownerRepository.isDeveloper.mockResolvedValue(true);
      const res = createResponse();

      await controller.updateOwner({ params: { id: '9' }, body: { first_name: 'X' } }, res);
      await controller.deleteOwner({ params: { id: '9' } }, res);

      expect(res.status).toHaveBeenNthCalledWith(1, 409);
      expect(res.status).toHaveBeenNthCalledWith(2, 409);
      expect(ownerService.updateOwner).not.toHaveBeenCalled();
      expect(ownerService.deleteOwner).not.toHaveBeenCalled();
      ownerRepository.isDeveloper.mockResolvedValue(false);
    });
  });

  describe('deleteOwner', () => {
    it('confirms the deletion', async () => {
      const res = createResponse();
      ownerService.deleteOwner.mockResolvedValue({ owner_id: 1 });

      await controller.deleteOwner({ params: { id: '1' } }, res);

      expect(res.json).toHaveBeenCalledWith({ message: "Ega muvaffaqiyatli o'chirildi", owner: { owner_id: 1 } });
    });

    it('returns 404 when the owner does not exist', async () => {
      const res = createResponse();
      ownerService.deleteOwner.mockResolvedValue(null);

      await controller.deleteOwner({ params: { id: '1' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      ownerService.deleteOwner.mockRejectedValue(new Error('locked'));

      await controller.deleteOwner({ params: { id: '1' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Egani o'chirib bo'lmadi", details: 'locked' });
    });
  });

  describe('login', () => {
    const credentials = { username: 'ada', password: 'Str0ngPassword!' };

    it('refuses a body that fails validation', async () => {
      const res = createResponse();

      await controller.login({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ownerService.authenticate).not.toHaveBeenCalled();
    });

    it.each([
      ['locked', 'Hisob bloklangan'],
      ['inactive', 'Hisob faol emas'],
    ])('refuses a %s account', async (kind, message) => {
      const res = createResponse();
      ownerService.authenticate.mockResolvedValue({ kind });

      await controller.login({ body: credentials }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: message });
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('gives the same message for an unknown user and a bad password', async () => {
      const res = createResponse();
      ownerService.authenticate.mockResolvedValue({ kind: 'not_found' });

      await controller.login({ body: credentials }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Foydalanuvchi nomi yoki parol noto'g'ri" });
    });

    it('issues an owner token carrying the hard-delete permission', async () => {
      const res = createResponse();
      ownerService.authenticate.mockResolvedValue({ kind: 'ok', owner: ownerRow({ can_hard_delete: 1 }) });
      generateToken.mockReturnValue('signed-token');

      await controller.login({ body: credentials }, res);

      expect(generateToken).toHaveBeenCalledWith(expect.objectContaining({ role: 'owner', can_hard_delete: true }));
      const body = res.json.mock.calls[0][0];
      expect(body.owner).not.toHaveProperty('password_hash');
      expect(body.owner.can_hard_delete).toBe(true);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      ownerService.authenticate.mockRejectedValue(new Error('auth down'));

      await controller.login({ body: credentials }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Tizimga kirib bo'lmadi", details: 'auth down' });
    });
  });

  describe('changePassword', () => {
    const body = { old_password: 'Str0ngPassword!', new_password: 'Ev3nStronger!' };

    it("refuses to change another owner's password", async () => {
      const res = createResponse();

      await controller.changePassword({ params: { id: '2' }, body, user: { id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(ownerService.changePassword).not.toHaveBeenCalled();
    });

    it('refuses a body that fails validation', async () => {
      const res = createResponse();

      await controller.changePassword({ params: { id: '1' }, body: {}, user: { id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ownerService.changePassword).not.toHaveBeenCalled();
    });

    it('returns 404 when the account does not exist', async () => {
      const res = createResponse();
      ownerService.changePassword.mockResolvedValue({ ok: false, reason: 'not_found' });

      await controller.changePassword({ params: { id: '1' }, body, user: { id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ega topilmadi' });
    });

    it('refuses a wrong current password', async () => {
      const res = createResponse();
      ownerService.changePassword.mockResolvedValue({ ok: false, reason: 'bad_password' });

      await controller.changePassword({ params: { id: '1' }, body, user: { id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Joriy parol noto'g'ri" });
    });

    it('confirms a successful change without echoing either password', async () => {
      const res = createResponse();
      ownerService.changePassword.mockResolvedValue({ ok: true });

      await controller.changePassword({ params: { id: '1' }, body, user: { id: 1 } }, res);

      expect(ownerService.changePassword).toHaveBeenCalledWith(1, body.old_password, body.new_password);
      expect(res.json).toHaveBeenCalledWith({ message: "Parol muvaffaqiyatli o'zgartirildi" });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      ownerService.changePassword.mockRejectedValue(new Error('hash failed'));

      await controller.changePassword({ params: { id: '1' }, body, user: { id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Parolni o'zgartirib bo'lmadi", details: 'hash failed' });
    });
  });
});
