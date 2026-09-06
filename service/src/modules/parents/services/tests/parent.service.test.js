jest.mock('../../../../shared/password', () => ({
  hashPassword: jest.fn((value) => `hash:${value}`),
  verifyPassword: jest.fn((password, storedHash) => ({ valid: storedHash === `hash:${password}`, legacy: false })),
}));
jest.mock('../../../../shared/tenantDb', () => ({ studentInCenter: jest.fn() }));
jest.mock('../../repositories/parent.repository', () => ({
  findAllSafe: jest.fn(), findByIdSafe: jest.fn(), insert: jest.fn(), update: jest.fn(), remove: jest.fn(),
  upsertParentStudent: jest.fn(), findByUsernameLogin: jest.fn(), findStudentsForParent: jest.fn(),
  findPaymentsForParent: jest.fn(), findAttendanceForParent: jest.fn(), findGradesForParent: jest.fn(),
  findTestSubmissionsForParent: jest.fn(),
}));

const repository = require('../../repositories/parent.repository');
const { studentInCenter } = require('../../../../shared/tenantDb');
const service = require('../parent.service');

describe('parent service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('hashes parent credentials and applies safe optional defaults', async () => {
    repository.insert.mockResolvedValue({ parent_id: 1 });
    await service.createParent({ first_name: 'P', last_name: 'A', username: 'p', password: 'pw' });
    expect(repository.insert).toHaveBeenCalledWith(['P', 'A', null, null, 'p', 'hash:pw', 'Active', null]);
  });

  test('rejects cross-center assignment and defaults relationship', async () => {
    studentInCenter.mockResolvedValueOnce(false);
    await expect(service.assignStudent({ parent_id: 1, student_id: 2 }, 7)).resolves.toEqual({ error: 'invalid_center' });
    studentInCenter.mockResolvedValueOnce(true);
    repository.upsertParentStudent.mockResolvedValue(undefined);
    await expect(service.assignStudent({ parent_id: 1, student_id: 2 }, 7)).resolves.toEqual({ ok: true });
    expect(repository.upsertParentStudent).toHaveBeenCalledWith([1, 2, 'Guardian', false]);
  });

  test('authenticates only active parents with matching hashes', async () => {
    repository.findByUsernameLogin
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ status: 'Inactive' })
      .mockResolvedValueOnce({ status: 'Active', password_hash: 'hash:right' })
      .mockResolvedValueOnce({ parent_id: 1, status: 'Active', password_hash: 'hash:right' });
    await expect(service.authenticate('p', 'right')).resolves.toMatchObject({ kind: 'invalid' });
    await expect(service.authenticate('p', 'right')).resolves.toMatchObject({ kind: 'inactive' });
    await expect(service.authenticate('p', 'wrong')).resolves.toMatchObject({ kind: 'invalid' });
    await expect(service.authenticate('p', 'right')).resolves.toMatchObject({ kind: 'ok' });
  });

  test('scopes CRUD and each parent portal query', () => {
    service.listParents(2); service.getParent(1, 2); service.updateParent(1, {}, 2); service.deleteParent(1, 2);
    service.getMyStudents(1); service.getMyStudentPayments(1); service.getMyStudentAttendance(1);
    service.getMyStudentGrades(1); service.getMyStudentTests(1);
    expect(repository.findAllSafe).toHaveBeenCalledWith(2);
    expect(repository.findByIdSafe).toHaveBeenCalledWith(1, 2);
    expect(repository.findStudentsForParent).toHaveBeenCalledWith(1);
    expect(repository.findPaymentsForParent).toHaveBeenCalledWith(1);
    expect(repository.findAttendanceForParent).toHaveBeenCalledWith(1);
    expect(repository.findGradesForParent).toHaveBeenCalledWith(1);
    expect(repository.findTestSubmissionsForParent).toHaveBeenCalledWith(1);
  });
});
