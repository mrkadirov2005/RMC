jest.mock('../../services/student.service', () => ({
  listStudents: jest.fn(),
  listStudentsPaginated: jest.fn(),
  getStudent: jest.fn(),
  listClassStudentsWithTransfers: jest.fn(),
}));
jest.mock('../../../../shared/tenant', () => ({ getScopedCenterId: jest.fn(() => ({ centerId: 4, isGlobal: false })) }));
jest.mock('../../../../middleware/auth', () => ({ generateToken: jest.fn() }));

const controller = require('../student.controller');
const service = require('../../services/student.service');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const student = { student_id: 1, first_name: 'Ali', passport_number: 'AA1234567' };

describe('student passport numbers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('are shown to admins and the owner', async () => {
    service.listStudents.mockResolvedValue([student]);
    const res = createResponse();
    await controller.getAllStudents({ query: {}, user: { userType: 'superuser' } }, res);
    expect(res.json).toHaveBeenCalledWith([student]);
  });

  it('are hidden from teachers in lists, pages and single records', async () => {
    service.listStudents.mockResolvedValue([student]);
    service.listStudentsPaginated.mockResolvedValue({ data: [student], total: 1 });
    service.getStudent.mockResolvedValue(student);
    const teacher = { userType: 'teacher', id: 7 };

    const list = createResponse();
    await controller.getAllStudents({ query: {}, user: teacher }, list);
    expect(list.json.mock.calls[0][0][0]).not.toHaveProperty('passport_number');

    const page = createResponse();
    await controller.getAllStudents({ query: { page: '1', limit: '20' }, user: teacher }, page);
    expect(page.json.mock.calls[0][0].data[0]).not.toHaveProperty('passport_number');

    const one = createResponse();
    await controller.getStudentById({ params: { id: '1' }, user: teacher }, one);
    expect(one.json.mock.calls[0][0]).toEqual({ student_id: 1, first_name: 'Ali' });
  });

  it("are hidden from classmates but a student sees their own", async () => {
    service.listClassStudentsWithTransfers.mockResolvedValue([student]);
    const classmates = createResponse();
    await controller.getClassStudentsWithTransfers({ params: { classId: '10' }, query: {}, user: { userType: 'student', id: 2, class_id: 10 } }, classmates);
    expect(classmates.json.mock.calls[0][0][0]).not.toHaveProperty('passport_number');

    service.getStudent.mockResolvedValue(student);
    const own = createResponse();
    await controller.getStudentById({ params: { id: '1' }, user: { userType: 'student', id: 1 } }, own);
    expect(own.json).toHaveBeenCalledWith(student);
  });
});
