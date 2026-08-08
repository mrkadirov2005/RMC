jest.mock('../../repositories/class.repository', () => ({
  findAll: jest.fn(),
  findPaginated: jest.fn(),
  findById: jest.fn(),
  teacherExists: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  purge: jest.fn(),
}));

jest.mock('../../../sessions/repositories/session.repository', () => ({
  softDeleteByClass: jest.fn(),
}));

const classService = require('../class.service');
const classRepository = require('../../repositories/class.repository');
const sessionRepository = require('../../../sessions/repositories/session.repository');

describe('classes service', () => {
  it('rejects class creation when teacher does not exist in scope', async () => {
    classRepository.teacherExists.mockResolvedValue(false);

    await expect(classService.createClass({ teacher_id: 12, center_id: 3 }, 3)).resolves.toEqual({ error: 'bad_teacher' });

    expect(classRepository.insert).not.toHaveBeenCalled();
  });

  it('creates class with generated code and monthly payment frequency defaults', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    classRepository.teacherExists.mockResolvedValue(true);
    classRepository.insert.mockResolvedValue({ class_id: 8 });

    await classService.createClass({
      center_id: 3,
      class_name: 'A1',
      teacher_id: 12,
      payment_amount: 270000,
    }, 3);

    expect(classRepository.insert).toHaveBeenCalledWith(expect.arrayContaining([
      3,
      'A1',
      expect.stringMatching(/^CLS-/),
      undefined,
      undefined,
      undefined,
      12,
    ]));
    expect(classRepository.insert.mock.calls[0][0][11]).toBe('Monthly');
  });

  it('soft deletes class sessions after deleting a class', async () => {
    classRepository.remove.mockResolvedValue({ class_id: 3 });
    sessionRepository.softDeleteByClass.mockResolvedValue(6);

    await expect(classService.deleteClass(3, 2)).resolves.toEqual({
      row: { class_id: 3 },
      deletedSessionCount: 6,
    });
  });
});
