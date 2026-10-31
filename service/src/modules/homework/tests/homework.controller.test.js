jest.mock('../homework.service', () => ({
  bank: jest.fn(),
  createNode: jest.fn(),
  listTasks: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  approveTask: jest.fn(),
  listAssignments: jest.fn(),
  createAssignment: jest.fn(),
  deleteAssignment: jest.fn(),
  submissions: jest.fn(),
  review: jest.fn(),
  listForStudent: jest.fn(),
  detailForStudent: jest.fn(),
  saveAnswers: jest.fn(),
  submit: jest.fn(),
}));
jest.mock('../../../shared/tenant', () => ({ getScopedCenterId: jest.fn(() => ({ centerId: 2, isGlobal: false })) }));

const service = require('../homework.service');
const controller = require('../homework.controller');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const user = { id: 1, userType: 'superuser', username: 'admin1' };
const req = (extra = {}) => ({ user, params: {}, query: {}, body: {}, ...extra });

describe('homework controller', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));

  // @MOB-052
  it('passes the signed-in actor and maps service errors to status codes', async () => {
    service.bank.mockResolvedValue({ levels: [] });
    const res = createResponse();
    await controller.bank(req(), res);
    expect(service.bank).toHaveBeenCalledWith({ userType: 'superuser', id: 1, name: 'admin1', centerId: 2, isGlobal: false });
    expect(res.json).toHaveBeenCalledWith({ levels: [] });

    service.createTask.mockResolvedValue({ error: 'invalid', details: ['title is required'] });
    const bad = createResponse();
    await controller.createTask(req({ body: {} }), bad);
    expect(bad.status).toHaveBeenCalledWith(400);
    expect(bad.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID', details: ['title is required'] }));

    service.createAssignment.mockResolvedValue({ assignment: { assignment_id: 3 } });
    const ok = createResponse();
    await controller.createAssignment(req({ body: {} }), ok);
    expect(ok.status).toHaveBeenCalledWith(201);
    expect(ok.json).toHaveBeenCalledWith({ assignment_id: 3 });

    service.approveTask.mockResolvedValue({ error: 'weird' });
    const unknown = createResponse();
    await controller.approveTask(req({ params: { id: '1' } }), unknown);
    expect(unknown.status).toHaveBeenCalledWith(400);
  });

  it('validates ids and titles before calling the service', async () => {
    const cases = [
      ['createNode', req({ params: { kind: 'level' }, body: { title: ' ' } })],
      ['listTasks', req({ params: { lessonId: 'x' } })],
      ['updateTask', req({ params: { id: '0' } })],
      ['approveTask', req({ params: { id: 'x' } })],
      ['review', req({ params: { id: 'x' } })],
    ];
    for (const [handler, request] of cases) {
      const res = createResponse();
      await controller[handler](request, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });

  it('handles the remaining web endpoints', async () => {
    service.createNode.mockResolvedValue({ node: { id: 1 } });
    let res = createResponse();
    await controller.createNode(req({ params: { kind: 'book' }, body: { title: 'Book', parent_id: '4' } }), res);
    expect(service.createNode).toHaveBeenCalledWith(expect.any(Object), 'book', 4, 'Book', 0);
    expect(res.status).toHaveBeenCalledWith(201);

    service.listTasks.mockResolvedValueOnce(null);
    res = createResponse();
    await controller.listTasks(req({ params: { lessonId: '4' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    service.listTasks.mockResolvedValueOnce([]);
    res = createResponse();
    await controller.listTasks(req({ params: { lessonId: '4' } }), res);
    expect(res.json).toHaveBeenCalledWith({ items: [] });

    service.updateTask.mockResolvedValue({ task: { task_id: 1 } });
    await controller.updateTask(req({ params: { id: '1' }, body: {} }), createResponse());
    service.listAssignments.mockResolvedValue([]);
    await controller.listAssignments(req({ query: { class_id: '3' } }), createResponse());
    expect(service.listAssignments).toHaveBeenCalledWith(expect.any(Object), 3);

    service.deleteAssignment.mockResolvedValueOnce(false);
    res = createResponse();
    await controller.deleteAssignment(req({ params: { id: '3' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    service.deleteAssignment.mockResolvedValueOnce(true);
    res = createResponse();
    await controller.deleteAssignment(req({ params: { id: '3' } }), res);
    expect(res.json).toHaveBeenCalled();

    service.submissions.mockResolvedValueOnce(null);
    res = createResponse();
    await controller.submissions(req({ params: { id: '3' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    service.submissions.mockResolvedValueOnce([]);
    res = createResponse();
    await controller.submissions(req({ params: { id: '3' } }), res);
    expect(res.json).toHaveBeenCalledWith({ items: [] });

    service.review.mockResolvedValue({ error: 'invalid_score', max: 3 });
    res = createResponse();
    await controller.review(req({ params: { id: '1' }, body: { score: 9 } }), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_SCORE', max: 3 }));
  });

  // @MOB-054
  it('reads the student own homework, or a parent linked child', async () => {
    service.listForStudent.mockResolvedValue({ items: [] });
    await controller.myHomework({ user: { id: 7, userType: 'student' } }, createResponse());
    await controller.myHomework({ user: { id: 11, userType: 'parent' }, child: { student_id: 8 } }, createResponse());
    expect(service.listForStudent.mock.calls.map((c) => c[0])).toEqual([7, 8]);

    service.detailForStudent.mockResolvedValueOnce(null);
    let res = createResponse();
    await controller.homeworkDetail({ user: { id: 7 }, params: { assignmentId: '2' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    service.detailForStudent.mockResolvedValueOnce({ assignment_id: 2 });
    res = createResponse();
    await controller.homeworkDetail({ user: { id: 7 }, params: { assignmentId: '2' } }, res);
    expect(res.json).toHaveBeenCalledWith({ assignment_id: 2 });
  });

  it('validates answers before saving or submitting', async () => {
    for (const body of [{}, { answers: [] }, { answers: 'x' }, { answers: { big: 'x'.repeat(100_001) } }]) {
      const res = createResponse();
      await controller.saveAnswers({ user: { id: 7 }, params: { assignmentId: '2' }, body }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    service.saveAnswers.mockResolvedValue({ saved: { submission_id: 1 } });
    let res = createResponse();
    await controller.saveAnswers({ user: { id: 7 }, params: { assignmentId: '2' }, body: { answers: { q1: 1 } } }, res);
    expect(res.json).toHaveBeenCalledWith({ submission_id: 1 });

    res = createResponse();
    await controller.submit({ user: { id: 7 }, params: { assignmentId: '2' }, body: { answers: [] } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    service.submit.mockResolvedValue({ error: 'already_submitted' });
    res = createResponse();
    await controller.submit({ user: { id: 7 }, params: { assignmentId: '2' }, body: {} }, res);
    expect(service.submit).toHaveBeenCalledWith(7, 2, null);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('answers 500 when the service throws', async () => {
    service.bank.mockRejectedValue(new Error('db'));
    const res = createResponse();
    await controller.bank(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
