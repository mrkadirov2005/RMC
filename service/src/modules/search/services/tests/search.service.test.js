jest.mock('../../repositories/search.repository', () => ({
  searchStudents: jest.fn(), searchTeachers: jest.fn(), searchClasses: jest.fn(), searchPayments: jest.fn(),
}));
const repository = require('../../repositories/search.repository');
const service = require('../search.service');

describe('search service', () => {
  beforeEach(() => jest.clearAllMocks());
  test('searches every supported entity with actor scope by default', async () => {
    for (const fn of Object.values(repository)) fn.mockResolvedValue([]);
    await expect(service.runSearch('Ali', undefined, undefined, 2, 4)).resolves.toEqual({
      results: { students: [], teachers: [], classes: [], payments: [] },
    });
    expect(repository.searchStudents).toHaveBeenCalledWith('%Ali%', 20, 2, 4);
    expect(repository.searchTeachers).toHaveBeenCalledWith('%Ali%', 20, 2);
  });
  test('limits maximum results and invokes only the selected entity', async () => {
    repository.searchPayments.mockResolvedValue([{ payment_id: 1 }]);
    await expect(service.runSearch('R', 'payments', '500', 2, 4)).resolves.toEqual({ results: { payments: [{ payment_id: 1 }] } });
    expect(repository.searchPayments).toHaveBeenCalledWith('%R%', 100, 2);
    expect(repository.searchStudents).not.toHaveBeenCalled();
  });
});
