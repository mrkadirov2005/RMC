jest.mock('../../repositories/assignment.repository', () => ({
  getAll: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(),
}));

const repository = require('../../repositories/assignment.repository');
const service = require('../assignment.service');

describe('assignment service scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  test('forwards list pagination and actor scopes', () => {
    const options = { centerId: 2, teacherId: 4, classId: 8, limit: 20, offset: 40 };
    service.getAllAssignments(options);
    expect(repository.getAll).toHaveBeenCalledWith(options);
  });

  test('scopes read, update, and delete operations', () => {
    service.getAssignmentById(1, 2, 3);
    service.updateAssignment(1, { status: 'Graded' }, 2, 3);
    service.deleteAssignment(1, 2, 3);
    expect(repository.getById).toHaveBeenCalledWith(1, 2, 3);
    expect(repository.update).toHaveBeenCalledWith(1, { status: 'Graded' }, 2, 3);
    expect(repository.remove).toHaveBeenCalledWith(1, 2, 3);
  });

  test('passes the normalized create payload to persistence', () => {
    const payload = { center_id: 2, teacher_id: 3, class_id: 4, student_id: 5, title: 'Essay' };
    service.createAssignment(payload);
    expect(repository.create).toHaveBeenCalledWith(payload);
  });
});
