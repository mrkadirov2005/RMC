jest.mock('../../services/owner.service', () => ({
  listOwners: jest.fn(),
  getOwner: jest.fn(),
  createOwner: jest.fn(),
  registerOwner: jest.fn(),
  updateOwner: jest.fn(),
  deleteOwner: jest.fn(),
  authenticate: jest.fn(),
  changePassword: jest.fn(),
}));

jest.mock('../../../../middleware/auth', () => ({
  generateToken: jest.fn(),
}));

const controller = require('../owner.controller');
const ownerService = require('../../services/owner.service');
const { generateToken } = require('../../../../middleware/auth');

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
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch owners', details: 'offline' });
    });
  });

  describe('getOwnerById', () => {
    it('returns the owner', async () => {
      const res = createResponse();
      ownerService.getOwner.mockResolvedValue({ owner_id: 1 });

      await controller.getOwnerById({ params: { id: '1' } }, res);

      expect(ownerService.getOwner).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ owner_id: 1 });
    });

    it('returns 404 when the owner does not exist', async () => {
      const res = createResponse();
      ownerService.getOwner.mockResolvedValue(null);

      await controller.getOwnerById({ params: { id: '1' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Owner not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      ownerService.getOwner.mockRejectedValue(new Error('bad id'));

      await controller.getOwnerById({ params: { id: '1' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch owner', details: 'bad id' });
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
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation failed' }));
      expect(ownerService.createOwner).not.toHaveBeenCalled();
    });

    it('refuses a username that is already taken', async () => {
      const res = createResponse();
      ownerService.createOwner.mockResolvedValue({ error: 'username_taken' });

      await controller.createOwner({ body: validBody }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Username already exists' });
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
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create owner', details: 'insert failed' });
    });
  });

  describe('register', () => {
    const validBody = (overrides = {}) => ({
      username: 'ada',
      password: 'Str0ngPassword!',
      email: 'ada@example.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
      invite_key: 'owner-create-2026',
      ...overrides,
    });

    it('refuses a body that fails validation', async () => {
      const res = createResponse();

      await controller.register({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ownerService.registerOwner).not.toHaveBeenCalled();
    });

    it('refuses a username that is already taken', async () => {
      const res = createResponse();
      ownerService.registerOwner.mockResolvedValue({ error: 'username_taken' });

      await controller.register({ body: validBody() }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Username already exists' });
    });

    it('signs the new owner in and returns no password fields', async () => {
      const res = createResponse();
      ownerService.registerOwner.mockResolvedValue({ row: ownerRow() });
      generateToken.mockReturnValue('signed-token');

      await controller.register({ body: validBody() }, res);

      expect(generateToken).toHaveBeenCalledWith(expect.objectContaining({ role: 'owner', can_hard_delete: false }));
      const body = res.json.mock.calls[0][0];
      expect(body.token).toBe('signed-token');
      expect(body.owner).not.toHaveProperty('password_hash');
      expect(body.owner.can_hard_delete).toBe(false);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      ownerService.registerOwner.mockRejectedValue(new Error('insert failed'));

      await controller.register({ body: validBody() }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create owner', details: 'insert failed' });
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
      expect(res.json).toHaveBeenCalledWith({ error: 'Owner not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      ownerService.updateOwner.mockRejectedValue(new Error('conflict'));

      await controller.updateOwner({ params: { id: '1' }, body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update owner', details: 'conflict' });
    });
  });

  describe('deleteOwner', () => {
    it('confirms the deletion', async () => {
      const res = createResponse();
      ownerService.deleteOwner.mockResolvedValue({ owner_id: 1 });

      await controller.deleteOwner({ params: { id: '1' } }, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Owner deleted successfully', owner: { owner_id: 1 } });
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
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete owner', details: 'locked' });
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
      ['locked', 'Account is locked'],
      ['inactive', 'Account is not active'],
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
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid username or password' });
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
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to login', details: 'auth down' });
    });
  });

  describe('changePassword', () => {
    const body = { old_password: 'Str0ngPassword!', new_password: 'Ev3nStronger!' };

    it('refuses a body that fails validation', async () => {
      const res = createResponse();

      await controller.changePassword({ params: { id: '1' }, body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ownerService.changePassword).not.toHaveBeenCalled();
    });

    it('returns 404 when the account does not exist', async () => {
      const res = createResponse();
      ownerService.changePassword.mockResolvedValue({ ok: false, reason: 'not_found' });

      await controller.changePassword({ params: { id: '1' }, body }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Owner not found' });
    });

    it('refuses a wrong current password', async () => {
      const res = createResponse();
      ownerService.changePassword.mockResolvedValue({ ok: false, reason: 'bad_password' });

      await controller.changePassword({ params: { id: '1' }, body }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Current password is incorrect' });
    });

    it('confirms a successful change without echoing either password', async () => {
      const res = createResponse();
      ownerService.changePassword.mockResolvedValue({ ok: true });

      await controller.changePassword({ params: { id: '1' }, body }, res);

      expect(ownerService.changePassword).toHaveBeenCalledWith(1, body.old_password, body.new_password);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password changed successfully' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      ownerService.changePassword.mockRejectedValue(new Error('hash failed'));

      await controller.changePassword({ params: { id: '1' }, body }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to change password', details: 'hash failed' });
    });
  });
});
