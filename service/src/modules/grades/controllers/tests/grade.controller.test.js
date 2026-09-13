jest.mock('../../services/grade.service', () => ({
  listGrades: jest.fn(),
  getGrade: jest.fn(),
  createGrade: jest.fn(),
  updateGrade: jest.fn(),
  listByStudent: jest.fn(),
  listBySession: jest.fn(),
  deleteGrade: jest.fn(),
  createBulk: jest.fn(),
  upsertSessionScores: jest.fn(),
  saveSessionWorkflow: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

jest.mock('../../../../shared/tenantDb', () => ({
  studentBelongsToTeacher: jest.fn(),
}));

const gradeController = require('../grade.controller');
const gradeService = require('../../services/grade.service');
const { getScopedCenterId } = require('../../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('grades controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 7, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getAllGrades', { query: {} }],
      ['getGradeById', { params: { id: '1' } }],
      ['createGrade', { body: {} }],
      ['updateGrade', { params: { id: '1' }, body: {} }],
      ['getGradesByStudent', { params: { studentId: '2' } }],
      ['deleteGrade', { params: { id: '1' } }],
      ['createBulkGrades', { body: { grades: [] } }],
      ['getGradesBySession', { params: { sessionId: '3' } }],
      ['upsertSessionScores', { body: {} }],
      ['saveSessionWorkflow', { body: {} }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await gradeController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    const superuserHandlers = handlers.filter(([name]) => !['getGradesBySession', 'upsertSessionScores', 'saveSessionWorkflow'].includes(name));

    it.each(superuserHandlers)('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await gradeController[handler]({ ...req, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });
  });

  describe('getAllGrades', () => {
    it('narrows the listing to the calling teacher', async () => {
      const res = createResponse();
      gradeService.listGrades.mockResolvedValue([{ grade_id: 1 }]);

      await gradeController.getAllGrades({ query: {}, user: { userType: 'teacher', id: 4 } }, res);

      expect(gradeService.listGrades).toHaveBeenCalledWith(7, 4, undefined);
      expect(res.json).toHaveBeenCalledWith([{ grade_id: 1 }]);
    });

    it('narrows the listing to the calling student', async () => {
      const res = createResponse();
      gradeService.listGrades.mockResolvedValue([]);

      await gradeController.getAllGrades({ query: {}, user: { userType: 'student', id: 9 } }, res);

      expect(gradeService.listGrades).toHaveBeenCalledWith(7, undefined, 9);
    });

    it('reports a service failure as a 500 with the underlying message', async () => {
      const res = createResponse();
      gradeService.listGrades.mockRejectedValue(new Error('connection lost'));

      await gradeController.getAllGrades({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch grades', details: 'connection lost' });
    });
  });

  describe('getGradeById', () => {
    it('returns 404 when the grade is out of scope', async () => {
      const res = createResponse();
      gradeService.getGrade.mockResolvedValue(null);

      await gradeController.getGradeById({ params: { id: '5' }, user: {} }, res);

      expect(gradeService.getGrade).toHaveBeenCalledWith(5, 7, undefined);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Grade not found' });
    });

    it('stops a student reading another student grade', async () => {
      const res = createResponse();
      gradeService.getGrade.mockResolvedValue({ grade_id: 5, student_id: 2 });

      await gradeController.getGradeById({ params: { id: '5' }, user: { userType: 'student', id: 3 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
    });

    it('returns the student own grade', async () => {
      const res = createResponse();
      gradeService.getGrade.mockResolvedValue({ grade_id: 5, student_id: 3 });

      await gradeController.getGradeById({ params: { id: '5' }, user: { userType: 'student', id: 3 } }, res);

      expect(res.json).toHaveBeenCalledWith({ grade_id: 5, student_id: 3 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      gradeService.getGrade.mockRejectedValue(new Error('boom'));

      await gradeController.getGradeById({ params: { id: '5' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch grade', details: 'boom' });
    });
  });

  describe('createGrade', () => {
    it('defaults a missing teacher_id to the caller', async () => {
      const res = createResponse();
      gradeService.createGrade.mockResolvedValue({ grade_id: 1 });

      await gradeController.createGrade({ body: { student_id: 2, teacher_id: 0 }, user: { userType: 'admin', id: 8 } }, res);

      expect(gradeService.createGrade).toHaveBeenCalledWith({ student_id: 2, teacher_id: 8 }, 7);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('keeps an explicit teacher_id', async () => {
      const res = createResponse();
      gradeService.createGrade.mockResolvedValue({ grade_id: 1 });

      await gradeController.createGrade({ body: { student_id: 2, teacher_id: 12 }, user: { userType: 'admin', id: 8 } }, res);

      expect(gradeService.createGrade).toHaveBeenCalledWith({ student_id: 2, teacher_id: 12 }, 7);
    });

    it('stops a teacher grading a student who is not theirs', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(false);

      await gradeController.createGrade({ body: { student_id: 2 }, user: { userType: 'teacher', id: 4 } }, res);

      expect(studentBelongsToTeacher).toHaveBeenCalledWith(2, 4);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student does not belong to this teacher.' });
      expect(gradeService.createGrade).not.toHaveBeenCalled();
    });

    it('lets a teacher grade their own student', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(true);
      gradeService.createGrade.mockResolvedValue({ grade_id: 3 });

      await gradeController.createGrade({ body: { student_id: 2 }, user: { userType: 'teacher', id: 4 } }, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ grade_id: 3 });
    });

    it('rejects a grade whose student or class is in another center', async () => {
      const res = createResponse();
      gradeService.createGrade.mockResolvedValue({ error: 'invalid_center' });

      await gradeController.createGrade({ body: { student_id: 2 }, user: { userType: 'admin', id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student or class does not belong to this center.' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      gradeService.createGrade.mockRejectedValue(new Error('insert failed'));

      await gradeController.createGrade({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create grade', details: 'insert failed' });
    });
  });

  describe('updateGrade', () => {
    it('passes the teacher scope through', async () => {
      const res = createResponse();
      gradeService.updateGrade.mockResolvedValue({ grade_id: 5 });

      await gradeController.updateGrade({ params: { id: '5' }, body: { score: 90 }, user: { userType: 'teacher', id: 4 } }, res);

      expect(gradeService.updateGrade).toHaveBeenCalledWith(5, { score: 90 }, 7, 4);
      expect(res.json).toHaveBeenCalledWith({ grade_id: 5 });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      gradeService.updateGrade.mockResolvedValue(null);

      await gradeController.updateGrade({ params: { id: '5' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      gradeService.updateGrade.mockRejectedValue(new Error('nope'));

      await gradeController.updateGrade({ params: { id: '5' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update grade', details: 'nope' });
    });
  });

  describe('getGradesByStudent', () => {
    it('stops a student reading another student record', async () => {
      const res = createResponse();

      await gradeController.getGradesByStudent({ params: { studentId: '2' }, user: { userType: 'student', id: 3 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(gradeService.listByStudent).not.toHaveBeenCalled();
    });

    it('stops a teacher reading a student who is not theirs', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(false);

      await gradeController.getGradesByStudent({ params: { studentId: '2' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student does not belong to this teacher.' });
    });

    it('returns the records for an allowed teacher', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(true);
      gradeService.listByStudent.mockResolvedValue([{ grade_id: 1 }]);

      await gradeController.getGradesByStudent({ params: { studentId: '2' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(gradeService.listByStudent).toHaveBeenCalledWith(2, 7, 4);
      expect(res.json).toHaveBeenCalledWith([{ grade_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      gradeService.listByStudent.mockRejectedValue(new Error('down'));

      await gradeController.getGradesByStudent({ params: { studentId: '2' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch grades', details: 'down' });
    });
  });

  describe('deleteGrade', () => {
    it('confirms the deletion and echoes the removed row', async () => {
      const res = createResponse();
      gradeService.deleteGrade.mockResolvedValue({ grade_id: 5 });

      await gradeController.deleteGrade({ params: { id: '5' }, user: {} }, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Grade deleted successfully', grade: { grade_id: 5 } });
    });

    it('returns 404 when the grade is out of scope', async () => {
      const res = createResponse();
      gradeService.deleteGrade.mockResolvedValue(null);

      await gradeController.deleteGrade({ params: { id: '5' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      gradeService.deleteGrade.mockRejectedValue(new Error('locked'));

      await gradeController.deleteGrade({ params: { id: '5' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete grade', details: 'locked' });
    });
  });

  describe('createBulkGrades', () => {
    it('rejects the whole batch when one student is not the teacher own', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await gradeController.createBulkGrades({
        body: { grades: [{ student_id: 1 }, { student_id: 2 }] },
        user: { userType: 'teacher', id: 4 },
      }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'One or more students do not belong to this teacher.' });
      expect(gradeService.createBulk).not.toHaveBeenCalled();
    });

    it('rejects the batch when any row lands in another center', async () => {
      const res = createResponse();
      gradeService.createBulk.mockResolvedValue([{ grade_id: 1 }, { error: 'invalid_center' }]);

      await gradeController.createBulkGrades({ body: { grades: [{ student_id: 1 }] }, user: { userType: 'admin' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'One or more grades do not belong to this center.' });
    });

    it('reports how many grades were created', async () => {
      const res = createResponse();
      gradeService.createBulk.mockResolvedValue([{ grade_id: 1 }, { grade_id: 2 }]);

      await gradeController.createBulkGrades({ body: { grades: [{ student_id: 1 }, { student_id: 2 }] }, user: { userType: 'admin' } }, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: '2 grades created successfully',
        grades: [{ grade_id: 1 }, { grade_id: 2 }],
      });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      gradeService.createBulk.mockRejectedValue(new Error('bulk failed'));

      await gradeController.createBulkGrades({ body: { grades: [] }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create bulk grades', details: 'bulk failed' });
    });
  });

  describe('getGradesBySession', () => {
    it('returns session grades scoped to the teacher', async () => {
      const res = createResponse();
      gradeService.listBySession.mockResolvedValue([{ grade_id: 9 }]);

      await gradeController.getGradesBySession({ params: { sessionId: '3' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(gradeService.listBySession).toHaveBeenCalledWith(3, 7, 4);
      expect(res.json).toHaveBeenCalledWith([{ grade_id: 9 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      gradeService.listBySession.mockRejectedValue(new Error('missing session'));

      await gradeController.getGradesBySession({ params: { sessionId: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch grades', details: 'missing session' });
    });
  });

  describe('upsertSessionScores', () => {
    it('requires a session_id', async () => {
      const res = createResponse();
      gradeService.upsertSessionScores.mockResolvedValue({ error: 'session_id_required' });

      await gradeController.upsertSessionScores({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'session_id is required.' });
    });

    it('returns the upsert result', async () => {
      const res = createResponse();
      gradeService.upsertSessionScores.mockResolvedValue({ updated: 3 });

      await gradeController.upsertSessionScores({ body: { session_id: 3 }, user: {} }, res);

      expect(gradeService.upsertSessionScores).toHaveBeenCalledWith({ session_id: 3 }, 7);
      expect(res.json).toHaveBeenCalledWith({ updated: 3 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      gradeService.upsertSessionScores.mockRejectedValue(new Error('upsert failed'));

      await gradeController.upsertSessionScores({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to upsert session scores', details: 'upsert failed' });
    });
  });

  describe('saveSessionWorkflow', () => {
    it('stops a teacher saving records for students who are not theirs', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(false);

      await gradeController.saveSessionWorkflow({
        body: { records: [{ student_id: '2' }] },
        user: { userType: 'teacher', id: 4 },
      }, res);

      expect(studentBelongsToTeacher).toHaveBeenCalledWith(2, 4);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(gradeService.saveSessionWorkflow).not.toHaveBeenCalled();
    });

    it('tolerates a payload with no records array', async () => {
      const res = createResponse();
      gradeService.saveSessionWorkflow.mockResolvedValue({ saved: 0 });

      await gradeController.saveSessionWorkflow({ body: {}, user: { userType: 'teacher', id: 4 } }, res);

      expect(studentBelongsToTeacher).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ saved: 0 });
    });

    it.each([
      ['invalid_payload', 'Invalid session workflow payload.'],
      ['multiple_stellar_students', 'Only one stellar student can be selected per lesson.'],
      ['invalid_center', 'Class does not belong to this center.'],
    ])('maps the %s result to a 400', async (error, message) => {
      const res = createResponse();
      gradeService.saveSessionWorkflow.mockResolvedValue({ error });

      await gradeController.saveSessionWorkflow({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: message });
    });

    it('returns the saved workflow', async () => {
      const res = createResponse();
      gradeService.saveSessionWorkflow.mockResolvedValue({ saved: 4 });

      await gradeController.saveSessionWorkflow({ body: { records: [] }, user: {} }, res);

      expect(res.json).toHaveBeenCalledWith({ saved: 4 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      gradeService.saveSessionWorkflow.mockRejectedValue(new Error('workflow failed'));

      await gradeController.saveSessionWorkflow({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save session workflow', details: 'workflow failed' });
    });
  });
});
