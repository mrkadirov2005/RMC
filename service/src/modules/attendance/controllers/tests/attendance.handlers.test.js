jest.mock('../../services/attendance.service', () => ({
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  byStudent: jest.fn(),
  byClass: jest.fn(),
  bySession: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

jest.mock('../../../../shared/tenantDb', () => ({
  studentBelongsToTeacher: jest.fn(),
}));

const attendanceController = require('../attendance.controller');
const attendanceService = require('../../services/attendance.service');
const { getScopedCenterId } = require('../../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('attendance controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 5, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getAllAttendance', {}],
      ['getAttendanceById', { params: { id: '1' } }],
      ['createAttendance', { body: {} }],
      ['updateAttendance', { params: { id: '1' }, body: {} }],
      ['getAttendanceByStudent', { params: { studentId: '2' } }],
      ['getAttendanceByClass', { params: { classId: '3' } }],
      ['getAttendanceBySession', { params: { sessionId: '4' } }],
      ['deleteAttendance', { params: { id: '1' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await attendanceController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each(handlers.filter(([name]) => name !== 'getAttendanceBySession'))(
      '%s makes a superuser name a center',
      async (handler, req) => {
        getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
        const res = createResponse();

        await attendanceController[handler]({ ...req, user: { userType: 'superuser' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
      },
    );
  });

  describe('getAllAttendance', () => {
    it('narrows the listing to the calling teacher', async () => {
      const res = createResponse();
      attendanceService.list.mockResolvedValue([{ attendance_id: 1 }]);

      await attendanceController.getAllAttendance({ user: { userType: 'teacher', id: 4 } }, res);

      expect(attendanceService.list).toHaveBeenCalledWith(5, 4);
      expect(res.json).toHaveBeenCalledWith([{ attendance_id: 1 }]);
    });

    it('leaves an admin listing unfiltered by teacher', async () => {
      const res = createResponse();
      attendanceService.list.mockResolvedValue([]);

      await attendanceController.getAllAttendance({ user: { userType: 'admin', id: 1 } }, res);

      expect(attendanceService.list).toHaveBeenCalledWith(5, undefined);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      attendanceService.list.mockRejectedValue(new Error('offline'));

      await attendanceController.getAllAttendance({ user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch attendance', details: 'offline' });
    });
  });

  describe('getAttendanceById', () => {
    it('returns 404 when the record is out of scope', async () => {
      const res = createResponse();
      attendanceService.getById.mockResolvedValue(null);

      await attendanceController.getAttendanceById({ params: { id: '8' }, user: {} }, res);

      expect(attendanceService.getById).toHaveBeenCalledWith(8, 5, undefined);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Attendance not found' });
    });

    it('stops a student reading another student record', async () => {
      const res = createResponse();
      attendanceService.getById.mockResolvedValue({ attendance_id: 8, student_id: 2 });

      await attendanceController.getAttendanceById({ params: { id: '8' }, user: { userType: 'student', id: 3 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
    });

    it('returns the student own record', async () => {
      const res = createResponse();
      attendanceService.getById.mockResolvedValue({ attendance_id: 8, student_id: 3 });

      await attendanceController.getAttendanceById({ params: { id: '8' }, user: { userType: 'student', id: 3 } }, res);

      expect(res.json).toHaveBeenCalledWith({ attendance_id: 8, student_id: 3 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      attendanceService.getById.mockRejectedValue(new Error('bad id'));

      await attendanceController.getAttendanceById({ params: { id: '8' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch attendance', details: 'bad id' });
    });
  });

  describe('createAttendance', () => {
    it('defaults a missing teacher_id to the caller', async () => {
      const res = createResponse();
      attendanceService.create.mockResolvedValue({ attendance_id: 1 });

      await attendanceController.createAttendance({ body: { student_id: 2 }, user: { userType: 'admin', id: 9 } }, res);

      expect(attendanceService.create).toHaveBeenCalledWith({ student_id: 2, teacher_id: 9 }, 5);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('rejects the record when neither the body nor the session names a teacher', async () => {
      const res = createResponse();

      await attendanceController.createAttendance({ body: { student_id: 2 }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Teacher ID is required.' });
      expect(attendanceService.create).not.toHaveBeenCalled();
    });

    it('keeps an explicit teacher_id', async () => {
      const res = createResponse();
      attendanceService.create.mockResolvedValue({ attendance_id: 1 });

      await attendanceController.createAttendance({ body: { student_id: 2, teacher_id: 14 }, user: { id: 9 } }, res);

      expect(attendanceService.create).toHaveBeenCalledWith({ student_id: 2, teacher_id: 14 }, 5);
    });

    it('stops a teacher marking a student who is not theirs', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(false);

      await attendanceController.createAttendance({ body: { student_id: 2 }, user: { userType: 'teacher', id: 4 } }, res);

      expect(studentBelongsToTeacher).toHaveBeenCalledWith(2, 4);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student does not belong to this teacher.' });
      expect(attendanceService.create).not.toHaveBeenCalled();
    });

    it('lets a teacher mark their own student', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(true);
      attendanceService.create.mockResolvedValue({ attendance_id: 2 });

      await attendanceController.createAttendance({ body: { student_id: 2 }, user: { userType: 'teacher', id: 4 } }, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ attendance_id: 2 });
    });

    it('rejects a record whose student sits in another center', async () => {
      const res = createResponse();
      attendanceService.create.mockResolvedValue({ error: 'invalid_center' });

      await attendanceController.createAttendance({ body: { student_id: 2 }, user: { userType: 'admin', id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student does not belong to this center.' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      attendanceService.create.mockRejectedValue(new Error('insert failed'));

      await attendanceController.createAttendance({ body: { student_id: 2 }, user: { id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create attendance', details: 'insert failed' });
    });
  });

  describe('updateAttendance', () => {
    it('passes the teacher scope through', async () => {
      const res = createResponse();
      attendanceService.update.mockResolvedValue({ attendance_id: 8 });

      await attendanceController.updateAttendance({ params: { id: '8' }, body: { status: 'Present' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(attendanceService.update).toHaveBeenCalledWith(8, { status: 'Present' }, 5, 4);
      expect(res.json).toHaveBeenCalledWith({ attendance_id: 8 });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      attendanceService.update.mockResolvedValue(null);

      await attendanceController.updateAttendance({ params: { id: '8' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Attendance not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      attendanceService.update.mockRejectedValue(new Error('conflict'));

      await attendanceController.updateAttendance({ params: { id: '8' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update attendance', details: 'conflict' });
    });
  });

  describe('getAttendanceByStudent', () => {
    it('stops a student reading another student record', async () => {
      const res = createResponse();

      await attendanceController.getAttendanceByStudent({ params: { studentId: '2' }, user: { userType: 'student', id: 3 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(attendanceService.byStudent).not.toHaveBeenCalled();
    });

    it('stops a teacher reading a student who is not theirs', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(false);

      await attendanceController.getAttendanceByStudent({ params: { studentId: '2' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student does not belong to this teacher.' });
    });

    it('returns the records for an allowed teacher', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(true);
      attendanceService.byStudent.mockResolvedValue([{ attendance_id: 1 }]);

      await attendanceController.getAttendanceByStudent({ params: { studentId: '2' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(attendanceService.byStudent).toHaveBeenCalledWith(2, 5, 4);
      expect(res.json).toHaveBeenCalledWith([{ attendance_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      attendanceService.byStudent.mockRejectedValue(new Error('lookup failed'));

      await attendanceController.getAttendanceByStudent({ params: { studentId: '2' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch attendance', details: 'lookup failed' });
    });
  });

  describe('getAttendanceByClass', () => {
    it('returns class attendance scoped to the teacher', async () => {
      const res = createResponse();
      attendanceService.byClass.mockResolvedValue([{ attendance_id: 3 }]);

      await attendanceController.getAttendanceByClass({ params: { classId: '6' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(attendanceService.byClass).toHaveBeenCalledWith(6, 5, 4);
      expect(res.json).toHaveBeenCalledWith([{ attendance_id: 3 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      attendanceService.byClass.mockRejectedValue(new Error('no class'));

      await attendanceController.getAttendanceByClass({ params: { classId: '6' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch attendance', details: 'no class' });
    });
  });

  describe('getAttendanceBySession', () => {
    it('returns session attendance scoped to the teacher', async () => {
      const res = createResponse();
      attendanceService.bySession.mockResolvedValue([{ attendance_id: 4 }]);

      await attendanceController.getAttendanceBySession({ params: { sessionId: '7' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(attendanceService.bySession).toHaveBeenCalledWith(7, 5, 4);
      expect(res.json).toHaveBeenCalledWith([{ attendance_id: 4 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      attendanceService.bySession.mockRejectedValue(new Error('no session'));

      await attendanceController.getAttendanceBySession({ params: { sessionId: '7' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch attendance', details: 'no session' });
    });
  });

  describe('deleteAttendance', () => {
    it('confirms the deletion and echoes the removed row', async () => {
      const res = createResponse();
      attendanceService.remove.mockResolvedValue({ attendance_id: 8 });

      await attendanceController.deleteAttendance({ params: { id: '8' }, user: {} }, res);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Attendance record deleted successfully',
        attendance: { attendance_id: 8 },
      });
    });

    it('returns 404 when the record is out of scope', async () => {
      const res = createResponse();
      attendanceService.remove.mockResolvedValue(null);

      await attendanceController.deleteAttendance({ params: { id: '8' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Attendance record not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      attendanceService.remove.mockRejectedValue(new Error('locked'));

      await attendanceController.deleteAttendance({ params: { id: '8' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete attendance', details: 'locked' });
    });
  });
});
