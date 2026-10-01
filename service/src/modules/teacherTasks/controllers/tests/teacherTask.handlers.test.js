jest.mock('../../services/teacherTask.service', () => ({
  getAllTeacherTasks: jest.fn(),
  getTeacherTaskById: jest.fn(),
  createTeacherTask: jest.fn(),
  updateTeacherTask: jest.fn(),
  updateTeacherTaskStatus: jest.fn(),
  getTeacherTaskStats: jest.fn(),
  deleteTeacherTask: jest.fn(),
  isValidDeadline: jest.fn(),
}));

jest.mock('../../../superusers/services/superuser.service', () => ({
  getSuperuser: jest.fn(),
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

const controller = require('../teacherTask.controller');
const service = require('../../services/teacherTask.service');
const superuserService = require('../../../superusers/services/superuser.service');
const { getScopedCenterId, isGlobalUser, isCenterAdmin } = require('../../../../shared/tenant');
const { teacherInCenter, superuserInCenter } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const owner = { userType: 'superuser', id: 1, role: 'owner' };

describe('teacher tasks controller handlers', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 3, isGlobal: false });
    isGlobalUser.mockReturnValue(true);
    isCenterAdmin.mockReturnValue(false);
    service.isValidDeadline.mockReturnValue(true);
    teacherInCenter.mockResolvedValue(true);
    superuserInCenter.mockResolvedValue(true);
    superuserService.getSuperuser.mockResolvedValue({ role: 'admin' });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getAllTeacherTasks', { query: {} }],
      ['getTeacherTaskById', { params: { id: '1' }, query: {} }],
      ['createTeacherTask', { body: {} }],
      ['updateTeacherTask', { params: { id: '1' }, body: {} }],
      ['updateTeacherTaskStatus', { params: { id: '1' }, body: {} }],
      ['getTeacherTaskStats', { query: {} }],
      ['deleteTeacherTask', { params: { id: '1' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await controller[handler]({ ...req, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Markaz tanlanishi shart.' });
    });

    it.each(handlers)('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await controller[handler]({ ...req, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    });
  });

  describe('owner-only writes', () => {
    it.each([
      ['createTeacherTask', { body: {} }, 'Vazifalarni faqat markaz egasi tayinlay oladi.'],
      ['updateTeacherTask', { params: { id: '1' }, body: {} }, 'Vazifalarni faqat markaz egasi yangilay oladi.'],
      ['deleteTeacherTask', { params: { id: '1' } }, "Vazifalarni faqat markaz egasi o'chira oladi."],
    ])('%s refuses a caller who is not the owner', async (handler, req, message) => {
      isGlobalUser.mockReturnValue(false);
      const res = createResponse();

      await controller[handler]({ ...req, user: { userType: 'teacher', id: 5 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: message });
    });
  });

  describe('assignee narrowing on reads', () => {
    it('narrows the listing to the calling teacher and ignores a query override', async () => {
      const res = createResponse();
      service.getAllTeacherTasks.mockResolvedValue([]);

      await controller.getAllTeacherTasks({ query: { teacher_id: '99' }, user: { userType: 'teacher', id: 5 } }, res);

      expect(service.getAllTeacherTasks).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 5, adminId: undefined }));
    });

    it('narrows the listing to the calling center admin', async () => {
      isCenterAdmin.mockReturnValue(true);
      const res = createResponse();
      service.getAllTeacherTasks.mockResolvedValue([]);

      await controller.getAllTeacherTasks({ query: {}, user: { userType: 'superuser', id: 8 } }, res);

      expect(service.getAllTeacherTasks).toHaveBeenCalledWith(expect.objectContaining({ adminId: 8, teacherId: undefined }));
    });

    it('lets the owner filter the listing by any teacher', async () => {
      const res = createResponse();
      service.getAllTeacherTasks.mockResolvedValue([]);

      await controller.getAllTeacherTasks({ query: { teacher_id: '5' }, user: owner }, res);

      expect(service.getAllTeacherTasks).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 5 }));
    });

    it('lets the owner filter the listing by any admin', async () => {
      const res = createResponse();
      service.getAllTeacherTasks.mockResolvedValue([]);

      await controller.getAllTeacherTasks({ query: { admin_id: '8' }, user: owner }, res);

      expect(service.getAllTeacherTasks).toHaveBeenCalledWith(expect.objectContaining({ adminId: 8 }));
    });

    it('defaults to the first page of one hundred rows', async () => {
      const res = createResponse();
      service.getAllTeacherTasks.mockResolvedValue([]);

      await controller.getAllTeacherTasks({ query: {}, user: owner }, res);

      expect(service.getAllTeacherTasks).toHaveBeenCalledWith(expect.objectContaining({ limit: 100, offset: 0 }));
    });

    it('caps the page size at two hundred', async () => {
      const res = createResponse();
      service.getAllTeacherTasks.mockResolvedValue([]);

      await controller.getAllTeacherTasks({ query: { limit: '900', page: '2' }, user: owner }, res);

      expect(service.getAllTeacherTasks).toHaveBeenCalledWith(expect.objectContaining({ limit: 200, offset: 200 }));
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      service.getAllTeacherTasks.mockRejectedValue(new Error('offline'));

      await controller.getAllTeacherTasks({ query: {}, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "O'qituvchi vazifalarini yuklab bo'lmadi", details: 'offline' });
    });
  });

  describe('getTeacherTaskById', () => {
    it('returns the task scoped to the calling teacher', async () => {
      const res = createResponse();
      service.getTeacherTaskById.mockResolvedValue({ task_id: 4 });

      await controller.getTeacherTaskById({ params: { id: '4' }, query: {}, user: { userType: 'teacher', id: 5 } }, res);

      expect(service.getTeacherTaskById).toHaveBeenCalledWith(4, 3, 5, undefined);
      expect(res.json).toHaveBeenCalledWith({ task_id: 4 });
    });

    it('returns 404 when the task is not the caller own', async () => {
      const res = createResponse();
      service.getTeacherTaskById.mockResolvedValue(null);

      await controller.getTeacherTaskById({ params: { id: '4' }, query: {}, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Vazifa topilmadi' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      service.getTeacherTaskById.mockRejectedValue(new Error('bad id'));

      await controller.getTeacherTaskById({ params: { id: '4' }, query: {}, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "O'qituvchi vazifasini yuklab bo'lmadi", details: 'bad id' });
    });
  });

  describe('createTeacherTask', () => {
    const body = (overrides = {}) => ({
      assignee_type: 'teacher',
      task_title: 'Mark papers',
      teacher_id: 5,
      deadline: '2026-10-01',
      ...overrides,
    });

    it('refuses an assignee type that is neither teacher nor admin', async () => {
      const res = createResponse();

      await controller.createTeacherTask({ body: body({ assignee_type: 'parent' }), user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "assignee_type qiymati \"teacher\" yoki \"admin\" bo'lishi kerak." });
    });

    it('requires a non-blank title', async () => {
      const res = createResponse();

      await controller.createTeacherTask({ body: body({ task_title: '   ' }), user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "task_title ko'rsatilishi shart." });
    });

    it('requires a teacher id when assigning to a teacher', async () => {
      const res = createResponse();

      await controller.createTeacherTask({ body: body({ teacher_id: 0 }), user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "teacher_id ko'rsatilishi shart." });
    });

    it('refuses a teacher from another center', async () => {
      const res = createResponse();
      teacherInCenter.mockResolvedValue(false);

      await controller.createTeacherTask({ body: body(), user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "O'qituvchi bu markazga tegishli emas." });
    });

    it('requires an admin id when assigning to an admin', async () => {
      const res = createResponse();

      await controller.createTeacherTask({ body: body({ assignee_type: 'admin', admin_id: 0 }), user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "admin_id ko'rsatilishi shart." });
    });

    it('refuses an admin from another center', async () => {
      const res = createResponse();
      superuserInCenter.mockResolvedValue(false);

      await controller.createTeacherTask({ body: body({ assignee_type: 'admin', admin_id: 8 }), user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Admin bu markazga tegishli emas.' });
    });

    it('refuses to assign a task to the center owner', async () => {
      const res = createResponse();
      superuserService.getSuperuser.mockResolvedValue({ role: 'Owner' });

      await controller.createTeacherTask({ body: body({ assignee_type: 'admin', admin_id: 8 }), user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Vazifani markaz egasiga tayinlab bo'lmaydi." });
    });

    it('creates a teacher task and records who assigned it', async () => {
      const res = createResponse();
      service.createTeacherTask.mockResolvedValue({ task_id: 9 });

      await controller.createTeacherTask({ body: body(), user: owner }, res);

      expect(service.createTeacherTask).toHaveBeenCalledWith(expect.objectContaining({
        assignee_type: 'teacher',
        teacher_id: 5,
        admin_id: undefined,
        center_id: 3,
        created_by: 1,
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ task_id: 9 });
    });

    it('creates an admin task', async () => {
      const res = createResponse();
      service.createTeacherTask.mockResolvedValue({ task_id: 10 });

      await controller.createTeacherTask({ body: body({ assignee_type: 'admin', admin_id: 8 }), user: owner }, res);

      expect(service.createTeacherTask).toHaveBeenCalledWith(expect.objectContaining({
        assignee_type: 'admin',
        admin_id: 8,
        teacher_id: undefined,
      }));
    });

    it('records a null author when the session carries no id', async () => {
      const res = createResponse();
      service.createTeacherTask.mockResolvedValue({ task_id: 11 });

      await controller.createTeacherTask({ body: body(), user: { userType: 'superuser' } }, res);

      expect(service.createTeacherTask).toHaveBeenCalledWith(expect.objectContaining({ created_by: null }));
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      service.createTeacherTask.mockRejectedValue(new Error('insert failed'));

      await controller.createTeacherTask({ body: body(), user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "O'qituvchi vazifasini yaratib bo'lmadi", details: 'insert failed' });
    });
  });

  describe('updateTeacherTask', () => {
    it('writes only the editable fields when the assignee is unchanged', async () => {
      const res = createResponse();
      service.updateTeacherTask.mockResolvedValue({ task_id: 4 });

      await controller.updateTeacherTask({
        params: { id: '4' },
        body: { task_title: 'Revised', task_definition: 'Details', deadline: '2026-11-01', teacher_id: 99 },
        user: owner,
      }, res);

      expect(service.updateTeacherTask).toHaveBeenCalledWith(4, {
        task_title: 'Revised',
        task_definition: 'Details',
        deadline: '2026-11-01',
      }, 3);
      expect(res.json).toHaveBeenCalledWith({ task_id: 4 });
    });

    it('refuses an assignee type that is neither teacher nor admin', async () => {
      const res = createResponse();

      await controller.updateTeacherTask({ params: { id: '4' }, body: { assignee_type: 'parent' }, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "assignee_type qiymati \"teacher\" yoki \"admin\" bo'lishi kerak." });
    });

    it('clears the admin when reassigning to a teacher', async () => {
      const res = createResponse();
      service.updateTeacherTask.mockResolvedValue({ task_id: 4 });

      await controller.updateTeacherTask({
        params: { id: '4' },
        body: { assignee_type: 'teacher', teacher_id: 5 },
        user: owner,
      }, res);

      expect(service.updateTeacherTask).toHaveBeenCalledWith(4, expect.objectContaining({
        teacher_id: 5,
        admin_id: null,
      }), 3);
    });

    it('clears the teacher when reassigning to an admin', async () => {
      const res = createResponse();
      service.updateTeacherTask.mockResolvedValue({ task_id: 4 });

      await controller.updateTeacherTask({
        params: { id: '4' },
        body: { assignee_type: 'admin', admin_id: 8 },
        user: owner,
      }, res);

      expect(service.updateTeacherTask).toHaveBeenCalledWith(4, expect.objectContaining({
        admin_id: 8,
        teacher_id: null,
      }), 3);
    });

    it('requires a teacher id when reassigning to a teacher', async () => {
      const res = createResponse();

      await controller.updateTeacherTask({ params: { id: '4' }, body: { assignee_type: 'teacher' }, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "teacher_id ko'rsatilishi shart." });
    });

    it('requires an admin id when reassigning to an admin', async () => {
      const res = createResponse();

      await controller.updateTeacherTask({ params: { id: '4' }, body: { assignee_type: 'admin' }, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "admin_id ko'rsatilishi shart." });
    });

    it('refuses to reassign a task to the center owner', async () => {
      const res = createResponse();
      superuserService.getSuperuser.mockResolvedValue({ role: 'owner' });

      await controller.updateTeacherTask({
        params: { id: '4' },
        body: { assignee_type: 'admin', admin_id: 8 },
        user: owner,
      }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Vazifani markaz egasiga tayinlab bo'lmaydi." });
    });

    it('refuses a reassignment target from another center', async () => {
      const res = createResponse();
      teacherInCenter.mockResolvedValue(false);

      await controller.updateTeacherTask({
        params: { id: '4' },
        body: { assignee_type: 'teacher', teacher_id: 5 },
        user: owner,
      }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "O'qituvchi bu markazga tegishli emas." });
    });

    it('returns 404 when the task is out of scope', async () => {
      const res = createResponse();
      service.updateTeacherTask.mockResolvedValue(null);

      await controller.updateTeacherTask({ params: { id: '4' }, body: {}, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Vazifa topilmadi' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      service.updateTeacherTask.mockRejectedValue(new Error('conflict'));

      await controller.updateTeacherTask({ params: { id: '4' }, body: {}, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "O'qituvchi vazifasini yangilab bo'lmadi", details: 'conflict' });
    });
  });

  describe('updateTeacherTaskStatus', () => {
    const teacher = { userType: 'teacher', id: 5 };

    it('refuses a caller who is neither the assigned teacher nor an admin', async () => {
      const res = createResponse();

      await controller.updateTeacherTaskStatus({ params: { id: '4' }, body: { action: 'accept' }, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Vazifa holatini faqat biriktirilgan o'qituvchi yoki admin yangilay oladi." });
    });

    it('refuses a task assigned to somebody else', async () => {
      const res = createResponse();
      service.getTeacherTaskById.mockResolvedValue({ assignee_type: 'teacher', teacher_id: 9, status: 'pending' });

      await controller.updateTeacherTaskStatus({ params: { id: '4' }, body: { action: 'accept' }, user: teacher }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Siz bu vazifaga biriktirilmagansiz.' });
    });

    it('lets the assigned admin accept their own task', async () => {
      isCenterAdmin.mockReturnValue(true);
      const res = createResponse();
      service.getTeacherTaskById.mockResolvedValue({ assignee_type: 'admin', admin_id: 8, status: 'pending' });
      service.updateTeacherTaskStatus.mockResolvedValue({ task_id: 4, status: 'accepted' });

      await controller.updateTeacherTaskStatus({
        params: { id: '4' },
        body: { action: 'accept' },
        user: { userType: 'superuser', id: 8 },
      }, res);

      expect(res.json).toHaveBeenCalledWith({ task_id: 4, status: 'accepted' });
    });

    it('returns 404 when the task is not visible to the caller', async () => {
      const res = createResponse();
      service.getTeacherTaskById.mockResolvedValue(null);

      await controller.updateTeacherTaskStatus({ params: { id: '4' }, body: { action: 'accept' }, user: teacher }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Vazifa topilmadi' });
    });

    it('trims an optional note when accepting', async () => {
      const res = createResponse();
      service.getTeacherTaskById.mockResolvedValue({ assignee_type: 'teacher', teacher_id: 5, status: 'pending' });
      service.updateTeacherTaskStatus.mockResolvedValue({ task_id: 4 });

      await controller.updateTeacherTaskStatus({
        params: { id: '4' },
        body: { action: 'accept', note: '  on it  ' },
        user: teacher,
      }, res);

      expect(service.updateTeacherTaskStatus).toHaveBeenCalledWith(4, { status: 'accepted', statusNote: 'on it' }, { centerId: 3 });
    });

    it('records a null note when none is given', async () => {
      const res = createResponse();
      service.getTeacherTaskById.mockResolvedValue({ assignee_type: 'teacher', teacher_id: 5, status: 'accepted' });
      service.updateTeacherTaskStatus.mockResolvedValue({ task_id: 4 });

      await controller.updateTeacherTaskStatus({ params: { id: '4' }, body: { action: 'done' }, user: teacher }, res);

      expect(service.updateTeacherTaskStatus).toHaveBeenCalledWith(4, { status: 'done', statusNote: null }, { centerId: 3 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      service.getTeacherTaskById.mockRejectedValue(new Error('offline'));

      await controller.updateTeacherTaskStatus({ params: { id: '4' }, body: { action: 'accept' }, user: teacher }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "O'qituvchi vazifasi holatini yangilab bo'lmadi", details: 'offline' });
    });
  });

  describe('getTeacherTaskStats', () => {
    it('narrows the stats to the calling teacher', async () => {
      const res = createResponse();
      service.getTeacherTaskStats.mockResolvedValue({ pending: 2 });

      await controller.getTeacherTaskStats({ query: {}, user: { userType: 'teacher', id: 5 } }, res);

      expect(service.getTeacherTaskStats).toHaveBeenCalledWith({ centerId: 3, teacherId: 5, adminId: undefined });
      expect(res.json).toHaveBeenCalledWith({ pending: 2 });
    });

    it('narrows the stats to the calling center admin', async () => {
      isCenterAdmin.mockReturnValue(true);
      const res = createResponse();
      service.getTeacherTaskStats.mockResolvedValue({});

      await controller.getTeacherTaskStats({ query: {}, user: { userType: 'superuser', id: 8 } }, res);

      expect(service.getTeacherTaskStats).toHaveBeenCalledWith({ centerId: 3, teacherId: undefined, adminId: 8 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      service.getTeacherTaskStats.mockRejectedValue(new Error('offline'));

      await controller.getTeacherTaskStats({ query: {}, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "O'qituvchi vazifalari statistikasini yuklab bo'lmadi", details: 'offline' });
    });
  });

  describe('deleteTeacherTask', () => {
    it('confirms the deletion and echoes the removed task', async () => {
      const res = createResponse();
      service.deleteTeacherTask.mockResolvedValue({ task_id: 4 });

      await controller.deleteTeacherTask({ params: { id: '4' }, user: owner }, res);

      expect(service.deleteTeacherTask).toHaveBeenCalledWith(4, 3);
      expect(res.json).toHaveBeenCalledWith({ message: "Vazifa muvaffaqiyatli o'chirildi", task: { task_id: 4 } });
    });

    it('returns 404 when the task is out of scope', async () => {
      const res = createResponse();
      service.deleteTeacherTask.mockResolvedValue(null);

      await controller.deleteTeacherTask({ params: { id: '4' }, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      service.deleteTeacherTask.mockRejectedValue(new Error('locked'));

      await controller.deleteTeacherTask({ params: { id: '4' }, user: owner }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "O'qituvchi vazifasini o'chirib bo'lmadi", details: 'locked' });
    });
  });
});
