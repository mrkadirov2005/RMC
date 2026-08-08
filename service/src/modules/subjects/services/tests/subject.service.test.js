jest.mock('../../repositories/subject.repository', () => ({
  findAll: jest.fn(), findById: jest.fn(), findByClass: jest.fn(), insert: jest.fn(), update: jest.fn(), remove: jest.fn(),
}));
jest.mock('../../../../shared/tenantDb', () => ({ classInCenter: jest.fn() }));

const repository = require('../../repositories/subject.repository');
const { classInCenter } = require('../../../../shared/tenantDb');
const service = require('../subject.service');

describe('subject service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a class outside the authenticated center', async () => {
    classInCenter.mockResolvedValue(false);
    await expect(service.createSubject({ class_id: 7 }, 2)).resolves.toEqual({ error: 'invalid_center' });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  test('allows only one subject record per class', async () => {
    classInCenter.mockResolvedValue(true);
    repository.findByClass.mockResolvedValue([{ subject_id: 9 }]);
    await expect(service.createSubject({ class_id: 7 }, 2)).resolves.toEqual({ error: 'class_subject_exists' });
  });

  test('creates a subject with center enforcement and mark defaults', async () => {
    classInCenter.mockResolvedValue(true);
    repository.findByClass.mockResolvedValue([]);
    await service.createSubject({ center_id: 99, class_id: 7, subject_name: 'Math', subject_code: 'M', teacher_id: 4 }, 2);
    expect(repository.insert).toHaveBeenCalledWith([2, 7, 'Math', 'M', 4, 100, 40]);
  });

  test('returns null when updating a missing subject', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.updateSubject(5, {}, 2, 3)).resolves.toBeNull();
    expect(repository.update).not.toHaveBeenCalled();
  });

  test('rejects moving a subject to an occupied or cross-center class', async () => {
    repository.findById.mockResolvedValue({ subject_id: 5, class_id: 7 });
    classInCenter.mockResolvedValueOnce(false);
    await expect(service.updateSubject(5, { class_id: 8 }, 2, 3)).resolves.toEqual({ error: 'invalid_center' });

    classInCenter.mockResolvedValueOnce(true);
    repository.findByClass.mockResolvedValue([{ subject_id: 6 }]);
    await expect(service.updateSubject(5, { class_id: 8 }, 2, 3)).resolves.toEqual({ error: 'class_subject_exists' });
  });

  test('updates an unoccupied subject within actor scope', async () => {
    repository.findById.mockResolvedValue({ subject_id: 5, class_id: 7 });
    classInCenter.mockResolvedValue(true);
    repository.findByClass.mockResolvedValue([{ subject_id: 5 }]);
    await service.updateSubject(5, { subject_name: 'Physics' }, 2, 3);
    expect(repository.update).toHaveBeenCalledWith(5, [7, 'Physics', undefined, undefined, undefined, undefined], 2, 3);
  });
});
