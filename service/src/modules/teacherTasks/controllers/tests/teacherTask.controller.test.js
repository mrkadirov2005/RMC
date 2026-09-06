jest.mock('../../services/teacherTask.service', () => ({
  getAllTeacherTasks: jest.fn(),
  getTeacherTaskById: jest.fn(),
  createTeacherTask: jest.fn(),
  updateTeacherTask: jest.fn(),
  updateTeacherTaskStatus: jest.fn(),
  deleteTeacherTask: jest.fn(),
  getTeacherTaskStats: jest.fn(),
  isValidDeadline: jest.fn(() => true),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
  isGlobalUser: jest.fn(),
  isCenterAdmin: jest.fn(),
}));

jest.mock('../../../../shared/tenantDb', () => ({
  teacherInCenter: jest.fn(),
  superuserInCenter: jest.fn(),
}));

jest.mock('../../../superusers/services/superuser.service', () => ({
  getSuperuser: jest.fn(),
}));

const teacherTaskController = require('../teacherTask.controller');
const teacherTaskService = require('../../services/teacherTask.service');
const { getScopedCenterId, isCenterAdmin, isGlobalUser } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('teacher tasks controller status state machine (accept/reject/done)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 2, isGlobal: false });
    isCenterAdmin.mockReturnValue(false);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  const teacherReq = (overrides = {}) => ({
    params: { id: '10' },
    body: {},
    user: { userType: 'teacher', id: 7 },
    ...overrides,
  });

  test('rejects an unrecognized action before touching the repository', async () => {
    const req = teacherReq({ body: { action: 'delete-everything' } });
    const res = createResponse();

    await teacherTaskController.updateTeacherTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'action must be one of "accept", "reject", or "done".' });
    expect(teacherTaskService.getTeacherTaskById).not.toHaveBeenCalled();
  });

  test('requires a non-empty reason to reject a task', async () => {
    const req = teacherReq({ body: { action: 'reject' } });
    const res = createResponse();

    await teacherTaskController.updateTeacherTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'A reason is required to reject a task.' });
  });

  test('accept succeeds from pending and moves the task to accepted', async () => {
    const req = teacherReq({ body: { action: 'accept' } });
    const res = createResponse();
    teacherTaskService.getTeacherTaskById.mockResolvedValue({
      task_id: 10, status: 'pending', assignee_type: 'teacher', teacher_id: 7,
    });
    teacherTaskService.updateTeacherTaskStatus.mockResolvedValue({ task_id: 10, status: 'accepted' });

    await teacherTaskController.updateTeacherTaskStatus(req, res);

    expect(teacherTaskService.updateTeacherTaskStatus).toHaveBeenCalledWith(
      10,
      { status: 'accepted', statusNote: null },
      { centerId: 2 }
    );
    expect(res.json).toHaveBeenCalledWith({ task_id: 10, status: 'accepted' });
  });

  test('accept is refused with 409 when the task is not currently pending', async () => {
    const req = teacherReq({ body: { action: 'accept' } });
    const res = createResponse();
    teacherTaskService.getTeacherTaskById.mockResolvedValue({
      task_id: 10, status: 'accepted', assignee_type: 'teacher', teacher_id: 7,
    });

    await teacherTaskController.updateTeacherTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(teacherTaskService.updateTeacherTaskStatus).not.toHaveBeenCalled();
  });

  test('reject succeeds from pending, storing the trimmed reason as the status note', async () => {
    const req = teacherReq({ body: { action: 'reject', reason: '  not enough time  ' } });
    const res = createResponse();
    teacherTaskService.getTeacherTaskById.mockResolvedValue({
      task_id: 10, status: 'pending', assignee_type: 'teacher', teacher_id: 7,
    });
    teacherTaskService.updateTeacherTaskStatus.mockResolvedValue({ task_id: 10, status: 'rejected' });

    await teacherTaskController.updateTeacherTaskStatus(req, res);

    expect(teacherTaskService.updateTeacherTaskStatus).toHaveBeenCalledWith(
      10,
      { status: 'rejected', statusNote: 'not enough time' },
      { centerId: 2 }
    );
  });

  test('reject is refused with 409 when the task is not currently pending', async () => {
    const req = teacherReq({ body: { action: 'reject', reason: 'too late' } });
    const res = createResponse();
    teacherTaskService.getTeacherTaskById.mockResolvedValue({
      task_id: 10, status: 'done', assignee_type: 'teacher', teacher_id: 7,
    });

    await teacherTaskController.updateTeacherTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(teacherTaskService.updateTeacherTaskStatus).not.toHaveBeenCalled();
  });

  test('done succeeds only from accepted', async () => {
    const req = teacherReq({ body: { action: 'done' } });
    const res = createResponse();
    teacherTaskService.getTeacherTaskById.mockResolvedValue({
      task_id: 10, status: 'accepted', assignee_type: 'teacher', teacher_id: 7,
    });
    teacherTaskService.updateTeacherTaskStatus.mockResolvedValue({ task_id: 10, status: 'done' });

    await teacherTaskController.updateTeacherTaskStatus(req, res);

    expect(teacherTaskService.updateTeacherTaskStatus).toHaveBeenCalledWith(
      10,
      { status: 'done', statusNote: null },
      { centerId: 2 }
    );
  });

  test('done is refused with 409 when the task is still pending (cannot skip accept)', async () => {
    const req = teacherReq({ body: { action: 'done' } });
    const res = createResponse();
    teacherTaskService.getTeacherTaskById.mockResolvedValue({
      task_id: 10, status: 'pending', assignee_type: 'teacher', teacher_id: 7,
    });

    await teacherTaskController.updateTeacherTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Expected status "accepted"'),
    }));
  });

  test('refuses to let a teacher update the status of a task assigned to someone else', async () => {
    const req = teacherReq({ body: { action: 'accept' } });
    const res = createResponse();
    teacherTaskService.getTeacherTaskById.mockResolvedValue({
      task_id: 10, status: 'pending', assignee_type: 'teacher', teacher_id: 999,
    });

    await teacherTaskController.updateTeacherTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(teacherTaskService.updateTeacherTaskStatus).not.toHaveBeenCalled();
  });

  test('returns 404 when the task does not exist in scope', async () => {
    const req = teacherReq({ body: { action: 'accept' } });
    const res = createResponse();
    teacherTaskService.getTeacherTaskById.mockResolvedValue(null);

    await teacherTaskController.updateTeacherTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('teacher tasks controller deadline validation (RMC-025)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 2, isGlobal: false });
    isGlobalUser.mockReturnValue(true);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('create rejects an invalid, non-empty deadline with 400 rather than silently storing null', async () => {
    teacherTaskService.isValidDeadline.mockReturnValue(false);
    const req = {
      body: { assignee_type: 'teacher', task_title: 'Grade papers', teacher_id: 3, deadline: 'not-a-date' },
      user: { userType: 'superuser', role: 'owner', id: 1 },
    };
    const res = createResponse();

    await teacherTaskController.createTeacherTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'deadline must be a valid date.' });
    expect(teacherTaskService.createTeacherTask).not.toHaveBeenCalled();
  });

  test('create resolves an omitted deadline to null without error', async () => {
    teacherTaskService.isValidDeadline.mockReturnValue(true);
    const { teacherInCenter } = require('../../../../shared/tenantDb');
    teacherInCenter.mockResolvedValue(true);
    teacherTaskService.createTeacherTask.mockResolvedValue({ task_id: 1, deadline: null });
    const req = {
      body: { assignee_type: 'teacher', task_title: 'Grade papers', teacher_id: 3 },
      user: { userType: 'superuser', role: 'owner', id: 1 },
    };
    const res = createResponse();

    await teacherTaskController.createTeacherTask(req, res);

    expect(teacherTaskService.isValidDeadline).toHaveBeenCalledWith(undefined);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
