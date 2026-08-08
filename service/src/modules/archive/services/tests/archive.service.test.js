jest.mock('../../repositories/archive.repository', () => ({
  findArchivedStudents: jest.fn(), findArchivedTeachers: jest.fn(), findArchivedClasses: jest.fn(),
  findArchivedPayments: jest.fn(), findArchivedSessions: jest.fn(), restoreArchived: jest.fn(), purgeArchived: jest.fn(),
}));
const repository = require('../../repositories/archive.repository');
const service = require('../archive.service');

describe('archive service', () => {
  beforeEach(() => jest.clearAllMocks());
  test('loads all archived entity families in center scope with counts', async () => {
    repository.findArchivedStudents.mockResolvedValue([{}]); repository.findArchivedTeachers.mockResolvedValue([{}, {}]);
    repository.findArchivedClasses.mockResolvedValue([]); repository.findArchivedPayments.mockResolvedValue([{}]);
    repository.findArchivedSessions.mockResolvedValue([{}, {}, {}]);
    const result = await service.listArchive(2);
    expect(result.counts).toEqual({ students: 1, teachers: 2, classes: 0, payments: 1, sessions: 3 });
    for (const fn of ['findArchivedStudents', 'findArchivedTeachers', 'findArchivedClasses', 'findArchivedPayments', 'findArchivedSessions']) {
      expect(repository[fn]).toHaveBeenCalledWith(2);
    }
  });
  test('scopes restore and purge operations', () => {
    service.restoreArchiveItem('students', 7, 2); service.purgeArchiveItem('students', 7, 2);
    expect(repository.restoreArchived).toHaveBeenCalledWith('students', 7, 2);
    expect(repository.purgeArchived).toHaveBeenCalledWith('students', 7, 2);
  });
});
