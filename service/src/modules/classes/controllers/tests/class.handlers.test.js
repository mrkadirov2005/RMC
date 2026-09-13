jest.mock('../../services/class.service', () => ({
  listClasses: jest.fn(),
  listClassesPaginated: jest.fn(),
  getClass: jest.fn(),
  createClass: jest.fn(),
  updateClass: jest.fn(),
  deleteClass: jest.fn(),
  purgeClass: jest.fn(),
}));

jest.mock('../../../sessions/services/session.service', () => ({
  listByClass: jest.fn(),
  listByClasses: jest.fn(),
  generateMonthlySessions: jest.fn(),
  deleteUpcomingSessions: jest.fn(),
  deleteSessionById: jest.fn(),
  purgeSessionById: jest.fn(),
  createSession: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const controller = require('../class.controller');
const classService = require('../../services/class.service');
const sessionService = require('../../../sessions/services/session.service');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const admin = { userType: 'admin', id: 1 };
const teacher = { userType: 'teacher', id: 7 };
const student = { userType: 'student', id: 9, class_id: 3 };

describe('classes controller handlers', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 4, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getAllClasses', { query: {} }],
      ['getClassById', { params: { id: '3' } }],
      ['createClass', { body: {} }],
      ['updateClass', { params: { id: '3' }, body: {} }],
      ['deleteClass', { params: { id: '3' }, query: {} }],
      ['purgeClass', { params: { id: '3' } }],
      ['getClassSessions', { params: { id: '3' } }],
      ['getBulkClassSessions', { query: {} }],
      ['generateClassSessions', { params: { id: '3' }, body: {} }],
      ['deleteUpcomingClassSessions', { params: { id: '3' }, query: {}, body: {} }],
      ['deleteClassSessionById', { params: { id: '3', sessionId: '5' } }],
      ['purgeClassSessionById', { params: { id: '3', sessionId: '5' } }],
      ['createClassSession', { params: { id: '3' }, body: {} }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await controller[handler]({ ...req, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each([
      ['createClass', { body: {} }],
      ['deleteUpcomingClassSessions', { params: { id: '3' }, query: {}, body: {} }],
      ['deleteClassSessionById', { params: { id: '3', sessionId: '5' } }],
      ['purgeClassSessionById', { params: { id: '3', sessionId: '5' } }],
    ])('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await controller[handler]({ ...req, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });
  });

  describe('handlers closed to students', () => {
    it.each([
      ['getAllClasses', { query: {} }],
      ['getBulkClassSessions', { query: {} }],
      ['generateClassSessions', { params: { id: '3' }, body: {} }],
      ['deleteUpcomingClassSessions', { params: { id: '3' }, query: {}, body: {} }],
      ['deleteClassSessionById', { params: { id: '3', sessionId: '5' } }],
      ['purgeClassSessionById', { params: { id: '3', sessionId: '5' } }],
    ])('%s refuses a student', async (handler, req) => {
      const res = createResponse();

      await controller[handler]({ ...req, user: student }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
    });
  });

  describe('getAllClasses', () => {
    it('falls back to the unpaginated listing when the query carries no list parameters', async () => {
      const res = createResponse();
      classService.listClasses.mockResolvedValue([{ class_id: 1 }]);

      await controller.getAllClasses({ query: {}, user: teacher }, res);

      expect(classService.listClasses).toHaveBeenCalledWith(4, 7);
      expect(classService.listClassesPaginated).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ class_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      classService.listClasses.mockRejectedValue(new Error('offline'));

      await controller.getAllClasses({ query: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch classes', details: 'offline' });
    });
  });

  describe('getClassById', () => {
    it('stops a student reading a class they are not enrolled in', async () => {
      const res = createResponse();

      await controller.getClassById({ params: { id: '8' }, user: student }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
    });

    it('lets a student read their own class', async () => {
      const res = createResponse();
      classService.getClass.mockResolvedValue({ class_id: 3 });

      await controller.getClassById({ params: { id: '3' }, user: student }, res);

      expect(res.json).toHaveBeenCalledWith({ class_id: 3 });
    });

    it('returns 404 when the class is out of scope', async () => {
      const res = createResponse();
      classService.getClass.mockResolvedValue(null);

      await controller.getClassById({ params: { id: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Class not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      classService.getClass.mockRejectedValue(new Error('bad id'));

      await controller.getClassById({ params: { id: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch class', details: 'bad id' });
    });
  });

  describe('createClass', () => {
    it.each([
      ['bad_teacher', 'Teacher not found. Please provide a valid teacher_id'],
      ['bad_subject', 'Select an available subject created for this center.'],
    ])('maps the %s result to a 400', async (error, message) => {
      const res = createResponse();
      classService.createClass.mockResolvedValue({ error });

      await controller.createClass({ body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: message });
    });

    it('returns the created class row', async () => {
      const res = createResponse();
      classService.createClass.mockResolvedValue({ row: { class_id: 8 } });

      await controller.createClass({ body: { class_name: 'A1' }, user: admin }, res);

      expect(classService.createClass).toHaveBeenCalledWith({ class_name: 'A1' }, 4);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ class_id: 8 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      classService.createClass.mockRejectedValue(new Error('insert failed'));

      await controller.createClass({ body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create class', details: 'insert failed' });
    });
  });

  describe('updateClass', () => {
    it('refuses a subject from another center', async () => {
      const res = createResponse();
      classService.updateClass.mockResolvedValue({ error: 'bad_subject' });

      await controller.updateClass({ params: { id: '3' }, body: { subject_id: 9 }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Select an available subject created for this center.' });
    });

    it('returns the updated class', async () => {
      const res = createResponse();
      classService.updateClass.mockResolvedValue({ class_id: 3 });

      await controller.updateClass({ params: { id: '3' }, body: { class_name: 'B2' }, user: admin }, res);

      expect(classService.updateClass).toHaveBeenCalledWith(3, { class_name: 'B2' }, 4);
      expect(res.json).toHaveBeenCalledWith({ class_id: 3 });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      classService.updateClass.mockResolvedValue(null);

      await controller.updateClass({ params: { id: '3' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      classService.updateClass.mockRejectedValue(new Error('conflict'));

      await controller.updateClass({ params: { id: '3' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update class', details: 'conflict' });
    });
  });

  describe('deleteClass', () => {
    it('refuses a class that still has attendance and lists the blocking records', async () => {
      const res = createResponse();
      classService.deleteClass.mockResolvedValue({
        error: 'has_attendance',
        attendance: [{ attendance_id: 1, student_id: 9, class_id: 3, status: 'Present', extra: 'dropped' }],
      });

      await controller.deleteClass({ params: { id: '3' }, query: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      const body = res.json.mock.calls[0][0];
      expect(body.attendance_count).toBe(1);
      expect(body.attendance[0]).not.toHaveProperty('extra');
    });

    it('reports a count of zero when the service names no attendance rows', async () => {
      const res = createResponse();
      classService.deleteClass.mockResolvedValue({ error: 'has_attendance' });

      await controller.deleteClass({ params: { id: '3' }, query: {}, user: admin }, res);

      expect(res.json).toHaveBeenCalledWith({ error: 'Class has attendance records', attendance_count: 0, attendance: [] });
    });

    it('passes the force flag through when the query asks for it', async () => {
      const res = createResponse();
      classService.deleteClass.mockResolvedValue({ row: { class_id: 3 }, deletedSessionCount: 6 });

      await controller.deleteClass({ params: { id: '3' }, query: { force: 'TRUE' }, user: admin }, res);

      expect(classService.deleteClass).toHaveBeenCalledWith(3, 4, { force: true });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Class deleted successfully',
        class: { class_id: 3 },
        deleted_session_count: 6,
      });
    });

    it('defaults the force flag to false', async () => {
      const res = createResponse();
      classService.deleteClass.mockResolvedValue({ row: { class_id: 3 } });

      await controller.deleteClass({ params: { id: '3' }, query: {}, user: admin }, res);

      expect(classService.deleteClass).toHaveBeenCalledWith(3, 4, { force: false });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ deleted_session_count: 0 }));
    });

    it('returns 404 when the class is out of scope', async () => {
      const res = createResponse();
      classService.deleteClass.mockResolvedValue({});

      await controller.deleteClass({ params: { id: '3' }, query: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Class not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      classService.deleteClass.mockRejectedValue(new Error('locked'));

      await controller.deleteClass({ params: { id: '3' }, query: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete class', details: 'locked' });
    });
  });

  describe('purgeClass', () => {
    it('permanently removes a soft-deleted class', async () => {
      const res = createResponse();
      classService.purgeClass.mockResolvedValue({ row: { class_id: 3 } });

      await controller.purgeClass({ params: { id: '3' }, user: admin }, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Class permanently deleted', class: { class_id: 3 } });
    });

    it('returns 404 when no soft-deleted class matches', async () => {
      const res = createResponse();
      classService.purgeClass.mockResolvedValue({});

      await controller.purgeClass({ params: { id: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Soft-deleted class not found' });
    });

    it('explains a foreign key violation rather than returning a bare 500', async () => {
      const res = createResponse();
      const error = new Error('violates foreign key constraint');
      error.code = '23503';
      error.detail = 'still referenced from table "sessions"';
      classService.purgeClass.mockRejectedValue(error);

      await controller.purgeClass({ params: { id: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Class is still referenced by other records',
        details: 'still referenced from table "sessions"',
      }));
    });

    it('reports any other failure as a 500', async () => {
      const res = createResponse();
      classService.purgeClass.mockRejectedValue(new Error('boom'));

      await controller.purgeClass({ params: { id: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to permanently delete class', details: 'boom' });
    });
  });

  describe('getClassSessions', () => {
    it('stops a student reading another class timetable', async () => {
      const res = createResponse();

      await controller.getClassSessions({ params: { id: '8' }, user: student }, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns the sessions scoped to the calling teacher', async () => {
      const res = createResponse();
      sessionService.listByClass.mockResolvedValue([{ session_id: 1 }]);

      await controller.getClassSessions({ params: { id: '3' }, user: teacher }, res);

      expect(sessionService.listByClass).toHaveBeenCalledWith(3, 4, 7);
      expect(res.json).toHaveBeenCalledWith([{ session_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      sessionService.listByClass.mockRejectedValue(new Error('offline'));

      await controller.getClassSessions({ params: { id: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch sessions', details: 'offline' });
    });
  });

  describe('getBulkClassSessions', () => {
    it('answers with an empty list when no class ids are given', async () => {
      const res = createResponse();

      await controller.getBulkClassSessions({ query: {}, user: admin }, res);

      expect(res.json).toHaveBeenCalledWith([]);
      expect(sessionService.listByClasses).not.toHaveBeenCalled();
    });

    it('drops blank, non-numeric and non-positive ids from the list', async () => {
      const res = createResponse();
      sessionService.listByClasses.mockResolvedValue([]);

      await controller.getBulkClassSessions({ query: { class_ids: ' 3 , abc, 0 ,-2, 5 ' }, user: admin }, res);

      expect(sessionService.listByClasses).toHaveBeenCalledWith([3, 5], 4, undefined);
    });

    it('answers with an empty list when every id is unusable', async () => {
      const res = createResponse();

      await controller.getBulkClassSessions({ query: { class_ids: 'abc,,0' }, user: admin }, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      sessionService.listByClasses.mockRejectedValue(new Error('offline'));

      await controller.getBulkClassSessions({ query: { class_ids: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch sessions', details: 'offline' });
    });
  });

  describe('generateClassSessions', () => {
    it('defaults a session to ninety minutes', async () => {
      const res = createResponse();
      sessionService.generateMonthlySessions.mockResolvedValue({ created: 8 });

      await controller.generateClassSessions({ params: { id: '3' }, body: { month: 9, year: 2026 }, user: teacher }, res);

      expect(sessionService.generateMonthlySessions).toHaveBeenCalledWith({
        classId: 3,
        centerId: 4,
        teacherId: 7,
        month: 9,
        year: 2026,
        durationMinutes: 90,
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Sessions generated', created: 8 });
    });

    it('honours an explicit duration', async () => {
      const res = createResponse();
      sessionService.generateMonthlySessions.mockResolvedValue({});

      await controller.generateClassSessions({
        params: { id: '3' },
        body: { month: 9, year: 2026, duration_minutes: 45 },
        user: admin,
      }, res);

      expect(sessionService.generateMonthlySessions).toHaveBeenCalledWith(expect.objectContaining({ durationMinutes: 45 }));
    });

    it.each([
      ['not_found', 404, { error: 'Class not found' }],
      ['missing_schedule', 400, { error: 'Class schedule is missing or invalid.' }],
    ])('maps the %s result to a %d', async (error, status, payload) => {
      const res = createResponse();
      sessionService.generateMonthlySessions.mockResolvedValue({ error });

      await controller.generateClassSessions({ params: { id: '3' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      sessionService.generateMonthlySessions.mockRejectedValue(new Error('generate failed'));

      await controller.generateClassSessions({ params: { id: '3' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to generate sessions', details: 'generate failed' });
    });
  });

  describe('deleteUpcomingClassSessions', () => {
    it('reads the date window from the query string', async () => {
      const res = createResponse();
      sessionService.deleteUpcomingSessions.mockResolvedValue({ deleted: 4 });

      await controller.deleteUpcomingClassSessions({
        params: { id: '3' },
        query: { from: ' 2026-09-01 ', to: '2026-09-30' },
        body: {},
        user: teacher,
      }, res);

      expect(sessionService.deleteUpcomingSessions).toHaveBeenCalledWith({
        classId: 3,
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
        centerId: 4,
        teacherId: 7,
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Sessions deleted', deleted: 4 });
    });

    it('falls back to the body when the query has no window', async () => {
      const res = createResponse();
      sessionService.deleteUpcomingSessions.mockResolvedValue({});

      await controller.deleteUpcomingClassSessions({
        params: { id: '3' },
        query: {},
        body: { from: '2026-10-01' },
        user: admin,
      }, res);

      expect(sessionService.deleteUpcomingSessions).toHaveBeenCalledWith(expect.objectContaining({
        fromDate: '2026-10-01',
        toDate: undefined,
      }));
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      sessionService.deleteUpcomingSessions.mockRejectedValue(new Error('delete failed'));

      await controller.deleteUpcomingClassSessions({ params: { id: '3' }, query: {}, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete sessions', details: 'delete failed' });
    });
  });

  describe('deleteClassSessionById', () => {
    it('requires a usable session id', async () => {
      const res = createResponse();

      await controller.deleteClassSessionById({ params: { id: '3', sessionId: 'abc' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'sessionId is required.' });
    });

    it('deletes the single session', async () => {
      const res = createResponse();
      sessionService.deleteSessionById.mockResolvedValue({ deleted: true });

      await controller.deleteClassSessionById({ params: { id: '3', sessionId: '5' }, user: teacher }, res);

      expect(sessionService.deleteSessionById).toHaveBeenCalledWith({ classId: 3, sessionId: 5, centerId: 4, teacherId: 7 });
      expect(res.json).toHaveBeenCalledWith({ message: 'Session deleted', deleted: true });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      sessionService.deleteSessionById.mockRejectedValue(new Error('delete failed'));

      await controller.deleteClassSessionById({ params: { id: '3', sessionId: '5' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete session', details: 'delete failed' });
    });
  });

  describe('purgeClassSessionById', () => {
    it('requires a usable session id', async () => {
      const res = createResponse();

      await controller.purgeClassSessionById({ params: { id: '3', sessionId: 'abc' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'sessionId is required.' });
    });

    it('returns 404 when no soft-deleted session matches', async () => {
      const res = createResponse();
      sessionService.purgeSessionById.mockResolvedValue({ deleted: false });

      await controller.purgeClassSessionById({ params: { id: '3', sessionId: '5' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Soft-deleted session not found' });
    });

    it('permanently removes the session', async () => {
      const res = createResponse();
      sessionService.purgeSessionById.mockResolvedValue({ deleted: true });

      await controller.purgeClassSessionById({ params: { id: '3', sessionId: '5' }, user: admin }, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Session permanently deleted', deleted: true });
    });

    it('explains a foreign key violation rather than returning a bare 500', async () => {
      const res = createResponse();
      const error = new Error('violates foreign key constraint');
      error.code = '23503';
      error.detail = 'still referenced from table "grades"';
      sessionService.purgeSessionById.mockRejectedValue(error);

      await controller.purgeClassSessionById({ params: { id: '3', sessionId: '5' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Session is still referenced by other records',
      }));
    });

    it('reports any other failure as a 500', async () => {
      const res = createResponse();
      sessionService.purgeSessionById.mockRejectedValue(new Error('boom'));

      await controller.purgeClassSessionById({ params: { id: '3', sessionId: '5' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to permanently delete session', details: 'boom' });
    });
  });

  describe('createClassSession', () => {
    it('forces a teacher to create the session under their own id', async () => {
      const res = createResponse();
      sessionService.createSession.mockResolvedValue({ session_id: 1 });

      await controller.createClassSession({
        params: { id: '3' },
        body: { teacher_id: 99, session_date: '2026-09-01', start_time: '09:00' },
        user: teacher,
      }, res);

      expect(sessionService.createSession).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 7 }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('lets an administrator name the teacher and defaults the length to ninety minutes', async () => {
      const res = createResponse();
      sessionService.createSession.mockResolvedValue({ session_id: 2 });

      await controller.createClassSession({
        params: { id: '3' },
        body: { teacher_id: 12, session_date: '2026-09-01', start_time: '09:00' },
        user: admin,
      }, res);

      expect(sessionService.createSession).toHaveBeenCalledWith({
        classId: 3,
        centerId: 4,
        teacherId: 12,
        sessionDate: '2026-09-01',
        startTime: '09:00',
        durationMinutes: 90,
      });
    });

    it('returns 404 when the class does not exist', async () => {
      const res = createResponse();
      sessionService.createSession.mockResolvedValue({ error: 'not_found' });

      await controller.createClassSession({ params: { id: '3' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Class not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      sessionService.createSession.mockRejectedValue(new Error('insert failed'));

      await controller.createClassSession({ params: { id: '3' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create session', details: 'insert failed' });
    });
  });
});
