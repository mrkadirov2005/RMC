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
  generateToken: jest.fn(() => 'owner-token'),
}));

const ownerController = require('../owner.controller');
const ownerService = require('../../services/owner.service');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const validBody = () => ({
  username: 'newowner',
  email: 'owner@example.com',
  password: 'secretpw',
  first_name: 'New',
  last_name: 'Owner',
  invite_key: 'the-real-key',
});

describe('owners controller registration invite-key enforcement (RMC-023)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalInviteKey = process.env.OWNER_INVITE_KEY;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
    if (originalInviteKey === undefined) delete process.env.OWNER_INVITE_KEY;
    else process.env.OWNER_INVITE_KEY = originalInviteKey;
  });

  it('refuses registration entirely in production when OWNER_INVITE_KEY is unset (fail closed, no hardcoded fallback)', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.OWNER_INVITE_KEY;

    const req = { body: { ...validBody(), invite_key: 'owner-create-2026' } };
    const res = createResponse();

    await ownerController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Owner registration is not configured.' });
    expect(ownerService.registerOwner).not.toHaveBeenCalled();
  });

  it('rejects registration in production with a configured key when the supplied invite_key does not match', async () => {
    process.env.NODE_ENV = 'production';
    process.env.OWNER_INVITE_KEY = 'the-real-key';

    const req = { body: { ...validBody(), invite_key: 'wrong-key' } };
    const res = createResponse();

    await ownerController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid keyword' });
    expect(ownerService.registerOwner).not.toHaveBeenCalled();
  });

  it('accepts registration in production once a matching configured invite_key is supplied', async () => {
    process.env.NODE_ENV = 'production';
    process.env.OWNER_INVITE_KEY = 'the-real-key';
    ownerService.registerOwner.mockResolvedValue({
      row: { owner_id: 1, username: 'newowner', email: 'owner@example.com', first_name: 'New', last_name: 'Owner', status: 'Active' },
    });

    const req = { body: validBody() };
    const res = createResponse();

    await ownerController.register(req, res);

    expect(ownerService.registerOwner).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'owner-token' }));
  });

  it('still allows the documented development fallback key outside production', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.OWNER_INVITE_KEY;
    ownerService.registerOwner.mockResolvedValue({
      row: { owner_id: 2, username: 'newowner', email: 'owner@example.com', first_name: 'New', last_name: 'Owner', status: 'Active' },
    });

    const req = { body: { ...validBody(), invite_key: 'owner-create-2026' } };
    const res = createResponse();

    await ownerController.register(req, res);

    expect(ownerService.registerOwner).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
