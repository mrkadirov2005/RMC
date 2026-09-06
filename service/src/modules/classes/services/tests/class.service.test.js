jest.mock('../../repositories/class.repository', () => ({
  findAll: jest.fn(),
  findPaginated: jest.fn(),
  findById: jest.fn(),
  teacherExists: jest.fn(),
  subjectCanAssign: jest.fn(),
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

  // RMC-060: subject_id is now the field the service actually validates/persists;
  // subject_name (still accepted by the DTO) is never read by the service.
  it('creates a class when subject_id references a real subject in the center', async () => {
    classRepository.subjectCanAssign.mockResolvedValue(true);
    classRepository.insert.mockResolvedValue({ class_id: 21, subject_id: 9 });

    const result = await classService.createClass({
      class_name: 'B2',
      subject_id: 9,
      subject_name: 'Ignored Passthrough Name',
    }, 3);

    expect(classRepository.subjectCanAssign).toHaveBeenCalledWith(9, 3);
    expect(classRepository.insert).toHaveBeenCalled();
    expect(classRepository.insert.mock.calls[0][0][12]).toBe(9);
    expect(result).toEqual({ row: { class_id: 21, subject_id: 9 } });
  });

  it('rejects class creation when subject_id is missing entirely', async () => {
    const result = await classService.createClass({ class_name: 'B2', subject_name: 'Math' }, 3);

    expect(result).toEqual({ error: 'bad_subject' });
    expect(classRepository.subjectCanAssign).not.toHaveBeenCalled();
    expect(classRepository.insert).not.toHaveBeenCalled();
  });

  it('rejects class creation when subject_id does not resolve to a subject in this center', async () => {
    classRepository.subjectCanAssign.mockResolvedValue(false);

    const result = await classService.createClass({ class_name: 'B2', subject_id: 999 }, 3);

    expect(classRepository.subjectCanAssign).toHaveBeenCalledWith(999, 3);
    expect(result).toEqual({ error: 'bad_subject' });
    expect(classRepository.insert).not.toHaveBeenCalled();
  });
});
