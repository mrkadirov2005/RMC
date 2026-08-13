jest.mock('../../services/teacher.service', () => ({
  listTeachers: jest.fn(),
  listTeachersPaginated: jest.fn(),
  getTeacher: jest.fn(),
  createTeacher: jest.fn(),
  updateTeacher: jest.fn(),
  deleteTeacher: jest.fn(),
  purgeTeacher: jest.fn(),
  authenticate: jest.fn(),
  setPasswordByAdmin: jest.fn(),
  changePassword: jest.fn(),
}));

jest.mock('../../services/teacher_payment.service', () => ({
  setPaymentPassword: jest.fn(),
  authenticatePaymentAccess: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

jest.mock('../../../../middleware/auth', () => ({
  generateToken: jest.fn(() => 'teacher-token'),
  generatePaymentToken: jest.fn(() => 'payment-token'),
}));

const teacherController = require('../teacher.controller');
const teacherService = require('../../services/teacher.service');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('teachers controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 6, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('forwards trimmed teacher searches with pagination and center scope', async () => {
    const req = { query: { q: '  Ali  ', page: '2', limit: '24' } };
    const res = createResponse();
    teacherService.listTeachersPaginated.mockResolvedValue({ data: [], total: 0, page: 2, limit: 24 });

    await teacherController.getAllTeachers(req, res);

    expect(teacherService.listTeachersPaginated).toHaveBeenCalledWith(
      { q: 'Ali', status: undefined, page: 2, limit: 24 },
      6
    );
  });

  it('creates teachers using scoped center id', async () => {
    const req = { body: { first_name: 'Ali', center_id: 99 } };
    const res = createResponse();
    teacherService.createTeacher.mockResolvedValue({ row: { teacher_id: 1 } });

    await teacherController.createTeacher(req, res);

    expect(teacherService.createTeacher).toHaveBeenCalledWith({ first_name: 'Ali', center_id: 6 });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('maps duplicate username errors to 400', async () => {
    const req = { body: { username: 'ali' } };
    const res = createResponse();
    teacherService.createTeacher.mockResolvedValue({ error: 'username_taken' });

    await teacherController.createTeacher(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Username already exists' });
  });

  it('returns login token for active teacher credentials', async () => {
    const req = { body: { username: 'ali', password: 'secret' } };
    const res = createResponse();
    teacherService.authenticate.mockResolvedValue({
      kind: 'ok',
      teacher: { teacher_id: 2, first_name: 'Ali', last_name: 'Vali', email: 'a@test.uz', center_id: 6 },
    });

    await teacherController.teacherLogin(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Login successful',
      token: 'teacher-token',
      teacher: expect.objectContaining({ teacher_id: 2 }),
    }));
  });
});
