jest.mock('../../../../shared/password', () => ({ hashPassword: jest.fn((value) => `hash:${value}`) }));
jest.mock('../../repositories/superuser.repository', () => ({
  findAllSafe: jest.fn(), findById: jest.fn(), countByUsername: jest.fn(), insert: jest.fn(), update: jest.fn(),
  remove: jest.fn(), findByUsernameForLogin: jest.fn(), incrementLoginAttempts: jest.fn(), resetLoginSuccess: jest.fn(),
  findPasswordHash: jest.fn(), updatePasswordHash: jest.fn(),
}));

const repository = require('../../repositories/superuser.repository');
const service = require('../superuser.service');

describe('superuser service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('requires a branch and rejects duplicate usernames', async () => {
    await expect(service.createSuperuser({ username: 'a' })).resolves.toEqual({ error: 'branch_required' });
    repository.countByUsername.mockResolvedValue(1);
    await expect(service.createSuperuser({ center_id: 2, username: 'a' })).resolves.toEqual({ error: 'username_taken' });
  });

  test('normalizes role, status, permissions, password, and branch identity', async () => {
    repository.countByUsername.mockResolvedValue(0);
    repository.insert.mockResolvedValue({ superuser_id: 1, center_id: 2, permissions: ['A', 'B'] });
    const result = await service.createSuperuser({
      branch_id: 2, username: 'a', password: 'pw', role: 'ADMIN', status: 'inactive', permissions: { A: true, B: 1, C: false },
    });
    expect(repository.insert.mock.calls[0][0]).toEqual([2, 'a', undefined, 'hash:pw', undefined, undefined, 'admin', '["A","B"]', 'Inactive']);
    expect(result.row).toMatchObject({ branch_id: 2, permissions: ['A', 'B'] });
  });

  test('forces list/get/update/delete repository center scope', async () => {
    repository.findAllSafe.mockResolvedValue([]); repository.findById.mockResolvedValue(null);
    repository.update.mockResolvedValue(null); repository.remove.mockResolvedValue(null);
    await service.listSuperusers(2); await service.getSuperuser(1, 2);
    await service.updateSuperuser(1, {}, 2); await service.deleteSuperuser(1, 2);
    expect(repository.findAllSafe).toHaveBeenCalledWith(2);
    expect(repository.findById).toHaveBeenCalledWith(1, 2);
    expect(repository.update.mock.calls[0][2]).toBe(2);
    expect(repository.remove).toHaveBeenCalledWith(1, 2);
  });

  test('handles invalid, locked, inactive, wrong-password, and successful login', async () => {
    repository.findByUsernameForLogin
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ is_locked: true })
      .mockResolvedValueOnce({ is_locked: false, status: 'Inactive' })
      .mockResolvedValueOnce({ superuser_id: 1, status: 'Active', password_hash: 'hash:right' })
      .mockResolvedValueOnce({ superuser_id: 1, status: 'Active', password_hash: 'hash:right', center_id: 2, permissions: '[]' });
    await expect(service.authenticate('a', 'right')).resolves.toMatchObject({ kind: 'invalid' });
    await expect(service.authenticate('a', 'right')).resolves.toMatchObject({ kind: 'locked' });
    await expect(service.authenticate('a', 'right')).resolves.toMatchObject({ kind: 'inactive' });
    await expect(service.authenticate('a', 'wrong')).resolves.toMatchObject({ kind: 'invalid' });
    expect(repository.incrementLoginAttempts).toHaveBeenCalledWith(1);
    await expect(service.authenticate('a', 'right')).resolves.toMatchObject({ kind: 'ok' });
    expect(repository.resetLoginSuccess).toHaveBeenCalledWith(1);
  });
});
