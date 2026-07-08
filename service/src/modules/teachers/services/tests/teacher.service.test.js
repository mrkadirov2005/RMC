jest.mock('../../repositories/teacher.repository', () => ({
  findAll: jest.fn(),
  findPaginated: jest.fn(),
  findById: jest.fn(),
  countByUsername: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  getDeleteDependencies: jest.fn(),
  hasDeleteDependencies: jest.fn(),
  unassignDeleteDependencies: jest.fn(),
  remove: jest.fn(),
  purge: jest.fn(),
  findByUsername: jest.fn(),
  setCredentials: jest.fn(),
  findPasswordHash: jest.fn(),
  updatePasswordHash: jest.fn(),
}));

const teacherService = require('../teacher.service');
const teacherRepository = require('../../repositories/teacher.repository');
const { hashPassword } = require('../../../../shared/password');

describe('teachers service', () => {
  it('builds a unique username and hashes default password when creating teacher', async () => {
    teacherRepository.countByUsername
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    teacherRepository.insert.mockResolvedValue({ teacher_id: 5 });

    await teacherService.createTeacher({ first_name: 'Ali', center_id: 2, salary_percentage: 150 });

    const insertPayload = teacherRepository.insert.mock.calls[0][0];
    expect(insertPayload[11]).toBe('Active');
    expect(insertPayload[12]).toBe('[]');
    expect(insertPayload[13]).toBe('ali2');
    expect(insertPayload[14]).toBe(hashPassword('012345678'));
    expect(insertPayload[10]).toBe(100);
  });

  it('rejects explicit duplicate usernames', async () => {
    teacherRepository.countByUsername.mockResolvedValue(1);

    await expect(teacherService.createTeacher({ first_name: 'Ali', username: 'custom' })).resolves.toEqual({
      error: 'username_taken',
    });
  });

  it('unassigns dependencies before deleting teachers', async () => {
    teacherRepository.findById.mockResolvedValue({ teacher_id: 9 });
    teacherRepository.getDeleteDependencies.mockResolvedValue({ classes: 2 });
    teacherRepository.hasDeleteDependencies.mockReturnValue(true);
    teacherRepository.remove.mockResolvedValue({ teacher_id: 9, deleted_at: 'now' });

    const result = await teacherService.deleteTeacher(9, 1);

    expect(teacherRepository.unassignDeleteDependencies).toHaveBeenCalledWith(9, 1);
    expect(result).toEqual({
      kind: 'deleted',
      row: { teacher_id: 9, deleted_at: 'now' },
      dependencies: { classes: 2 },
    });
  });

  it('authenticates only active teachers with matching password', async () => {
    teacherRepository.findByUsername.mockResolvedValue({
      teacher_id: 4,
      status: 'Active',
      password_hash: hashPassword('secret'),
    });

    await expect(teacherService.authenticate('ali', 'secret')).resolves.toEqual({
      kind: 'ok',
      teacher: expect.objectContaining({ teacher_id: 4 }),
    });
  });
});
