const repository = {
  findByClass: jest.fn(),
  findById: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};
const tenantDb = { classInCenter: jest.fn(), classBelongsToTeacher: jest.fn() };

jest.mock('../../repositories/subject.repository', () => repository);
jest.mock('../../../../shared/tenantDb', () => tenantDb);

const subjectService = require('../subject.service');

describe('subject service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a subject without assigning a class or teacher', async () => {
    repository.insert.mockResolvedValue({ subject_id: 9, subject_name: 'English' });

    await subjectService.createSubject({ subject_name: 'English', total_marks: 100, passing_marks: 40 }, 3);

    expect(tenantDb.classInCenter).not.toHaveBeenCalled();
    expect(repository.findByClass).not.toHaveBeenCalled();
    expect(repository.insert).toHaveBeenCalledWith([3, undefined, 'English', undefined, undefined, 100, 40]);
  });

  describe('cross-teacher ownership isolation (RMC-027)', () => {
    it('blocks a teacher from creating a subject on a class they do not own, even in their own center', async () => {
      tenantDb.classInCenter.mockResolvedValue(true);
      tenantDb.classBelongsToTeacher.mockResolvedValue(false);

      const result = await subjectService.createSubject(
        { class_id: 12, subject_name: 'Math' },
        3,
        99 // teacherId: caller is teacher 99, but class 12 belongs to teacher B
      );

      expect(tenantDb.classBelongsToTeacher).toHaveBeenCalledWith(12, 99);
      expect(result).toEqual({ error: 'forbidden' });
      expect(repository.insert).not.toHaveBeenCalled();
      expect(repository.findByClass).not.toHaveBeenCalled();
    });

    it('blocks a teacher from updating a subject on a class they do not own, even in their own center', async () => {
      repository.findById.mockResolvedValue({ subject_id: 5, class_id: 12 });
      tenantDb.classInCenter.mockResolvedValue(true);
      tenantDb.classBelongsToTeacher.mockResolvedValue(false);

      const result = await subjectService.updateSubject(5, { class_id: 12, subject_name: 'Math' }, 3, 99);

      expect(tenantDb.classBelongsToTeacher).toHaveBeenCalledWith(12, 99);
      expect(result).toEqual({ error: 'forbidden' });
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('allows a teacher to create a subject on their own class in the same center', async () => {
      tenantDb.classInCenter.mockResolvedValue(true);
      tenantDb.classBelongsToTeacher.mockResolvedValue(true);
      repository.findByClass.mockResolvedValue([]);
      repository.insert.mockResolvedValue({ subject_id: 9, subject_name: 'Math' });

      const result = await subjectService.createSubject({ class_id: 12, subject_name: 'Math' }, 3, 4);

      expect(tenantDb.classBelongsToTeacher).toHaveBeenCalledWith(12, 4);
      expect(result).toEqual({ subject_id: 9, subject_name: 'Math' });
      expect(repository.insert).toHaveBeenCalled();
    });

    it('does not affect a superuser/owner caller: create and update on any class in the center succeed without an ownership check', async () => {
      tenantDb.classInCenter.mockResolvedValue(true);
      repository.findByClass.mockResolvedValue([]);
      repository.insert.mockResolvedValue({ subject_id: 10, subject_name: 'Science' });

      await subjectService.createSubject({ class_id: 12, subject_name: 'Science' }, 3 /* centerId */, undefined /* no teacherId: superuser/owner */);

      expect(tenantDb.classBelongsToTeacher).not.toHaveBeenCalled();
      expect(repository.insert).toHaveBeenCalled();

      jest.clearAllMocks();
      repository.findById.mockResolvedValue({ subject_id: 10, class_id: 12 });
      tenantDb.classInCenter.mockResolvedValue(true);
      repository.findByClass.mockResolvedValue([]);
      repository.update.mockResolvedValue({ subject_id: 10, subject_name: 'Science II' });

      const updateResult = await subjectService.updateSubject(10, { class_id: 12, subject_name: 'Science II' }, 3, undefined);

      expect(tenantDb.classBelongsToTeacher).not.toHaveBeenCalled();
      expect(updateResult).toEqual({ subject_id: 10, subject_name: 'Science II' });
    });
  });
});
