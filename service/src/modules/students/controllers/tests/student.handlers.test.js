jest.mock('../../services/student.service', () => ({
  listAcquisitionSources: jest.fn(),
  createAcquisitionSource: jest.fn(),
  listActionReasons: jest.fn(),
  createActionReason: jest.fn(),
  listStudents: jest.fn(),
  listStudentsPaginated: jest.fn(),
  getStudent: jest.fn(),
  listDeletedStudents: jest.fn(),
  listClassStudentsWithTransfers: jest.fn(),
  createStudent: jest.fn(),
  updateStudent: jest.fn(),
  deleteStudent: jest.fn(),
  purgeStudent: jest.fn(),
  transferStudent: jest.fn(),
  authenticate: jest.fn(),
  setPasswordByAdmin: jest.fn(),
  changePassword: jest.fn(),
}));

jest.mock('../../../../middleware/auth', () => ({
  generateToken: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const controller = require('../student.controller');
const studentService = require('../../services/student.service');
const { generateToken } = require('../../../../middleware/auth');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const admin = { userType: 'admin', id: 1 };

describe('students controller handlers', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 2, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('acquisition sources', () => {
    it('lists the stored sources', async () => {
      const res = createResponse();
      studentService.listAcquisitionSources.mockResolvedValue([{ source_id: 1 }]);

      await controller.getAcquisitionSources({}, res);

      expect(res.json).toHaveBeenCalledWith([{ source_id: 1 }]);
    });

    it('reports a read failure as a 500', async () => {
      const res = createResponse();
      studentService.listAcquisitionSources.mockRejectedValue(new Error('offline'));

      await controller.getAcquisitionSources({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch acquisition sources', details: 'offline' });
    });

    it('requires a non-blank source name', async () => {
      const res = createResponse();

      await controller.createAcquisitionSource({ body: { source_name: '   ' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'source_name is required' });
      expect(studentService.createAcquisitionSource).not.toHaveBeenCalled();
    });

    it('trims the name before storing it', async () => {
      const res = createResponse();
      studentService.createAcquisitionSource.mockResolvedValue({ source_id: 2 });

      await controller.createAcquisitionSource({ body: { source_name: '  Instagram  ' } }, res);

      expect(studentService.createAcquisitionSource).toHaveBeenCalledWith('Instagram');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('reports a write failure as a 500', async () => {
      const res = createResponse();
      studentService.createAcquisitionSource.mockRejectedValue(new Error('duplicate'));

      await controller.createAcquisitionSource({ body: { source_name: 'Instagram' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create acquisition source', details: 'duplicate' });
    });
  });

  describe('action reasons', () => {
    it.each(['transfer', 'delete'])('lists the %s reasons', async (type) => {
      const res = createResponse();
      studentService.listActionReasons.mockResolvedValue([]);

      await controller.getActionReasons({ query: { type } }, res);

      expect(studentService.listActionReasons).toHaveBeenCalledWith(type);
    });

    it('refuses an unknown reason type', async () => {
      const res = createResponse();

      await controller.getActionReasons({ query: { type: 'archive' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'type must be transfer or delete' });
    });

    it('reports a read failure as a 500', async () => {
      const res = createResponse();
      studentService.listActionReasons.mockRejectedValue(new Error('offline'));

      await controller.getActionReasons({ query: { type: 'delete' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch action reasons', details: 'offline' });
    });

    it('refuses an unknown reason type on create', async () => {
      const res = createResponse();

      await controller.createActionReason({ body: { reason_type: 'archive', reason_name: 'Moved' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'reason_type must be transfer or delete' });
    });

    it('requires a non-blank reason name', async () => {
      const res = createResponse();

      await controller.createActionReason({ body: { reason_type: 'delete', reason_name: '  ' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'reason_name is required' });
    });

    it('trims the reason name before storing it', async () => {
      const res = createResponse();
      studentService.createActionReason.mockResolvedValue({ reason_id: 3 });

      await controller.createActionReason({ body: { reason_type: 'transfer', reason_name: '  Moved city ' } }, res);

      expect(studentService.createActionReason).toHaveBeenCalledWith('transfer', 'Moved city');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('reports a write failure as a 500', async () => {
      const res = createResponse();
      studentService.createActionReason.mockRejectedValue(new Error('duplicate'));

      await controller.createActionReason({ body: { reason_type: 'transfer', reason_name: 'Moved' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create action reason', details: 'duplicate' });
    });
  });

  describe('getAllStudents', () => {
    it('keeps students out of the roster', async () => {
      const res = createResponse();

      await controller.getAllStudents({ query: {}, user: { userType: 'student', id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
    });

    it('falls back to the unpaginated listing when the query carries no list parameters', async () => {
      const res = createResponse();
      studentService.listStudents.mockResolvedValue([{ student_id: 1 }]);

      await controller.getAllStudents({ query: {}, user: { userType: 'teacher', id: 7 } }, res);

      expect(studentService.listStudents).toHaveBeenCalledWith(2, 7);
      expect(studentService.listStudentsPaginated).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ student_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.listStudents.mockRejectedValue(new Error('offline'));

      await controller.getAllStudents({ query: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch students', details: 'offline' });
    });
  });

  describe('getStudentById', () => {
    it('refuses a request with no center scope', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await controller.getStudentById({ params: { id: '9' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it('stops a student reading another student profile', async () => {
      const res = createResponse();

      await controller.getStudentById({ params: { id: '9' }, user: { userType: 'student', id: 4 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
    });

    it('lets a student read their own profile', async () => {
      const res = createResponse();
      studentService.getStudent.mockResolvedValue({ student_id: 9 });

      await controller.getStudentById({ params: { id: '9' }, user: { userType: 'student', id: 9 } }, res);

      expect(res.json).toHaveBeenCalledWith({ student_id: 9 });
    });

    it('returns 404 when the student is out of scope', async () => {
      const res = createResponse();
      studentService.getStudent.mockResolvedValue(null);

      await controller.getStudentById({ params: { id: '9' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.getStudent.mockRejectedValue(new Error('bad id'));

      await controller.getStudentById({ params: { id: '9' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch student', details: 'bad id' });
    });
  });

  describe('getDeletedStudents', () => {
    it('lists the soft-deleted students in the scoped center', async () => {
      const res = createResponse();
      studentService.listDeletedStudents.mockResolvedValue([{ student_id: 5 }]);

      await controller.getDeletedStudents({ user: admin }, res);

      expect(studentService.listDeletedStudents).toHaveBeenCalledWith(2);
      expect(res.json).toHaveBeenCalledWith([{ student_id: 5 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.listDeletedStudents.mockRejectedValue(new Error('offline'));

      await controller.getDeletedStudents({ user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch deleted students', details: 'offline' });
    });
  });

  describe('getClassStudentsWithTransfers', () => {
    it('refuses a request with no center scope', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await controller.getClassStudentsWithTransfers({ params: { classId: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('stops a student reading a class they are not enrolled in', async () => {
      const res = createResponse();

      await controller.getClassStudentsWithTransfers({
        params: { classId: '3' },
        user: { userType: 'student', id: 9, class_id: 8 },
      }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
    });

    it('lets a student read their own class', async () => {
      const res = createResponse();
      studentService.listClassStudentsWithTransfers.mockResolvedValue([]);

      await controller.getClassStudentsWithTransfers({
        params: { classId: '3' },
        user: { userType: 'student', id: 9, class_id: '3' },
      }, res);

      expect(studentService.listClassStudentsWithTransfers).toHaveBeenCalledWith(3, 2, undefined);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.listClassStudentsWithTransfers.mockRejectedValue(new Error('offline'));

      await controller.getClassStudentsWithTransfers({ params: { classId: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch class students', details: 'offline' });
    });
  });

  describe('createStudent', () => {
    it('makes a superuser name a center', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await controller.createStudent({ body: {}, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });

    it('reports a duplicate enrollment number as a conflict', async () => {
      const res = createResponse();
      const error = new Error('duplicate key');
      error.code = '23505';
      error.constraint = 'students_enrollment_number_key';
      studentService.createStudent.mockRejectedValue(error);

      await controller.createStudent({ body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Enrollment number already exists' }));
    });

    it('reports any other database failure as a 500', async () => {
      const res = createResponse();
      studentService.createStudent.mockRejectedValue(new Error('insert failed'));

      await controller.createStudent({ body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create student', message: 'insert failed' });
    });
  });

  describe('updateStudent', () => {
    it('strips the freeze and ownership fields from a teacher edit', async () => {
      const res = createResponse();
      studentService.updateStudent.mockResolvedValue({ student_id: 9 });

      await controller.updateStudent({
        params: { id: '9' },
        body: { first_name: 'Ada', is_frozen: true, teacher_id: 99 },
        user: { userType: 'teacher', id: 7 },
      }, res);

      expect(studentService.updateStudent).toHaveBeenCalledWith(9, { first_name: 'Ada' }, 2, 7);
    });

    it('keeps the freeze field for an administrator', async () => {
      const res = createResponse();
      studentService.updateStudent.mockResolvedValue({ student_id: 9 });

      await controller.updateStudent({
        params: { id: '9' },
        body: { is_frozen: true },
        user: admin,
      }, res);

      expect(studentService.updateStudent).toHaveBeenCalledWith(9, { is_frozen: true }, 2, undefined);
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      studentService.updateStudent.mockResolvedValue(null);

      await controller.updateStudent({ params: { id: '9' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.updateStudent.mockRejectedValue(new Error('conflict'));

      await controller.updateStudent({ params: { id: '9' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update student', details: 'conflict' });
    });
  });

  describe('deleteStudent', () => {
    it('keeps students out of the delete path', async () => {
      const res = createResponse();

      await controller.deleteStudent({ params: { id: '9' }, body: {}, user: { userType: 'student', id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(studentService.deleteStudent).not.toHaveBeenCalled();
    });

    it('passes the reason and teacher scope through', async () => {
      const res = createResponse();
      studentService.deleteStudent.mockResolvedValue({ student_id: 9 });

      await controller.deleteStudent({
        params: { id: '9' },
        body: { reason_id: '4' },
        user: { userType: 'teacher', id: 7 },
      }, res);

      expect(studentService.deleteStudent).toHaveBeenCalledWith(9, 4, 2, 7);
      expect(res.json).toHaveBeenCalledWith({ message: 'Student deleted successfully', student: { student_id: 9 } });
    });

    it('returns 404 when the student is out of scope', async () => {
      const res = createResponse();
      studentService.deleteStudent.mockResolvedValue(null);

      await controller.deleteStudent({ params: { id: '9' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.deleteStudent.mockRejectedValue(new Error('locked'));

      await controller.deleteStudent({ params: { id: '9' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete student', details: 'locked' });
    });
  });

  describe('purgeStudent', () => {
    it('keeps students out of the purge path', async () => {
      const res = createResponse();

      await controller.purgeStudent({ params: { id: '9' }, user: { userType: 'student', id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('permanently removes a soft-deleted student', async () => {
      const res = createResponse();
      studentService.purgeStudent.mockResolvedValue({ student_id: 9 });

      await controller.purgeStudent({ params: { id: '9' }, user: admin }, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Student permanently deleted', student: { student_id: 9 } });
    });

    it('returns 404 when no soft-deleted student matches', async () => {
      const res = createResponse();
      studentService.purgeStudent.mockResolvedValue(null);

      await controller.purgeStudent({ params: { id: '9' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Soft-deleted student not found' });
    });

    it('explains a foreign key violation rather than returning a bare 500', async () => {
      const res = createResponse();
      const error = new Error('violates foreign key constraint');
      error.code = '23503';
      error.detail = 'still referenced from table "payments"';
      studentService.purgeStudent.mockRejectedValue(error);

      await controller.purgeStudent({ params: { id: '9' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Student is still referenced by other records',
        details: 'still referenced from table "payments"',
      }));
    });

    it('reports any other failure as a 500', async () => {
      const res = createResponse();
      studentService.purgeStudent.mockRejectedValue(new Error('boom'));

      await controller.purgeStudent({ params: { id: '9' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to permanently delete student', details: 'boom' });
    });
  });

  describe('transferStudent', () => {
    it('keeps students out of the transfer path', async () => {
      const res = createResponse();

      await controller.transferStudent({ params: { id: '9' }, body: {}, user: { userType: 'student', id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it.each([
      ['not_found', 404, { error: 'Student not found' }],
      ['target_class_not_found', 404, { error: 'Target class not found' }],
      ['same_class', 400, { error: 'Student is already in this class' }],
    ])('maps the %s result to a %d', async (error, status, payload) => {
      const res = createResponse();
      studentService.transferStudent.mockResolvedValue({ error });

      await controller.transferStudent({ params: { id: '9' }, body: { target_class_id: 3, reason_id: 4 }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it('returns both the transfer record and the updated student', async () => {
      const res = createResponse();
      studentService.transferStudent.mockResolvedValue({
        transferred: { transfer_id: 1 },
        student: { student_id: 9, class_id: 3 },
      });

      await controller.transferStudent({
        params: { id: '9' },
        body: { target_class_id: '3', reason_id: '4' },
        user: { userType: 'teacher', id: 7 },
      }, res);

      expect(studentService.transferStudent).toHaveBeenCalledWith(9, 3, 4, 2, 7);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Student transferred successfully',
        transferred_student: { transfer_id: 1 },
        student: { student_id: 9, class_id: 3 },
      });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.transferStudent.mockRejectedValue(new Error('transfer failed'));

      await controller.transferStudent({ params: { id: '9' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to transfer student', details: 'transfer failed' });
    });
  });

  describe('studentLogin', () => {
    it('refuses an inactive account with a distinct 403', async () => {
      const res = createResponse();
      studentService.authenticate.mockResolvedValue({ kind: 'inactive' });

      await controller.studentLogin({ body: { username: 'ada', password: 'pw' } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student account is not active' });
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('gives the same message for an unknown user and a bad password', async () => {
      const res = createResponse();
      studentService.authenticate.mockResolvedValue({ kind: 'not_found' });

      await controller.studentLogin({ body: { username: 'ghost', password: 'pw' } }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid username or password' });
    });

    it('issues a token carrying the class, center and freeze state, and returns no hash', async () => {
      const res = createResponse();
      studentService.authenticate.mockResolvedValue({
        kind: 'ok',
        student: {
          student_id: 9,
          first_name: 'Ada',
          last_name: 'Lovelace',
          email: 'ada@example.com',
          class_id: 3,
          center_id: 2,
          is_frozen: 1,
          password_hash: 'secret',
        },
      });
      generateToken.mockReturnValue('signed-token');

      await controller.studentLogin({ body: { username: 'ada', password: 'pw' } }, res);

      expect(generateToken).toHaveBeenCalledWith({
        id: 9,
        email: 'ada@example.com',
        userType: 'student',
        class_id: 3,
        center_id: 2,
        is_frozen: true,
      });
      const body = res.json.mock.calls[0][0];
      expect(body.token).toBe('signed-token');
      expect(body.student).not.toHaveProperty('password_hash');
      expect(body.student.is_frozen).toBe(true);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.authenticate.mockRejectedValue(new Error('auth down'));

      await controller.studentLogin({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to login', details: 'auth down' });
    });
  });

  describe('setStudentPassword', () => {
    it('refuses a request with no center scope', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await controller.setStudentPassword({ params: { id: '9' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each(['teacher', 'student'])('refuses a %s setting a password for somebody else', async (userType) => {
      const res = createResponse();

      await controller.setStudentPassword({ params: { id: '9' }, body: {}, user: { userType, id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
      expect(studentService.setPasswordByAdmin).not.toHaveBeenCalled();
    });

    it('sets the credential and echoes no password back', async () => {
      const res = createResponse();
      studentService.setPasswordByAdmin.mockResolvedValue({ student_id: 9, username: 'ada' });

      await controller.setStudentPassword({
        params: { id: '9' },
        body: { username: 'ada', password: 'pw' },
        user: admin,
      }, res);

      expect(studentService.setPasswordByAdmin).toHaveBeenCalledWith(9, 'ada', 'pw', 2);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Student password set successfully',
        student: { student_id: 9, username: 'ada' },
      });
    });

    it('returns 404 when the student is out of scope', async () => {
      const res = createResponse();
      studentService.setPasswordByAdmin.mockResolvedValue(null);

      await controller.setStudentPassword({ params: { id: '9' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.setPasswordByAdmin.mockRejectedValue(new Error('hash failed'));

      await controller.setStudentPassword({ params: { id: '9' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to set password', details: 'hash failed' });
    });
  });

  describe('changeStudentPassword', () => {
    it('refuses a teacher changing a student password', async () => {
      const res = createResponse();

      await controller.changeStudentPassword({ params: { id: '9' }, body: {}, user: { userType: 'teacher', id: 7 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(studentService.changePassword).not.toHaveBeenCalled();
    });

    it('stops a student changing another student password', async () => {
      const res = createResponse();

      await controller.changeStudentPassword({ params: { id: '9' }, body: {}, user: { userType: 'student', id: 4 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
    });

    it('returns 404 when the account does not exist', async () => {
      const res = createResponse();
      studentService.changePassword.mockResolvedValue({ ok: false, reason: 'not_found' });

      await controller.changeStudentPassword({ params: { id: '9' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student not found' });
    });

    it('refuses a wrong current password', async () => {
      const res = createResponse();
      studentService.changePassword.mockResolvedValue({ ok: false, reason: 'bad_password' });

      await controller.changeStudentPassword({ params: { id: '9' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Current password is incorrect' });
    });

    it('lets a student change their own password', async () => {
      const res = createResponse();
      studentService.changePassword.mockResolvedValue({ ok: true });

      await controller.changeStudentPassword({
        params: { id: '9' },
        body: { old_password: 'old', new_password: 'new' },
        user: { userType: 'student', id: 9 },
      }, res);

      expect(studentService.changePassword).toHaveBeenCalledWith(9, 'old', 'new');
      expect(res.json).toHaveBeenCalledWith({ message: 'Password changed successfully' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.changePassword.mockRejectedValue(new Error('hash failed'));

      await controller.changeStudentPassword({ params: { id: '9' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to change password', details: 'hash failed' });
    });
  });
});
