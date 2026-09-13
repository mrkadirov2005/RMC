jest.mock('../../services/assignment.service', () => ({
  getAllAssignments: jest.fn(),
  getAssignmentById: jest.fn(),
  createAssignment: jest.fn(),
  updateAssignment: jest.fn(),
  deleteAssignment: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

jest.mock('../../../../shared/tenantDb', () => ({
  classBelongsToTeacher: jest.fn(),
  classInCenter: jest.fn(),
}));

const assignmentController = require('../assignment.controller');
const assignmentService = require('../../services/assignment.service');
const { getScopedCenterId } = require('../../../../shared/tenant');
const { classBelongsToTeacher, classInCenter } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('assignments controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 7, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getAllAssignments', { query: {} }],
      ['getAssignmentById', { params: { id: '1' } }],
      ['createAssignment', { body: {} }],
      ['updateAssignment', { params: { id: '1' }, body: {} }],
      ['deleteAssignment', { params: { id: '1' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await assignmentController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each(handlers)('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await assignmentController[handler]({ ...req, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });
  });

  describe('getAllAssignments', () => {
    it('defaults to the first page of one hundred rows', async () => {
      const res = createResponse();
      assignmentService.getAllAssignments.mockResolvedValue([]);

      await assignmentController.getAllAssignments({ query: {}, user: { userType: 'admin' } }, res);

      expect(assignmentService.getAllAssignments).toHaveBeenCalledWith({
        centerId: 7,
        teacherId: undefined,
        classId: undefined,
        limit: 100,
        offset: 0,
      });
    });

    it('caps an oversized page size at two hundred', async () => {
      const res = createResponse();
      assignmentService.getAllAssignments.mockResolvedValue([]);

      await assignmentController.getAllAssignments({ query: { limit: '5000', page: '3' }, user: {} }, res);

      expect(assignmentService.getAllAssignments).toHaveBeenCalledWith(expect.objectContaining({
        limit: 200,
        offset: 400,
      }));
    });

    it('raises a page size below one back to a single row', async () => {
      const res = createResponse();
      assignmentService.getAllAssignments.mockResolvedValue([]);

      await assignmentController.getAllAssignments({ query: { limit: '0' }, user: {} }, res);

      expect(assignmentService.getAllAssignments).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }));
    });

    it('treats a page below one as the first page', async () => {
      const res = createResponse();
      assignmentService.getAllAssignments.mockResolvedValue([]);

      await assignmentController.getAllAssignments({ query: { page: '-5' }, user: {} }, res);

      expect(assignmentService.getAllAssignments).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
    });

    it('narrows the listing to the calling teacher and a requested class', async () => {
      const res = createResponse();
      assignmentService.getAllAssignments.mockResolvedValue([{ assignment_id: 1 }]);

      await assignmentController.getAllAssignments({ query: { class_id: '12' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(assignmentService.getAllAssignments).toHaveBeenCalledWith(expect.objectContaining({
        teacherId: 4,
        classId: 12,
      }));
      expect(res.json).toHaveBeenCalledWith([{ assignment_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      assignmentService.getAllAssignments.mockRejectedValue(new Error('offline'));

      await assignmentController.getAllAssignments({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch assignments', details: 'offline' });
    });
  });

  describe('getAssignmentById', () => {
    it('passes the teacher scope through', async () => {
      const res = createResponse();
      assignmentService.getAssignmentById.mockResolvedValue({ assignment_id: 3 });

      await assignmentController.getAssignmentById({ params: { id: '3' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(assignmentService.getAssignmentById).toHaveBeenCalledWith(3, 7, 4);
      expect(res.json).toHaveBeenCalledWith({ assignment_id: 3 });
    });

    it('returns 404 when the assignment is out of scope', async () => {
      const res = createResponse();
      assignmentService.getAssignmentById.mockResolvedValue(null);

      await assignmentController.getAssignmentById({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assignment not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      assignmentService.getAssignmentById.mockRejectedValue(new Error('bad id'));

      await assignmentController.getAssignmentById({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch assignment', details: 'bad id' });
    });
  });

  describe('createAssignment', () => {
    it('stops a teacher assigning work to a class that is not theirs', async () => {
      const res = createResponse();
      classBelongsToTeacher.mockResolvedValue(false);

      await assignmentController.createAssignment({ body: { class_id: 12 }, user: { userType: 'teacher', id: 4 } }, res);

      expect(classBelongsToTeacher).toHaveBeenCalledWith(12, 4);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Class does not belong to this teacher.' });
      expect(assignmentService.createAssignment).not.toHaveBeenCalled();
    });

    it('refuses a class from another center for an admin', async () => {
      const res = createResponse();
      classInCenter.mockResolvedValue(false);

      await assignmentController.createAssignment({ body: { class_id: 12 }, user: { userType: 'admin', id: 1 } }, res);

      expect(classInCenter).toHaveBeenCalledWith(12, 7);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Class does not belong to this center.' });
    });

    it.each([[undefined], [null], ['']])('skips the class check when class_id is %p', async (classId) => {
      const res = createResponse();
      assignmentService.createAssignment.mockResolvedValue({ assignment_id: 1 });

      await assignmentController.createAssignment({ body: { class_id: classId }, user: { userType: 'admin', id: 1 } }, res);

      expect(classInCenter).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('stamps the scoped center onto the new assignment', async () => {
      const res = createResponse();
      classInCenter.mockResolvedValue(true);
      assignmentService.createAssignment.mockResolvedValue({ assignment_id: 5 });

      await assignmentController.createAssignment({ body: { class_id: 12, title: 'Homework' }, user: { userType: 'admin', id: 1 } }, res);

      expect(assignmentService.createAssignment).toHaveBeenCalledWith({ class_id: 12, title: 'Homework', center_id: 7 });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ assignment_id: 5 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      assignmentService.createAssignment.mockRejectedValue(new Error('insert failed'));

      await assignmentController.createAssignment({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create assignment', details: 'insert failed' });
    });
  });

  describe('updateAssignment', () => {
    it('passes the teacher scope through', async () => {
      const res = createResponse();
      assignmentService.updateAssignment.mockResolvedValue({ assignment_id: 3 });

      await assignmentController.updateAssignment({ params: { id: '3' }, body: { title: 'Revised' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(assignmentService.updateAssignment).toHaveBeenCalledWith(3, { title: 'Revised' }, 7, 4);
      expect(res.json).toHaveBeenCalledWith({ assignment_id: 3 });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      assignmentService.updateAssignment.mockResolvedValue(null);

      await assignmentController.updateAssignment({ params: { id: '3' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assignment not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      assignmentService.updateAssignment.mockRejectedValue(new Error('conflict'));

      await assignmentController.updateAssignment({ params: { id: '3' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update assignment', details: 'conflict' });
    });
  });

  describe('deleteAssignment', () => {
    it('confirms the deletion and echoes the removed row', async () => {
      const res = createResponse();
      assignmentService.deleteAssignment.mockResolvedValue({ assignment_id: 3 });

      await assignmentController.deleteAssignment({ params: { id: '3' }, user: { userType: 'teacher', id: 4 } }, res);

      expect(assignmentService.deleteAssignment).toHaveBeenCalledWith(3, 7, 4);
      expect(res.json).toHaveBeenCalledWith({ message: 'Assignment deleted successfully', assignment: { assignment_id: 3 } });
    });

    it('returns 404 when the assignment is out of scope', async () => {
      const res = createResponse();
      assignmentService.deleteAssignment.mockResolvedValue(null);

      await assignmentController.deleteAssignment({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      assignmentService.deleteAssignment.mockRejectedValue(new Error('locked'));

      await assignmentController.deleteAssignment({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete assignment', details: 'locked' });
    });
  });
});
