jest.mock('../../services/teacher.service', () => ({
  getTeacher: jest.fn(),
  listTeachers: jest.fn(),
  listTeachersPaginated: jest.fn(),
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

jest.mock('../../../../middleware/auth', () => ({
  generateToken: jest.fn(),
  generatePaymentToken: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const controller = require('../teacher.controller');
const teacherService = require('../../services/teacher.service');
const teacherPaymentService = require('../../services/teacher_payment.service');
const { generateToken, generatePaymentToken } = require('../../../../middleware/auth');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const admin = { userType: 'admin', id: 1 };

describe('teachers controller handlers', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 3, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping on the write paths', () => {
    const handlers = [
      ['createTeacher', { body: {} }],
      ['updateTeacher', { params: { id: '1' }, body: {} }],
      ['deleteTeacher', { params: { id: '1' }, query: {}, body: {} }],
      ['purgeTeacher', { params: { id: '1' } }],
      ['setTeacherPaymentPassword', { params: { id: '1' }, body: {} }],
      ['setTeacherPassword', { params: { id: '1' }, body: {} }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await controller[handler]({ ...req, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each([
      ['createTeacher', { body: {} }],
      ['setTeacherPaymentPassword', { params: { id: '1' }, body: {} }],
    ])('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await controller[handler]({ ...req, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });
  });

  describe('getMyProfile', () => {
    it('refuses a caller whose teacher id cannot be resolved', async () => {
      const res = createResponse();

      await controller.getMyProfile({ user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unable to resolve teacher id.' });
    });

    it('returns 404 when the teacher record is gone', async () => {
      const res = createResponse();
      teacherService.getTeacher.mockResolvedValue(null);

      await controller.getMyProfile({ user: { id: 7, userType: 'teacher' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Teacher not found.' });
    });

    it('returns a trimmed profile that carries no credentials', async () => {
      const res = createResponse();
      teacherService.getTeacher.mockResolvedValue({
        teacher_id: 7,
        employee_id: 'EMP-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        phone: '+1',
        status: 'Active',
        center_id: 3,
        password_hash: 'secret',
        salary_percentage: 40,
      });

      await controller.getMyProfile({ user: { id: 7, userType: 'teacher' } }, res);

      const body = res.json.mock.calls[0][0];
      expect(body).not.toHaveProperty('password_hash');
      expect(body).not.toHaveProperty('salary_percentage');
      expect(body.teacher_id).toBe(7);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      teacherService.getTeacher.mockRejectedValue(new Error('offline'));

      await controller.getMyProfile({ user: { id: 7 } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch profile', details: 'offline' });
    });
  });

  describe('getAllTeachers', () => {
    it('falls back to the unpaginated listing when the query is empty', async () => {
      const res = createResponse();
      teacherService.listTeachers.mockResolvedValue([{ teacher_id: 1 }]);

      await controller.getAllTeachers({ query: {}, user: admin }, res);

      expect(teacherService.listTeachers).toHaveBeenCalledWith(3);
      expect(teacherService.listTeachersPaginated).not.toHaveBeenCalled();
    });

    it('paginates with a default page size of twenty', async () => {
      const res = createResponse();
      teacherService.listTeachersPaginated.mockResolvedValue({ data: [] });

      await controller.getAllTeachers({ query: { page: '2' }, user: admin }, res);

      expect(teacherService.listTeachersPaginated).toHaveBeenCalledWith(
        { q: undefined, status: undefined, page: 2, limit: 20 },
        3,
      );
    });

    it('caps the page size at one hundred', async () => {
      const res = createResponse();
      teacherService.listTeachersPaginated.mockResolvedValue({ data: [] });

      await controller.getAllTeachers({ query: { limit: '5000' }, user: admin }, res);

      expect(teacherService.listTeachersPaginated).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }), 3);
    });

    it('treats a non-positive page as the first page', async () => {
      const res = createResponse();
      teacherService.listTeachersPaginated.mockResolvedValue({ data: [] });

      await controller.getAllTeachers({ query: { page: '-4' }, user: admin }, res);

      expect(teacherService.listTeachersPaginated).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }), 3);
    });

    it('accepts the search term under either q or search and trims it', async () => {
      const res = createResponse();
      teacherService.listTeachersPaginated.mockResolvedValue({ data: [] });

      await controller.getAllTeachers({ query: { search: '  ada  ' }, user: admin }, res);

      expect(teacherService.listTeachersPaginated).toHaveBeenCalledWith(expect.objectContaining({ q: 'ada' }), 3);
    });

    it('drops a blank status filter', async () => {
      const res = createResponse();
      teacherService.listTeachersPaginated.mockResolvedValue({ data: [] });

      await controller.getAllTeachers({ query: { q: 'ada', status: '   ' }, user: admin }, res);

      expect(teacherService.listTeachersPaginated).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }), 3);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      teacherService.listTeachers.mockRejectedValue(new Error('offline'));

      await controller.getAllTeachers({ query: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch teachers', details: 'offline' });
    });
  });

  describe('getTeacherById', () => {
    it('returns the teacher', async () => {
      const res = createResponse();
      teacherService.getTeacher.mockResolvedValue({ teacher_id: 7 });

      await controller.getTeacherById({ params: { id: '7' }, user: admin }, res);

      expect(teacherService.getTeacher).toHaveBeenCalledWith(7, 3);
      expect(res.json).toHaveBeenCalledWith({ teacher_id: 7 });
    });

    it('returns 404 when the teacher is out of scope', async () => {
      const res = createResponse();
      teacherService.getTeacher.mockResolvedValue(null);

      await controller.getTeacherById({ params: { id: '7' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      teacherService.getTeacher.mockRejectedValue(new Error('bad id'));

      await controller.getTeacherById({ params: { id: '7' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch teacher', details: 'bad id' });
    });
  });

  describe('createTeacher', () => {
    it('surfaces the validation details', async () => {
      const res = createResponse();
      teacherService.createTeacher.mockResolvedValue({ error: 'validation', details: ['email is invalid'] });

      await controller.createTeacher({ body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed', details: ['email is invalid'] });
    });

    it('refuses a username that is already taken', async () => {
      const res = createResponse();
      teacherService.createTeacher.mockResolvedValue({ error: 'username_taken' });

      await controller.createTeacher({ body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Username already exists' });
    });

    it('stamps the scoped center onto the new teacher', async () => {
      const res = createResponse();
      teacherService.createTeacher.mockResolvedValue({ row: { teacher_id: 9 } });

      await controller.createTeacher({ body: { first_name: 'Ada', center_id: 999 }, user: admin }, res);

      expect(teacherService.createTeacher).toHaveBeenCalledWith({ first_name: 'Ada', center_id: 3 });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ teacher_id: 9 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      teacherService.createTeacher.mockRejectedValue(new Error('insert failed'));

      await controller.createTeacher({ body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create teacher', details: 'insert failed' });
    });
  });

  describe('updateTeacher', () => {
    it('returns the updated teacher', async () => {
      const res = createResponse();
      teacherService.updateTeacher.mockResolvedValue({ teacher_id: 7 });

      await controller.updateTeacher({ params: { id: '7' }, body: { phone: '+2' }, user: admin }, res);

      expect(teacherService.updateTeacher).toHaveBeenCalledWith(7, { phone: '+2' }, 3);
      expect(res.json).toHaveBeenCalledWith({ teacher_id: 7 });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      teacherService.updateTeacher.mockResolvedValue(null);

      await controller.updateTeacher({ params: { id: '7' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      teacherService.updateTeacher.mockRejectedValue(new Error('conflict'));

      await controller.updateTeacher({ params: { id: '7' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update teacher', details: 'conflict' });
    });
  });

  describe('deleteTeacher', () => {
    it('returns 404 when the teacher is out of scope', async () => {
      const res = createResponse();
      teacherService.deleteTeacher.mockResolvedValue({ kind: 'not_found' });

      await controller.deleteTeacher({ params: { id: '7' }, query: {}, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('refuses a teacher whose attendance or grades block the delete', async () => {
      const res = createResponse();
      teacherService.deleteTeacher.mockResolvedValue({
        kind: 'blocked',
        reason: 'attendance',
        dependencies: { attendance_count: 3 },
      });

      await controller.deleteTeacher({ params: { id: '7' }, query: {}, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Teacher has attendance or grade records',
        reason: 'attendance',
      }));
    });

    it('explains which assignments must be cleared first', async () => {
      const res = createResponse();
      teacherService.deleteTeacher.mockResolvedValue({
        kind: 'has_dependencies',
        dependencies: { classes: [{ class_id: 1 }] },
      });

      await controller.deleteTeacher({ params: { id: '7' }, query: {}, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Teacher is assigned to active records' }));
    });

    it('reads the force flag from the query string', async () => {
      const res = createResponse();
      teacherService.deleteTeacher.mockResolvedValue({ row: { teacher_id: 7 }, dependencies: {} });

      await controller.deleteTeacher({ params: { id: '7' }, query: { force: 'TRUE' }, body: {}, user: admin }, res);

      expect(teacherService.deleteTeacher).toHaveBeenCalledWith(7, 3, { force: true });
      expect(res.json).toHaveBeenCalledWith({ message: 'Teacher deleted successfully', teacher: { teacher_id: 7 }, unassigned: {} });
    });

    it('reads the force flag from the body when the query has none', async () => {
      const res = createResponse();
      teacherService.deleteTeacher.mockResolvedValue({ row: {} });

      await controller.deleteTeacher({ params: { id: '7' }, query: {}, body: { force: 'true' }, user: admin }, res);

      expect(teacherService.deleteTeacher).toHaveBeenCalledWith(7, 3, { force: true });
    });

    it('explains a foreign key violation rather than returning a bare 500', async () => {
      const res = createResponse();
      const error = new Error('violates foreign key constraint');
      error.code = '23503';
      error.detail = 'still referenced from table "grades"';
      teacherService.deleteTeacher.mockRejectedValue(error);

      await controller.deleteTeacher({ params: { id: '7' }, query: {}, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Teacher is still referenced by other records',
      }));
    });

    it('reports any other failure as a 500', async () => {
      const res = createResponse();
      teacherService.deleteTeacher.mockRejectedValue(new Error('boom'));

      await controller.deleteTeacher({ params: { id: '7' }, query: {}, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete teacher', details: 'boom' });
    });
  });

  describe('purgeTeacher', () => {
    it('returns 404 when no soft-deleted teacher matches', async () => {
      const res = createResponse();
      teacherService.purgeTeacher.mockResolvedValue({ kind: 'not_found' });

      await controller.purgeTeacher({ params: { id: '7' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('permanently removes the teacher', async () => {
      const res = createResponse();
      teacherService.purgeTeacher.mockResolvedValue({ row: { teacher_id: 7 } });

      await controller.purgeTeacher({ params: { id: '7' }, user: admin }, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Teacher permanently deleted', teacher: { teacher_id: 7 } });
    });

    it('explains a foreign key violation rather than returning a bare 500', async () => {
      const res = createResponse();
      const error = new Error('violates foreign key constraint');
      error.code = '23503';
      teacherService.purgeTeacher.mockRejectedValue(error);

      await controller.purgeTeacher({ params: { id: '7' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('reports any other failure as a 500', async () => {
      const res = createResponse();
      teacherService.purgeTeacher.mockRejectedValue(new Error('boom'));

      await controller.purgeTeacher({ params: { id: '7' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to permanently delete teacher', details: 'boom' });
    });
  });

  describe('teacherLogin', () => {
    it('refuses an inactive account with a distinct 403', async () => {
      const res = createResponse();
      teacherService.authenticate.mockResolvedValue({ kind: 'inactive' });

      await controller.teacherLogin({ body: { username: 'ada', password: 'pw' } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Teacher account is not active' });
    });

    it('gives the same message for an unknown user and a bad password', async () => {
      const res = createResponse();
      teacherService.authenticate.mockResolvedValue({ kind: 'not_found' });

      await controller.teacherLogin({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid username or password' });
    });

    it('issues a teacher token and returns no credentials', async () => {
      const res = createResponse();
      teacherService.authenticate.mockResolvedValue({
        kind: 'ok',
        teacher: {
          teacher_id: 7,
          first_name: 'Ada',
          last_name: 'Lovelace',
          email: 'ada@example.com',
          center_id: 3,
          password_hash: 'secret',
        },
      });
      generateToken.mockReturnValue('signed-token');

      await controller.teacherLogin({ body: { username: 'ada', password: 'pw' } }, res);

      expect(generateToken).toHaveBeenCalledWith({ id: 7, email: 'ada@example.com', userType: 'teacher', center_id: 3 });
      const body = res.json.mock.calls[0][0];
      expect(body.teacher).not.toHaveProperty('password_hash');
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      teacherService.authenticate.mockRejectedValue(new Error('auth down'));

      await controller.teacherLogin({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to login', details: 'auth down' });
    });
  });

  describe('setTeacherPaymentPassword', () => {
    it('returns 404 when the teacher is out of scope', async () => {
      const res = createResponse();
      teacherService.getTeacher.mockResolvedValue(null);

      await controller.setTeacherPaymentPassword({ params: { id: '7' }, body: { password: 'pw' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(teacherPaymentService.setPaymentPassword).not.toHaveBeenCalled();
    });

    it('returns 404 when the credential write matched nothing', async () => {
      const res = createResponse();
      teacherService.getTeacher.mockResolvedValue({ teacher_id: 7 });
      teacherPaymentService.setPaymentPassword.mockResolvedValue(null);

      await controller.setTeacherPaymentPassword({ params: { id: '7' }, body: { password: 'pw' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('confirms the change without echoing the password', async () => {
      const res = createResponse();
      teacherService.getTeacher.mockResolvedValue({ teacher_id: 7 });
      teacherPaymentService.setPaymentPassword.mockResolvedValue({ teacher_id: 7 });

      await controller.setTeacherPaymentPassword({ params: { id: '7' }, body: { password: 'pw' }, user: admin }, res);

      expect(teacherPaymentService.setPaymentPassword).toHaveBeenCalledWith(7, 'pw', 1);
      expect(res.json).toHaveBeenCalledWith({ message: 'Payment access password set successfully.' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      teacherService.getTeacher.mockRejectedValue(new Error('offline'));

      await controller.setTeacherPaymentPassword({ params: { id: '7' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to set payment password', details: 'offline' });
    });
  });

  describe('teacherPaymentLogin', () => {
    it('refuses an inactive account', async () => {
      const res = createResponse();
      teacherPaymentService.authenticatePaymentAccess.mockResolvedValue({ kind: 'inactive' });

      await controller.teacherPaymentLogin({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Teacher account is not active' });
    });

    it('gives the same message for an unknown user and a bad password', async () => {
      const res = createResponse();
      teacherPaymentService.authenticatePaymentAccess.mockResolvedValue({ kind: 'not_found' });

      await controller.teacherPaymentLogin({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('issues a payment-scoped token', async () => {
      const res = createResponse();
      teacherPaymentService.authenticatePaymentAccess.mockResolvedValue({
        kind: 'ok',
        teacher: { teacher_id: 7, first_name: 'Ada', last_name: 'L', email: 'ada@example.com', center_id: 3 },
      });
      generatePaymentToken.mockReturnValue('payment-token');

      await controller.teacherPaymentLogin({ body: { username: 'ada', password: 'pw' } }, res);

      expect(generatePaymentToken).toHaveBeenCalledWith(expect.objectContaining({ payment_access: true }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Payment access granted', token: 'payment-token' }));
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      teacherPaymentService.authenticatePaymentAccess.mockRejectedValue(new Error('auth down'));

      await controller.teacherPaymentLogin({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to login for payment access', details: 'auth down' });
    });
  });

  describe('setTeacherPassword', () => {
    it('sets the credential and returns the trimmed row', async () => {
      const res = createResponse();
      teacherService.setPasswordByAdmin.mockResolvedValue({ teacher_id: 7, username: 'ada' });

      await controller.setTeacherPassword({ params: { id: '7' }, body: { username: 'ada', password: 'pw' }, user: admin }, res);

      expect(teacherService.setPasswordByAdmin).toHaveBeenCalledWith(7, 'ada', 'pw', 3);
      expect(res.json).toHaveBeenCalledWith({ message: 'Teacher password set successfully', teacher: { teacher_id: 7, username: 'ada' } });
    });

    it('returns 404 when the teacher is out of scope', async () => {
      const res = createResponse();
      teacherService.setPasswordByAdmin.mockResolvedValue(null);

      await controller.setTeacherPassword({ params: { id: '7' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      teacherService.setPasswordByAdmin.mockRejectedValue(new Error('hash failed'));

      await controller.setTeacherPassword({ params: { id: '7' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to set password', details: 'hash failed' });
    });
  });

  describe('changeTeacherPassword', () => {
    it('stops a teacher changing somebody else password', async () => {
      const res = createResponse();

      await controller.changeTeacherPassword({ params: { id: '9' }, body: {}, user: { userType: 'teacher', id: 7 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'You can only change your own password.' });
      expect(teacherService.changePassword).not.toHaveBeenCalled();
    });

    it('lets a teacher change their own password', async () => {
      const res = createResponse();
      teacherService.changePassword.mockResolvedValue({ ok: true });

      await controller.changeTeacherPassword({
        params: { id: '7' },
        body: { old_password: 'old', new_password: 'new' },
        user: { userType: 'teacher', id: 7 },
      }, res);

      expect(teacherService.changePassword).toHaveBeenCalledWith(7, 'old', 'new');
      expect(res.json).toHaveBeenCalledWith({ message: 'Password changed successfully' });
    });

    it('returns 404 when the account does not exist', async () => {
      const res = createResponse();
      teacherService.changePassword.mockResolvedValue({ ok: false, reason: 'not_found' });

      await controller.changeTeacherPassword({ params: { id: '7' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Teacher not found' });
    });

    it('refuses a wrong current password', async () => {
      const res = createResponse();
      teacherService.changePassword.mockResolvedValue({ ok: false, reason: 'bad_password' });

      await controller.changeTeacherPassword({ params: { id: '7' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Current password is incorrect' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      teacherService.changePassword.mockRejectedValue(new Error('hash failed'));

      await controller.changeTeacherPassword({ params: { id: '7' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to change password', details: 'hash failed' });
    });
  });
});
