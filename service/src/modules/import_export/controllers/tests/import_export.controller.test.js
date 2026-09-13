jest.mock('../../services/import_export.service', () => ({
  exportEntity: jest.fn(),
  importEntity: jest.fn(),
  pushEntityToSheets: jest.fn(),
  pullEntityFromSheets: jest.fn(),
}));

jest.mock('../../../../utils/audit', () => ({
  logAudit: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const controller = require('../import_export.controller');
const service = require('../../services/import_export.service');
const { logAudit } = require('../../../../utils/audit');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  return res;
};

describe('import and export controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 5, isGlobal: false });
    logAudit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping', () => {
    const handlers = [
      ['exportEntity', { params: { entity: 'students' } }],
      ['importEntity', { params: { entity: 'students' }, body: {} }],
      ['pushEntityToSheets', { params: { entity: 'students' } }],
      ['pullEntityFromSheets', { params: { entity: 'students' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await controller[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each([
      ['importEntity', { params: { entity: 'students' }, body: {} }],
      ['pullEntityFromSheets', { params: { entity: 'students' } }],
    ])('%s makes a superuser name a center before writing', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await controller[handler]({ ...req, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });

    it.each([
      ['exportEntity', 'exportEntity'],
      ['pushEntityToSheets', 'pushEntityToSheets'],
    ])('%s still runs for a global caller because it only reads', async (handler, method) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();
      service[method].mockResolvedValue({ csv: 'a,b', rows: 0 });

      await controller[handler]({ params: { entity: 'students' }, user: { userType: 'superuser' } }, res);

      expect(service[method]).toHaveBeenCalledWith('students', undefined);
    });
  });

  describe('exportEntity', () => {
    it('refuses an entity the service does not export', async () => {
      const res = createResponse();
      service.exportEntity.mockResolvedValue({ error: 'unsupported' });

      await controller.exportEntity({ params: { entity: 'aliens' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unsupported export entity' });
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('sends the CSV as a download named after the entity', async () => {
      const res = createResponse();
      service.exportEntity.mockResolvedValue({ csv: 'id,name\n1,Ada', rows: 1 });

      await controller.exportEntity({ params: { entity: 'students' }, user: { userType: 'admin', id: 1 }, ip: '10.0.0.4' }, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="students.csv"');
      expect(res.send).toHaveBeenCalledWith('id,name\n1,Ada');
    });

    it('records an audit entry counting the exported rows', async () => {
      const res = createResponse();
      service.exportEntity.mockResolvedValue({ csv: '', rows: 42 });

      await controller.exportEntity({ params: { entity: 'students' }, user: { userType: 'admin', id: 1 }, ip: '10.0.0.4' }, res);

      expect(logAudit).toHaveBeenCalledWith({
        user_type: 'admin',
        user_id: 1,
        action: 'EXPORT',
        entity_type: 'students',
        center_id: 5,
        details: { rows: 42 },
        ip_address: '10.0.0.4',
      });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      service.exportEntity.mockRejectedValue(new Error('read failed'));

      await controller.exportEntity({ params: { entity: 'students' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to export CSV', details: 'read failed' });
    });
  });

  describe('importEntity', () => {
    it.each([
      ['unsupported', { error: 'Unsupported import entity' }],
      ['invalid_center', { error: 'CSV rows must belong to this center.' }],
    ])('maps the %s result to a 400', async (error, payload) => {
      const res = createResponse();
      service.importEntity.mockResolvedValue({ error });

      await controller.importEntity({ params: { entity: 'students' }, body: { csv: 'x' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(payload);
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('names the offending row when a payment references an unknown student', async () => {
      const res = createResponse();
      service.importEntity.mockResolvedValue({ error: 'missing_student', details: 'student 99', row: 4 });

      await controller.importEntity({ params: { entity: 'payments' }, body: { csv: 'x' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Payment row references an unknown student.',
        details: 'student 99',
        row: 4,
      });
    });

    it('reports how many rows were created and records an audit entry', async () => {
      const res = createResponse();
      service.importEntity.mockResolvedValue({ created: 12 });

      await controller.importEntity({
        params: { entity: 'students' },
        body: { csv: 'id,name' },
        user: { userType: 'admin', id: 1 },
        ip: '10.0.0.4',
      }, res);

      expect(service.importEntity).toHaveBeenCalledWith('students', 'id,name', 5);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'IMPORT', details: { rows: 12 } }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Imported 12 students' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      service.importEntity.mockRejectedValue(new Error('parse failed'));

      await controller.importEntity({ params: { entity: 'students' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to import CSV', details: 'parse failed' });
    });
  });

  describe('pushEntityToSheets', () => {
    it.each([
      ['unsupported', 400, { error: 'Unsupported Google Sheets entity' }],
      ['missing_config', 400, { error: 'GOOGLE_APPS_SCRIPT_URL is not configured.' }],
    ])('maps the %s result to a %d', async (error, status, payload) => {
      const res = createResponse();
      service.pushEntityToSheets.mockResolvedValue({ error });

      await controller.pushEntityToSheets({ params: { entity: 'students' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it('surfaces an Apps Script failure as a bad gateway', async () => {
      const res = createResponse();
      service.pushEntityToSheets.mockResolvedValue({ error: 'apps_script_failed', details: 'HTTP 500' });

      await controller.pushEntityToSheets({ params: { entity: 'students' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({ error: 'Google Apps Script sync failed.', details: 'HTTP 500' });
    });

    it('surfaces an Apps Script timeout as a gateway timeout', async () => {
      const res = createResponse();
      service.pushEntityToSheets.mockResolvedValue({ error: 'apps_script_timeout', details: 'after 30s' });

      await controller.pushEntityToSheets({ params: { entity: 'students' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(504);
      expect(res.json).toHaveBeenCalledWith({ error: 'Google Apps Script did not respond in time.', details: 'after 30s' });
    });

    it('reports how many rows reached the sheet', async () => {
      const res = createResponse();
      service.pushEntityToSheets.mockResolvedValue({ rows: 30 });

      await controller.pushEntityToSheets({ params: { entity: 'students' }, user: { userType: 'admin', id: 1 } }, res);

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'GOOGLE_SHEETS_PUSH', details: { rows: 30 } }));
      expect(res.json).toHaveBeenCalledWith({ message: 'Updated Google Sheets with 30 students', rows: 30 });
    });

    it('reports an unexpected failure as a 500', async () => {
      const res = createResponse();
      service.pushEntityToSheets.mockRejectedValue(new Error('network down'));

      await controller.pushEntityToSheets({ params: { entity: 'students' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update Google Sheets', details: 'network down' });
    });
  });

  describe('pullEntityFromSheets', () => {
    it.each([
      ['unsupported', 400, { error: 'Unsupported Google Sheets entity' }],
      ['missing_config', 400, { error: 'GOOGLE_APPS_SCRIPT_URL is not configured.' }],
      ['invalid_center', 400, { error: 'Google Sheet rows must belong to this center.' }],
    ])('maps the %s result to a %d', async (error, status, payload) => {
      const res = createResponse();
      service.pullEntityFromSheets.mockResolvedValue({ error });

      await controller.pullEntityFromSheets({ params: { entity: 'students' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it('surfaces an Apps Script failure as a bad gateway', async () => {
      const res = createResponse();
      service.pullEntityFromSheets.mockResolvedValue({ error: 'apps_script_failed', details: 'HTTP 403' });

      await controller.pullEntityFromSheets({ params: { entity: 'students' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({ error: 'Google Apps Script import failed.', details: 'HTTP 403' });
    });

    it('surfaces an Apps Script timeout as a gateway timeout', async () => {
      const res = createResponse();
      service.pullEntityFromSheets.mockResolvedValue({ error: 'apps_script_timeout', details: 'after 30s' });

      await controller.pullEntityFromSheets({ params: { entity: 'students' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(504);
    });

    it('names the offending row when a payment references an unknown student', async () => {
      const res = createResponse();
      service.pullEntityFromSheets.mockResolvedValue({ error: 'missing_student', details: 'student 99', row: 7 });

      await controller.pullEntityFromSheets({ params: { entity: 'payments' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Payment row references an unknown student.',
        details: 'student 99',
        row: 7,
      });
    });

    it('reports how many rows were imported', async () => {
      const res = createResponse();
      service.pullEntityFromSheets.mockResolvedValue({ rows: 8 });

      await controller.pullEntityFromSheets({ params: { entity: 'students' }, user: { userType: 'admin', id: 1 } }, res);

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'GOOGLE_SHEETS_PULL', details: { rows: 8 } }));
      expect(res.json).toHaveBeenCalledWith({ message: 'Imported 8 students from Google Sheets', rows: 8 });
    });

    it('reports an unexpected failure as a 500', async () => {
      const res = createResponse();
      service.pullEntityFromSheets.mockRejectedValue(new Error('network down'));

      await controller.pullEntityFromSheets({ params: { entity: 'students' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to import from Google Sheets', details: 'network down' });
    });
  });
});
