jest.mock('../../../../shared/password', () => ({
  hashPassword: jest.fn((value) => `hash:${value}`),
  verifyPassword: jest.fn((password, storedHash) => ({ valid: storedHash === `hash:${password}`, legacy: false })),
}));
jest.mock('../../repositories/owner.repository', () => ({
  findAllSafe: jest.fn(), findById: jest.fn(), countByUsername: jest.fn(), insert: jest.fn(), update: jest.fn(),
  remove: jest.fn(), findByUsernameForLogin: jest.fn(), incrementLoginAttempts: jest.fn(),
  resetLoginSuccess: jest.fn(), findPasswordHash: jest.fn(), updatePasswordHash: jest.fn(),
}));

const repository = require('../../repositories/owner.repository');
const service = require('../owner.service');

describe('owner service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects duplicate usernames and hashes new-owner passwords', async () => {
    repository.countByUsername.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await expect(service.createOwner({ username: 'owner', password: 'pw' })).resolves.toEqual({ error: 'username_taken' });
    repository.insert.mockResolvedValue({ owner_id: 1 });
    await service.createOwner({ username: 'owner', email: 'o@x', password: 'pw', first_name: 'O', last_name: 'N' });
    expect(repository.insert).toHaveBeenCalledWith(['owner', 'o@x', 'hash:pw', 'O', 'N', 'Active']);
  });

  test.each([
    [null, 'pw', 'invalid'],
    [{ is_locked: true }, 'pw', 'locked'],
    [{ is_locked: false, status: 'Inactive' }, 'pw', 'inactive'],
    [{ owner_id: 1, status: 'Active', password_hash: 'hash:right' }, 'wrong', 'invalid'],
  ])('returns the expected authentication result %#', async (owner, password, kind) => {
    repository.findByUsernameForLogin.mockResolvedValue(owner);
    await expect(service.authenticate('owner', password)).resolves.toMatchObject({ kind });
  });

  test('increments failed attempts and resets them after successful authentication', async () => {
    repository.findByUsernameForLogin.mockResolvedValueOnce({ owner_id: 1, status: 'Active', password_hash: 'hash:right' });
    await service.authenticate('owner', 'wrong');
    expect(repository.incrementLoginAttempts).toHaveBeenCalledWith(1);
    repository.findByUsernameForLogin.mockResolvedValueOnce({ owner_id: 1, status: 'Active', password_hash: 'hash:right' });
    await expect(service.authenticate('owner', 'right')).resolves.toMatchObject({ kind: 'ok' });
    expect(repository.resetLoginSuccess).toHaveBeenCalledWith(1);
  });

  test('validates old password before changing it', async () => {
    repository.findPasswordHash.mockResolvedValueOnce(undefined);
    await expect(service.changePassword(1, 'old', 'new')).resolves.toEqual({ ok: false, reason: 'not_found' });
    repository.findPasswordHash.mockResolvedValueOnce('hash:other');
    await expect(service.changePassword(1, 'old', 'new')).resolves.toEqual({ ok: false, reason: 'bad_old' });
    repository.findPasswordHash.mockResolvedValueOnce('hash:old');
    await expect(service.changePassword(1, 'old', 'new')).resolves.toEqual({ ok: true });
    expect(repository.updatePasswordHash).toHaveBeenCalledWith(1, 'hash:new');
  });
});
