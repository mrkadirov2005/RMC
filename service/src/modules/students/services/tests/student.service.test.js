jest.mock('../../../../shared/password', () => ({
  hashPassword: jest.fn((value) => `hash:${value}`),
  verifyPassword: jest.fn((password, storedHash) => ({ valid: storedHash === `hash:${password}`, legacy: false })),
}));

jest.mock('../../repositories/student.repository', () => ({
  findAllWithClass: jest.fn(),
  findPaginatedWithClass: jest.fn(),
  findByIdWithClass: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  findByUsername: jest.fn(),
  findPasswordHashById: jest.fn(),
  updatePasswordHash: jest.fn(),
}));

jest.mock('../../../discounts/services/discount.service', () => ({
  calculateDiscount: jest.fn(() => ({ finalAmount: 750 })),
  getActiveByStudent: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../repositories/studentCoins.repository', () => ({
  listTransactions: jest.fn(),
  addTransaction: jest.fn(),
  upsertSourceTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
}));

const studentService = require('../student.service');
const studentRepository = require('../../repositories/student.repository');
const discountService = require('../../../discounts/services/discount.service');
const { hashPassword } = require('../../../../shared/password');

describe('students service', () => {
  it('delegates paginated listing to repository with filters and scope', async () => {
    studentRepository.findPaginatedWithClass.mockResolvedValue({ data: [], total: 0 });

    await studentService.listStudentsPaginated({ q: 'ali' }, 7, 9);

    expect(studentRepository.findPaginatedWithClass).toHaveBeenCalledWith({ q: 'ali' }, 7, 9);
  });

  it('hashes password and creates a serial discount when requested', async () => {
    studentRepository.insert.mockResolvedValue({ student_id: 44, center_id: 3 });
    discountService.getActiveByStudent.mockResolvedValue(null);

    const student = await studentService.createStudent({
      center_id: 3,
      first_name: 'Ali',
      password: 'secret',
      is_discounted: true,
      discount_original_price: 1000,
      discount_value_type: 'fixed',
      discount_value: 250,
      discount_reason: 'Scholarship',
    });

    expect(studentRepository.insert).toHaveBeenCalledWith(expect.objectContaining({
      center_id: 3,
      first_name: 'Ali',
      password_hash: hashPassword('secret'),
    }));
    expect(discountService.calculateDiscount).toHaveBeenCalledWith(1000, 'fixed', 250);
    expect(discountService.getActiveByStudent).toHaveBeenCalledWith(44, 3, 'serial_discount');
    expect(discountService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 44,
        center_id: 3,
        final_price: 750,
        discount_kind: 'serial_discount',
      }),
      3,
    );
    expect(student).toEqual({ student_id: 44, center_id: 3 });
  });

  it('authenticates active students with matching password hash', async () => {
    studentRepository.findByUsername.mockResolvedValue({
      student_id: 5,
      username: 'ali',
      status: 'Active',
      password_hash: hashPassword('secret'),
    });

    await expect(studentService.authenticate('ali', 'secret')).resolves.toEqual({
      kind: 'ok',
      student: expect.objectContaining({ student_id: 5 }),
    });
  });

  it('rejects inactive students during authentication', async () => {
    studentRepository.findByUsername.mockResolvedValue({
      status: 'Inactive',
      password_hash: hashPassword('secret'),
    });

    await expect(studentService.authenticate('ali', 'secret')).resolves.toEqual({ kind: 'inactive' });
  });

  it('changes password only when the old password matches', async () => {
    studentRepository.findPasswordHashById.mockResolvedValue(hashPassword('old-password'));

    await expect(studentService.changePassword(4, 'old-password', 'new-password')).resolves.toEqual({ ok: true });

    expect(studentRepository.updatePasswordHash).toHaveBeenCalledWith(4, hashPassword('new-password'));
  });

  // RMC-053 (characterization, NOT fixed): createStudent/updateStudent call
  // syncStudentDiscount after the student row is already written, with no
  // db.transaction wrapping the two. A discount-sync failure therefore leaves
  // the student write committed rather than rolled back.
  describe('discount sync is not transactional with the student write (unfixed)', () => {
    it('createStudent leaves the already-inserted student committed when discount sync fails', async () => {
      studentRepository.insert.mockResolvedValue({ student_id: 44, center_id: 3 });
      discountService.getActiveByStudent.mockRejectedValue(new Error('discount service unavailable'));

      await expect(studentService.createStudent({
        center_id: 3,
        first_name: 'Ali',
        is_discounted: true,
        discount_value: 250,
      })).rejects.toThrow('discount service unavailable');

      // The insert already happened; nothing compensates for it, because
      // createStudent does not wrap the insert + discount sync in a transaction.
      expect(studentRepository.insert).toHaveBeenCalledTimes(1);
    });

    it('updateStudent leaves the already-updated student committed when discount sync fails', async () => {
      studentRepository.update.mockResolvedValue({ student_id: 44, center_id: 3 });
      discountService.getActiveByStudent.mockRejectedValue(new Error('discount service unavailable'));

      await expect(studentService.updateStudent(44, {
        is_discounted: true,
        discount_value: 250,
      }, 3)).rejects.toThrow('discount service unavailable');

      expect(studentRepository.update).toHaveBeenCalledTimes(1);
    });
  });
});
