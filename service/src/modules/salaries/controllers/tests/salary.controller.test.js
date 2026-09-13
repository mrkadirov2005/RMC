jest.mock('../../services/salary.service', () => ({
  getOverview: jest.fn(),
  getTeacherDetail: jest.fn(),
  markPaid: jest.fn(),
  updateSalaryRecord: jest.fn(),
  getMonthlySummary: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

jest.mock('../../../../shared/tenantDb', () => ({
  teacherInCenter: jest.fn(),
}));

const salaryController = require('../salary.controller');
const salaryService = require('../../services/salary.service');
const { getScopedCenterId } = require('../../../../shared/tenant');
const { teacherInCenter } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('salaries controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 4, isGlobal: false });
    teacherInCenter.mockResolvedValue(true);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to the tenant-bound handlers', () => {
    const handlers = [
      ['getOverview', { query: {} }],
      ['getTeacherDetail', { params: { teacherId: '5' }, query: {} }],
      ['markPaid', { body: {} }],
      ['updatePatch', { params: { id: '1' }, body: {} }],
      ['getMonthlySummary', { query: {} }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await salaryController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each(handlers)('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await salaryController[handler]({ ...req, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });
  });

  describe('getOverview', () => {
    it('passes an explicit year and month through as numbers', async () => {
      const res = createResponse();
      salaryService.getOverview.mockResolvedValue({ teachers: [] });

      await salaryController.getOverview({ query: { year: '2026', month: '3' }, user: {} }, res);

      expect(salaryService.getOverview).toHaveBeenCalledWith({ centerId: 4, year: 2026, month: 3 });
      expect(res.json).toHaveBeenCalledWith({ teachers: [] });
    });

    it('leaves the period open when no year or month is given', async () => {
      const res = createResponse();
      salaryService.getOverview.mockResolvedValue({ teachers: [] });

      await salaryController.getOverview({ query: {}, user: {} }, res);

      expect(salaryService.getOverview).toHaveBeenCalledWith({ centerId: 4, year: undefined, month: undefined });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      salaryService.getOverview.mockRejectedValue(new Error('offline'));

      await salaryController.getOverview({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch salary overview', details: 'offline' });
    });
  });

  describe('getTeacherDetail', () => {
    it('requires a usable teacher id', async () => {
      const res = createResponse();

      await salaryController.getTeacherDetail({ params: { teacherId: 'abc' }, query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'teacherId is required.' });
    });

    it('hides a teacher who belongs to another center', async () => {
      const res = createResponse();
      teacherInCenter.mockResolvedValue(false);

      await salaryController.getTeacherDetail({ params: { teacherId: '5' }, query: {}, user: {} }, res);

      expect(teacherInCenter).toHaveBeenCalledWith(5, 4);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Teacher not found in this center.' });
      expect(salaryService.getTeacherDetail).not.toHaveBeenCalled();
    });

    it('defaults the window to six months', async () => {
      const res = createResponse();
      salaryService.getTeacherDetail.mockResolvedValue({ teacher_id: 5 });

      await salaryController.getTeacherDetail({ params: { teacherId: '5' }, query: {}, user: {} }, res);

      expect(salaryService.getTeacherDetail).toHaveBeenCalledWith({ teacherId: 5, centerId: 4, months: 6 });
    });

    it('clamps an oversized window to twenty four months', async () => {
      const res = createResponse();
      salaryService.getTeacherDetail.mockResolvedValue({ teacher_id: 5 });

      await salaryController.getTeacherDetail({ params: { teacherId: '5' }, query: { months: '500' }, user: {} }, res);

      expect(salaryService.getTeacherDetail).toHaveBeenCalledWith({ teacherId: 5, centerId: 4, months: 24 });
    });

    it('clamps a window below one up to a single month', async () => {
      const res = createResponse();
      salaryService.getTeacherDetail.mockResolvedValue({ teacher_id: 5 });

      await salaryController.getTeacherDetail({ params: { teacherId: '5' }, query: { months: '-3' }, user: {} }, res);

      expect(salaryService.getTeacherDetail).toHaveBeenCalledWith({ teacherId: 5, centerId: 4, months: 1 });
    });

    it('falls back to six months when the window is not a number', async () => {
      const res = createResponse();
      salaryService.getTeacherDetail.mockResolvedValue({ teacher_id: 5 });

      await salaryController.getTeacherDetail({ params: { teacherId: '5' }, query: { months: 'many' }, user: {} }, res);

      expect(salaryService.getTeacherDetail).toHaveBeenCalledWith({ teacherId: 5, centerId: 4, months: 6 });
    });

    it('returns 404 when the service has no detail', async () => {
      const res = createResponse();
      salaryService.getTeacherDetail.mockResolvedValue(null);

      await salaryController.getTeacherDetail({ params: { teacherId: '5' }, query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Teacher not found.' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      salaryService.getTeacherDetail.mockRejectedValue(new Error('detail failed'));

      await salaryController.getTeacherDetail({ params: { teacherId: '5' }, query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch teacher salary detail', details: 'detail failed' });
    });
  });

  describe('getMyDetail', () => {
    it('refuses a caller whose teacher id cannot be resolved', async () => {
      const res = createResponse();

      await salaryController.getMyDetail({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unable to resolve teacher id.' });
    });

    it('reads the signed-in teacher own salary detail', async () => {
      const res = createResponse();
      salaryService.getTeacherDetail.mockResolvedValue({ teacher_id: 7 });

      await salaryController.getMyDetail({ query: { months: '3' }, user: { id: 7, userType: 'teacher' } }, res);

      expect(salaryService.getTeacherDetail).toHaveBeenCalledWith({ teacherId: 7, centerId: 4, months: 3 });
      expect(res.json).toHaveBeenCalledWith({ teacher_id: 7 });
    });

    it('returns 404 when the teacher has no salary profile', async () => {
      const res = createResponse();
      salaryService.getTeacherDetail.mockResolvedValue(null);

      await salaryController.getMyDetail({ query: {}, user: { id: 7 } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Salary profile not found.' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      salaryService.getTeacherDetail.mockRejectedValue(new Error('profile failed'));

      await salaryController.getMyDetail({ query: {}, user: { id: 7 } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch salary detail', details: 'profile failed' });
    });
  });

  describe('markPaid', () => {
    it('refuses to pay a teacher from another center', async () => {
      const res = createResponse();
      teacherInCenter.mockResolvedValue(false);

      await salaryController.markPaid({ body: { teacher_id: 5 }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Teacher does not belong to this center.' });
      expect(salaryService.markPaid).not.toHaveBeenCalled();
    });

    it('records the payment with the acting user attached', async () => {
      const res = createResponse();
      const user = { id: 1, userType: 'admin' };
      salaryService.markPaid.mockResolvedValue({ salary_id: 12 });

      await salaryController.markPaid({
        body: {
          teacher_id: '5',
          salary_year: '2026',
          salary_month: '3',
          amount: '4200000',
          payment_method: 'Cash',
          notes: 'March',
        },
        user,
      }, res);

      expect(salaryService.markPaid).toHaveBeenCalledWith({
        teacherId: 5,
        salaryYear: 2026,
        salaryMonth: 3,
        amount: 4200000,
        paymentMethod: 'Cash',
        notes: 'March',
        centerId: 4,
        actingUser: user,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ salary_id: 12 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      salaryService.markPaid.mockRejectedValue(new Error('payment failed'));

      await salaryController.markPaid({ body: { teacher_id: 5 }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to mark salary as paid', details: 'payment failed' });
    });
  });

  describe('updatePatch', () => {
    it('requires a usable record id', async () => {
      const res = createResponse();

      await salaryController.updatePatch({ params: { id: 'abc' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'id is required.' });
    });

    it('forwards only the editable fields', async () => {
      const res = createResponse();
      const user = { id: 1 };
      salaryService.updateSalaryRecord.mockResolvedValue({ salary_id: 12 });

      await salaryController.updatePatch({
        params: { id: '12' },
        body: { amount: 500, is_paid: true, payment_method: 'Card', notes: 'fixed', teacher_id: 99 },
        user,
      }, res);

      expect(salaryService.updateSalaryRecord).toHaveBeenCalledWith({
        id: 12,
        patch: { amount: 500, is_paid: true, payment_method: 'Card', notes: 'fixed' },
        centerId: 4,
        actingUser: user,
      });
      expect(res.json).toHaveBeenCalledWith({ salary_id: 12 });
    });

    it('returns 404 when the record is out of scope', async () => {
      const res = createResponse();
      salaryService.updateSalaryRecord.mockResolvedValue(null);

      await salaryController.updatePatch({ params: { id: '12' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Salary record not found.' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      salaryService.updateSalaryRecord.mockRejectedValue(new Error('update failed'));

      await salaryController.updatePatch({ params: { id: '12' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update salary record', details: 'update failed' });
    });
  });

  describe('getMonthlySummary', () => {
    it('clamps the requested window the same way as the detail view', async () => {
      const res = createResponse();
      salaryService.getMonthlySummary.mockResolvedValue({ months: [] });

      await salaryController.getMonthlySummary({ query: { months: '99' }, user: {} }, res);

      expect(salaryService.getMonthlySummary).toHaveBeenCalledWith({ centerId: 4, months: 24 });
      expect(res.json).toHaveBeenCalledWith({ months: [] });
    });

    it('defaults the window to six months', async () => {
      const res = createResponse();
      salaryService.getMonthlySummary.mockResolvedValue({ months: [] });

      await salaryController.getMonthlySummary({ query: {}, user: {} }, res);

      expect(salaryService.getMonthlySummary).toHaveBeenCalledWith({ centerId: 4, months: 6 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      salaryService.getMonthlySummary.mockRejectedValue(new Error('summary failed'));

      await salaryController.getMonthlySummary({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch salary monthly summary', details: 'summary failed' });
    });
  });
});
