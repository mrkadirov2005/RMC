jest.mock('../../services/invoice.service', () => ({
  listInvoices: jest.fn(),
  getInvoiceWithItems: jest.fn(),
  createInvoice: jest.fn(),
  updateInvoice: jest.fn(),
  deleteInvoice: jest.fn(),
}));

jest.mock('../../../../utils/audit', () => ({
  logAudit: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

jest.mock('../../../../shared/tenantDb', () => ({
  studentInCenter: jest.fn(),
}));

const invoiceController = require('../invoice.controller');
const invoiceService = require('../../services/invoice.service');
const { logAudit } = require('../../../../utils/audit');
const { getScopedCenterId } = require('../../../../shared/tenant');
const { studentInCenter } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('invoices controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 6, isGlobal: false });
    studentInCenter.mockResolvedValue(true);
    logAudit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getAllInvoices', { query: {} }],
      ['getInvoiceById', { params: { id: '1' } }],
      ['createInvoice', { body: {} }],
      ['updateInvoice', { params: { id: '1' }, body: {} }],
      ['deleteInvoice', { params: { id: '1' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await invoiceController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it('createInvoice alone makes a superuser name a center', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await invoiceController.createInvoice({ body: {}, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
      expect(invoiceService.createInvoice).not.toHaveBeenCalled();
    });
  });

  describe('getAllInvoices', () => {
    it('passes the query filters through', async () => {
      const res = createResponse();
      invoiceService.listInvoices.mockResolvedValue([{ invoice_id: 1 }]);

      await invoiceController.getAllInvoices({ query: { status: 'Unpaid' }, user: {} }, res);

      expect(invoiceService.listInvoices).toHaveBeenCalledWith({ status: 'Unpaid' }, 6);
      expect(res.json).toHaveBeenCalledWith([{ invoice_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      invoiceService.listInvoices.mockRejectedValue(new Error('offline'));

      await invoiceController.getAllInvoices({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch invoices', details: 'offline' });
    });
  });

  describe('getInvoiceById', () => {
    it('returns the invoice together with its line items', async () => {
      const res = createResponse();
      invoiceService.getInvoiceWithItems.mockResolvedValue({ invoice: { invoice_id: 3 }, items: [] });

      await invoiceController.getInvoiceById({ params: { id: '3' }, user: {} }, res);

      expect(invoiceService.getInvoiceWithItems).toHaveBeenCalledWith(3, 6);
      expect(res.json).toHaveBeenCalledWith({ invoice: { invoice_id: 3 }, items: [] });
    });

    it('returns 404 when the invoice is out of scope', async () => {
      const res = createResponse();
      invoiceService.getInvoiceWithItems.mockResolvedValue(null);

      await invoiceController.getInvoiceById({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      invoiceService.getInvoiceWithItems.mockRejectedValue(new Error('bad id'));

      await invoiceController.getInvoiceById({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch invoice', details: 'bad id' });
    });
  });

  describe('createInvoice', () => {
    it('refuses a student who belongs to another center', async () => {
      const res = createResponse();
      studentInCenter.mockResolvedValue(false);

      await invoiceController.createInvoice({ body: { student_id: '2' }, user: { userType: 'admin', id: 1 } }, res);

      expect(studentInCenter).toHaveBeenCalledWith(2, 6);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student does not belong to this center.' });
      expect(invoiceService.createInvoice).not.toHaveBeenCalled();
    });

    it('records an audit entry naming the invoice number and total', async () => {
      const res = createResponse();
      invoiceService.createInvoice.mockResolvedValue({
        invoice: { invoice_id: 9, invoice_number: 'INV-0009', total: 750000 },
      });

      await invoiceController.createInvoice({
        body: { student_id: 2 },
        user: { userType: 'admin', id: 1 },
        ip: '10.0.0.3',
      }, res);

      expect(logAudit).toHaveBeenCalledWith({
        user_type: 'admin',
        user_id: 1,
        action: 'CREATE',
        entity_type: 'invoice',
        entity_id: 9,
        center_id: 6,
        details: { invoice_number: 'INV-0009', total: 750000 },
        ip_address: '10.0.0.3',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invoice created',
        invoice: { invoice_id: 9, invoice_number: 'INV-0009', total: 750000 },
      });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      invoiceService.createInvoice.mockRejectedValue(new Error('insert failed'));

      await invoiceController.createInvoice({ body: { student_id: 2 }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create invoice', details: 'insert failed' });
    });
  });

  describe('updateInvoice', () => {
    it('returns the updated invoice', async () => {
      const res = createResponse();
      invoiceService.updateInvoice.mockResolvedValue({ invoice_id: 3 });

      await invoiceController.updateInvoice({ params: { id: '3' }, body: { status: 'Paid' }, user: {} }, res);

      expect(invoiceService.updateInvoice).toHaveBeenCalledWith(3, { status: 'Paid' }, 6);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invoice updated', invoice: { invoice_id: 3 } });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      invoiceService.updateInvoice.mockResolvedValue(null);

      await invoiceController.updateInvoice({ params: { id: '3' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      invoiceService.updateInvoice.mockRejectedValue(new Error('conflict'));

      await invoiceController.updateInvoice({ params: { id: '3' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update invoice', details: 'conflict' });
    });
  });

  describe('deleteInvoice', () => {
    it('confirms the deletion and echoes the removed row', async () => {
      const res = createResponse();
      invoiceService.deleteInvoice.mockResolvedValue({ invoice_id: 3 });

      await invoiceController.deleteInvoice({ params: { id: '3' }, user: {} }, res);

      expect(invoiceService.deleteInvoice).toHaveBeenCalledWith(3, 6);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invoice deleted', invoice: { invoice_id: 3 } });
    });

    it('returns 404 when the invoice is out of scope', async () => {
      const res = createResponse();
      invoiceService.deleteInvoice.mockResolvedValue(null);

      await invoiceController.deleteInvoice({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      invoiceService.deleteInvoice.mockRejectedValue(new Error('locked'));

      await invoiceController.deleteInvoice({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete invoice', details: 'locked' });
    });
  });
});
