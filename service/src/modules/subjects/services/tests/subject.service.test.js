const repository = {
  findByClass: jest.fn(),
  insert: jest.fn(),
};
const tenantDb = { classInCenter: jest.fn() };

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
});
