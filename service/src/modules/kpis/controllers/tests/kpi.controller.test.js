jest.mock('../../services/kpi.service', () => ({
  getOverview: jest.fn(),
  getTeacherDetail: jest.fn(),
  upsertKpi: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

jest.mock('../../../../shared/tenantDb', () => ({
  teacherInCenter: jest.fn(),
}));

const kpiController = require('../kpi.controller');
const kpiService = require('../../services/kpi.service');
const { getScopedCenterId } = require('../../../../shared/tenant');
const { teacherInCenter } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('KPIs controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 2, isGlobal: false });
    teacherInCenter.mockResolvedValue(true);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getOverview', { query: {} }],
      ['getTeacherDetail', { params: { teacherId: '5' } }],
      ['upsert', { body: {} }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await kpiController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each(handlers)('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await kpiController[handler]({ ...req, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });
  });

  describe('getOverview', () => {
    it('passes an explicit year and month through as numbers', async () => {
      const res = createResponse();
      kpiService.getOverview.mockResolvedValue({ teachers: [] });

      await kpiController.getOverview({ query: { year: '2026', month: '4' }, user: {} }, res);

      expect(kpiService.getOverview).toHaveBeenCalledWith({ centerId: 2, year: 2026, month: 4 });
      expect(res.json).toHaveBeenCalledWith({ teachers: [] });
    });

    it('leaves the period open when no year or month is given', async () => {
      const res = createResponse();
      kpiService.getOverview.mockResolvedValue({ teachers: [] });

      await kpiController.getOverview({ query: {}, user: {} }, res);

      expect(kpiService.getOverview).toHaveBeenCalledWith({ centerId: 2, year: undefined, month: undefined });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      kpiService.getOverview.mockRejectedValue(new Error('offline'));

      await kpiController.getOverview({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch KPI overview', details: 'offline' });
    });
  });

  describe('getTeacherDetail', () => {
    it('requires a usable teacher id', async () => {
      const res = createResponse();

      await kpiController.getTeacherDetail({ params: { teacherId: 'abc' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'teacherId is required.' });
    });

    it('hides a teacher who belongs to another center', async () => {
      const res = createResponse();
      teacherInCenter.mockResolvedValue(false);

      await kpiController.getTeacherDetail({ params: { teacherId: '5' }, user: {} }, res);

      expect(teacherInCenter).toHaveBeenCalledWith(5, 2);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Teacher not found in this center.' });
      expect(kpiService.getTeacherDetail).not.toHaveBeenCalled();
    });

    it('returns the detail for a teacher in the calling center', async () => {
      const res = createResponse();
      kpiService.getTeacherDetail.mockResolvedValue({ teacher_id: 5 });

      await kpiController.getTeacherDetail({ params: { teacherId: '5' }, user: {} }, res);

      expect(kpiService.getTeacherDetail).toHaveBeenCalledWith({ teacherId: 5, centerId: 2 });
      expect(res.json).toHaveBeenCalledWith({ teacher_id: 5 });
    });

    it('returns 404 when the service has no detail', async () => {
      const res = createResponse();
      kpiService.getTeacherDetail.mockResolvedValue(null);

      await kpiController.getTeacherDetail({ params: { teacherId: '5' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Teacher not found.' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      kpiService.getTeacherDetail.mockRejectedValue(new Error('detail failed'));

      await kpiController.getTeacherDetail({ params: { teacherId: '5' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch teacher KPI detail', details: 'detail failed' });
    });
  });

  describe('upsert', () => {
    it('refuses to score a teacher from another center', async () => {
      const res = createResponse();
      teacherInCenter.mockResolvedValue(false);

      await kpiController.upsert({ body: { teacher_id: 5 }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Teacher does not belong to this center.' });
      expect(kpiService.upsertKpi).not.toHaveBeenCalled();
    });

    it('coerces the scores and attaches the acting user', async () => {
      const res = createResponse();
      const user = { id: 1, userType: 'admin' };
      kpiService.upsertKpi.mockResolvedValue({ kpi_id: 3 });

      await kpiController.upsert({
        body: {
          teacher_id: '5',
          kpi_year: '2026',
          kpi_month: '4',
          contribution_score: '8',
          teaching_quality_score: '9',
          notes: 'Strong quarter',
        },
        user,
      }, res);

      expect(kpiService.upsertKpi).toHaveBeenCalledWith({
        teacherId: 5,
        centerId: 2,
        kpiYear: 2026,
        kpiMonth: 4,
        contributionScore: 8,
        teachingQualityScore: 9,
        notes: 'Strong quarter',
        actingUser: user,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ kpi_id: 3 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      kpiService.upsertKpi.mockRejectedValue(new Error('write failed'));

      await kpiController.upsert({ body: { teacher_id: 5 }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save KPI record', details: 'write failed' });
    });
  });
});
