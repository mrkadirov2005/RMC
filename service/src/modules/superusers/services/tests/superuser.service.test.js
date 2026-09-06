jest.mock('../../../../shared/password', () => ({
  hashPassword: jest.fn((value) => `hash:${value}`),
  verifyPassword: jest.fn((password, storedHash) => ({ valid: storedHash === `hash:${password}`, legacy: false })),
}));
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
    repository.findAllSafe.mockResolvedValue([]);
    repository.findById.mockResolvedValueOnce(null).mockResolvedValueOnce({ superuser_id: 1, role: 'admin' });
    repository.update.mockResolvedValue(null); repository.remove.mockResolvedValue(null);
    await service.listSuperusers(2); await service.getSuperuser(1, 2);
    await service.updateSuperuser(1, {}, undefined, 2); await service.deleteSuperuser(1, undefined, 2);
    expect(repository.findAllSafe).toHaveBeenCalledWith(2);
    expect(repository.findById).toHaveBeenCalledWith(1, 2);
    expect(repository.update.mock.calls[0][2]).toBe(2);
    expect(repository.remove).toHaveBeenCalledWith(1, 2);
  });

  describe('owner-role privilege escalation matrix (RMC-020)', () => {
    const admin = { userType: 'superuser', role: 'admin', id: 1 };
    const owner = { userType: 'superuser', role: 'owner', id: 2 };

    test('an admin cannot create a superuser with role owner', async () => {
      repository.countByUsername.mockResolvedValue(0);
      await expect(
        service.createSuperuser({ center_id: 2, username: 'a', role: 'owner' }, admin)
      ).resolves.toEqual({ error: 'forbidden_role' });
      expect(repository.insert).not.toHaveBeenCalled();
    });

    test('an admin cannot create a superuser with role Owner regardless of casing', async () => {
      repository.countByUsername.mockResolvedValue(0);
      await expect(
        service.createSuperuser({ center_id: 2, username: 'a', role: 'OWNER' }, admin)
      ).resolves.toEqual({ error: 'forbidden_role' });
      expect(repository.insert).not.toHaveBeenCalled();
    });

    test('an admin creating a non-owner role still succeeds', async () => {
      repository.countByUsername.mockResolvedValue(0);
      repository.insert.mockResolvedValue({ superuser_id: 3, center_id: 2, permissions: [] });
      await expect(
        service.createSuperuser({ center_id: 2, username: 'a', role: 'admin' }, admin)
      ).resolves.toMatchObject({ row: expect.objectContaining({ superuser_id: 3 }) });
      expect(repository.insert).toHaveBeenCalled();
    });

    test('an owner can create a superuser with role owner', async () => {
      repository.countByUsername.mockResolvedValue(0);
      repository.insert.mockResolvedValue({ superuser_id: 4, center_id: 2, permissions: [] });
      await expect(
        service.createSuperuser({ center_id: 2, username: 'b', role: 'owner' }, owner)
      ).resolves.toMatchObject({ row: expect.objectContaining({ superuser_id: 4 }) });
      expect(repository.insert).toHaveBeenCalled();
    });

    test('an admin cannot self-promote or promote another superuser to role owner via update', async () => {
      await expect(
        service.updateSuperuser(1, { role: 'owner' }, admin, 2)
      ).resolves.toEqual({ error: 'forbidden_role' });
      await expect(
        service.updateSuperuser(9, { role: 'owner' }, admin, 2)
      ).resolves.toEqual({ error: 'forbidden_role' });
      expect(repository.update).not.toHaveBeenCalled();
    });

    test('an admin updating a non-owner role field still succeeds', async () => {
      repository.update.mockResolvedValue({ superuser_id: 1, center_id: 2, permissions: [] });
      await expect(
        service.updateSuperuser(1, { role: 'admin', email: 'x@x.com' }, admin, 2)
      ).resolves.toMatchObject({ row: expect.objectContaining({ superuser_id: 1 }) });
      expect(repository.update).toHaveBeenCalled();
    });

    test('an owner can update a superuser to role owner', async () => {
      repository.update.mockResolvedValue({ superuser_id: 1, center_id: 2, permissions: [] });
      await expect(
        service.updateSuperuser(1, { role: 'owner' }, owner, 2)
      ).resolves.toMatchObject({ row: expect.objectContaining({ superuser_id: 1 }) });
      expect(repository.update).toHaveBeenCalled();
    });

    test('an admin cannot delete a superuser whose current role is owner', async () => {
      repository.findById.mockResolvedValue({ superuser_id: 5, role: 'owner' });
      await expect(service.deleteSuperuser(5, admin, 2)).resolves.toEqual({ error: 'forbidden_role' });
      expect(repository.remove).not.toHaveBeenCalled();
    });

    test('an admin can delete a superuser whose current role is not owner', async () => {
      repository.findById.mockResolvedValue({ superuser_id: 6, role: 'admin' });
      repository.remove.mockResolvedValue({ superuser_id: 6, center_id: 2, permissions: [] });
      await expect(
        service.deleteSuperuser(6, admin, 2)
      ).resolves.toMatchObject({ row: expect.objectContaining({ superuser_id: 6 }) });
      expect(repository.remove).toHaveBeenCalledWith(6, 2);
    });

    test('an owner can delete a superuser whose current role is owner', async () => {
      repository.findById.mockResolvedValue({ superuser_id: 7, role: 'owner' });
      repository.remove.mockResolvedValue({ superuser_id: 7, center_id: 2, permissions: [] });
      await expect(
        service.deleteSuperuser(7, owner, 2)
      ).resolves.toMatchObject({ row: expect.objectContaining({ superuser_id: 7 }) });
      expect(repository.remove).toHaveBeenCalledWith(7, 2);
    });

    test('deleting a target that does not exist is a no-op regardless of caller role', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.deleteSuperuser(999, admin, 2)).resolves.toEqual({ row: null });
      expect(repository.remove).not.toHaveBeenCalled();
    });
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
