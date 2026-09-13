jest.mock('../../services/subject.service', () => ({
  listSubjects: jest.fn(),
  getSubject: jest.fn(),
  listByClass: jest.fn(),
  createSubject: jest.fn(),
  updateSubject: jest.fn(),
  deleteSubject: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const subjectController = require('../subject.controller');
const subjectService = require('../../services/subject.service');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('subjects controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 6, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getAllSubjects', {}],
      ['getSubjectById', { params: { id: '1' } }],
      ['getSubjectsByClass', { params: { classId: '2' } }],
      ['createSubject', { body: {} }],
      ['updateSubject', { params: { id: '1' }, body: {} }],
      ['deleteSubject', { params: { id: '1' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await subjectController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each(handlers.filter(([name]) => name !== 'getSubjectsByClass'))(
      '%s makes a superuser name a center',
      async (handler, req) => {
        getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
        const res = createResponse();

        await subjectController[handler]({ ...req, user: { userType: 'superuser' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
      },
    );
  });

  describe('getAllSubjects', () => {
    it('keeps students out of the full subject catalogue', async () => {
      const res = createResponse();

      await subjectController.getAllSubjects({ user: { userType: 'student', id: 3 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
      expect(subjectService.listSubjects).not.toHaveBeenCalled();
    });

    it('narrows the listing to the calling teacher', async () => {
      const res = createResponse();
      subjectService.listSubjects.mockResolvedValue([{ subject_id: 1 }]);

      await subjectController.getAllSubjects({ user: { userType: 'teacher', id: 8 } }, res);

      expect(subjectService.listSubjects).toHaveBeenCalledWith(6, 8);
      expect(res.json).toHaveBeenCalledWith([{ subject_id: 1 }]);
    });

    it('reports a service failure as a 500 without leaking the message', async () => {
      const res = createResponse();
      subjectService.listSubjects.mockRejectedValue(new Error('offline'));

      await subjectController.getAllSubjects({ user: { userType: 'admin' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch subjects' });
    });
  });

  describe('getSubjectById', () => {
    it('returns the subject', async () => {
      const res = createResponse();
      subjectService.getSubject.mockResolvedValue({ subject_id: 4 });

      await subjectController.getSubjectById({ params: { id: '4' }, user: { userType: 'teacher', id: 8 } }, res);

      expect(subjectService.getSubject).toHaveBeenCalledWith(4, 6, 8);
      expect(res.json).toHaveBeenCalledWith({ subject_id: 4 });
    });

    it('returns 404 when the subject is out of scope', async () => {
      const res = createResponse();
      subjectService.getSubject.mockResolvedValue(null);

      await subjectController.getSubjectById({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Subject not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      subjectService.getSubject.mockRejectedValue(new Error('bad id'));

      await subjectController.getSubjectById({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch subject', details: 'bad id' });
    });
  });

  describe('getSubjectsByClass', () => {
    it('stops a student reading a class they are not enrolled in', async () => {
      const res = createResponse();

      await subjectController.getSubjectsByClass({ params: { classId: '2' }, user: { userType: 'student', id: 3, class_id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
      expect(subjectService.listByClass).not.toHaveBeenCalled();
    });

    it('lets a student read their own class', async () => {
      const res = createResponse();
      subjectService.listByClass.mockResolvedValue([{ subject_id: 1 }]);

      await subjectController.getSubjectsByClass({ params: { classId: '2' }, user: { userType: 'student', id: 3, class_id: '2' } }, res);

      expect(subjectService.listByClass).toHaveBeenCalledWith(2, 6, undefined);
      expect(res.json).toHaveBeenCalledWith([{ subject_id: 1 }]);
    });

    it('narrows the listing to the calling teacher', async () => {
      const res = createResponse();
      subjectService.listByClass.mockResolvedValue([]);

      await subjectController.getSubjectsByClass({ params: { classId: '2' }, user: { userType: 'teacher', id: 8 } }, res);

      expect(subjectService.listByClass).toHaveBeenCalledWith(2, 6, 8);
    });

    it('reports a service failure as a 500 without leaking the message', async () => {
      const res = createResponse();
      subjectService.listByClass.mockRejectedValue(new Error('offline'));

      await subjectController.getSubjectsByClass({ params: { classId: '2' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch subjects' });
    });
  });

  describe('createSubject', () => {
    it('creates the subject in the scoped center', async () => {
      const res = createResponse();
      subjectService.createSubject.mockResolvedValue({ subject_id: 3 });

      await subjectController.createSubject({ body: { subject_name: 'Algebra' }, user: { userType: 'teacher', id: 8 } }, res);

      expect(subjectService.createSubject).toHaveBeenCalledWith({ subject_name: 'Algebra' }, 6, 8);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ subject_id: 3 });
    });

    it.each([
      ['invalid_center', 400, { error: 'Class does not belong to this center.' }],
      ['forbidden', 403, { error: 'Class does not belong to this teacher.' }],
      ['class_subject_exists', 409, { message: 'This class already has an assigned subject.' }],
    ])('maps the %s result to a %d', async (error, status, payload) => {
      const res = createResponse();
      subjectService.createSubject.mockResolvedValue({ error });

      await subjectController.createSubject({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      subjectService.createSubject.mockRejectedValue(new Error('insert failed'));

      await subjectController.createSubject({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create subject', details: 'insert failed' });
    });
  });

  describe('updateSubject', () => {
    it('returns the updated subject', async () => {
      const res = createResponse();
      subjectService.updateSubject.mockResolvedValue({ subject_id: 4 });

      await subjectController.updateSubject({ params: { id: '4' }, body: { subject_name: 'Geometry' }, user: { userType: 'teacher', id: 8 } }, res);

      expect(subjectService.updateSubject).toHaveBeenCalledWith(4, { subject_name: 'Geometry' }, 6, 8);
      expect(res.json).toHaveBeenCalledWith({ subject_id: 4 });
    });

    it.each([
      ['invalid_center', 400, { error: 'Class does not belong to this center.' }],
      ['forbidden', 403, { error: 'Class does not belong to this teacher.' }],
      ['class_subject_exists', 409, { message: 'This class already has an assigned subject.' }],
    ])('maps the %s result to a %d', async (error, status, payload) => {
      const res = createResponse();
      subjectService.updateSubject.mockResolvedValue({ error });

      await subjectController.updateSubject({ params: { id: '4' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      subjectService.updateSubject.mockResolvedValue(null);

      await subjectController.updateSubject({ params: { id: '4' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Subject not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      subjectService.updateSubject.mockRejectedValue(new Error('conflict'));

      await subjectController.updateSubject({ params: { id: '4' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update subject', details: 'conflict' });
    });
  });

  describe('deleteSubject', () => {
    it('confirms the deletion and echoes the removed row', async () => {
      const res = createResponse();
      subjectService.deleteSubject.mockResolvedValue({ subject_id: 4 });

      await subjectController.deleteSubject({ params: { id: '4' }, user: { userType: 'teacher', id: 8 } }, res);

      expect(subjectService.deleteSubject).toHaveBeenCalledWith(4, 6, 8);
      expect(res.json).toHaveBeenCalledWith({ message: 'Subject deleted successfully', subject: { subject_id: 4 } });
    });

    it('returns 404 when the subject is out of scope', async () => {
      const res = createResponse();
      subjectService.deleteSubject.mockResolvedValue(null);

      await subjectController.deleteSubject({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      subjectService.deleteSubject.mockRejectedValue(new Error('locked'));

      await subjectController.deleteSubject({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete subject', details: 'locked' });
    });
  });
});
