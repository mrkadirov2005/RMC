jest.mock('../../services/student.service', () => ({
  listStudents: jest.fn(),
  listStudentsPaginated: jest.fn(),
  getStudent: jest.fn(),
  createStudent: jest.fn(),
  updateStudent: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

jest.mock('../../../../middleware/auth', () => ({
  generateToken: jest.fn(() => 'test-token'),
}));

const studentController = require('../student.controller');
const studentService = require('../../services/student.service');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('students controller', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    getScopedCenterId.mockReturnValue({ centerId: 10, isGlobal: false });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('getAllStudents', () => {
    it('returns paginated students when query params are present', async () => {
      const req = { query: { page: '2', limit: '250', search: 'ali' }, user: { userType: 'superuser' } };
      const res = createResponse();
      studentService.listStudentsPaginated.mockResolvedValue({ data: [{ student_id: 1 }], total: 1, page: 2, limit: 100 });

      await studentController.getAllStudents(req, res);

      expect(studentService.listStudentsPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'ali', page: 2, limit: 100 }),
        10,
        undefined
      );
      expect(res.json).toHaveBeenCalledWith({ data: [{ student_id: 1 }], total: 1, page: 2, limit: 100 });
    });

    it('blocks requests without center scope', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const req = { query: {}, user: { userType: 'superuser' } };
      const res = createResponse();

      await studentController.getAllStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });
  });

  describe('createStudent', () => {
    it('uses scoped center id and strips freeze field for teachers', async () => {
      const req = {
        body: { first_name: 'Ali', center_id: 99, is_frozen: true },
        user: { userType: 'teacher' },
      };
      const res = createResponse();
      studentService.createStudent.mockResolvedValue({ student_id: 12, first_name: 'Ali' });

      await studentController.createStudent(req, res);

      expect(studentService.createStudent).toHaveBeenCalledWith({ first_name: 'Ali', center_id: 10 });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ student_id: 12, first_name: 'Ali' });
    });

    it('returns conflict for duplicate usernames', async () => {
      const req = { body: { username: 'ali' }, user: { userType: 'superuser' } };
      const res = createResponse();
      studentService.createStudent.mockRejectedValue({ code: '23505', constraint: 'students_username_key' });

      await studentController.createStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Username already exists' }));
    });
  });

  describe('updateStudent', () => {
    it('blocks students from updating another student profile', async () => {
      const req = { params: { id: '3' }, body: {}, user: { userType: 'student', id: 2 } };
      const res = createResponse();

      await studentController.updateStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
    });
  });
});
