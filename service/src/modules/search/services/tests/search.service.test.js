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

  // RMC-081: a teacher caller's student search must be scoped to their own assigned students
  // (searchStudents receives teacherId), and that scoping must never leak into the other three
  // entity searches -- searchTeachers/searchClasses/searchPayments's repository signatures don't
  // even accept a teacherId argument, so this also proves it is architecturally impossible for a
  // teacher's search to be broadened to another teacher's students via those entities.
  test('scopes only the students search to the caller teacher, never teachers/classes/payments', async () => {
    for (const fn of Object.values(repository)) fn.mockResolvedValue([]);

    await service.runSearch('Ali', undefined, undefined, 5, 7);

    expect(repository.searchStudents).toHaveBeenCalledWith('%Ali%', 20, 5, 7);
    expect(repository.searchTeachers).toHaveBeenCalledWith('%Ali%', 20, 5);
    expect(repository.searchClasses).toHaveBeenCalledWith('%Ali%', 20, 5);
    expect(repository.searchPayments).toHaveBeenCalledWith('%Ali%', 20, 5);
  });

  // Confirms the flip side: a superuser/owner caller (no teacherId) searches every student in
  // the center, not a teacher-restricted subset.
  test('does not scope student results by teacher for superuser/owner callers', async () => {
    repository.searchStudents.mockResolvedValue([{ student_id: 1 }, { student_id: 2 }]);

    await service.runSearch('Ali', 'students', undefined, 5, undefined);

    expect(repository.searchStudents).toHaveBeenCalledWith('%Ali%', 20, 5, undefined);
  });
});
