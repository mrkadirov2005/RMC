const { logAudit } = require('../../../utils/audit');
const invoiceService = require('../services/invoice.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentInCenter } = require('../../../shared/tenantDb');

const getAllInvoices = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const rows = await invoiceService.listInvoices(req.query, centerId ?? undefined);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices', details: error.message || String(error) });
  }
};

const getInvoiceById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const data = await invoiceService.getInvoiceWithItems(Number(req.params.id), centerId ?? undefined);
    if (!data) return res.status(404).json({ error: 'Hisob-faktura topilmadi' });
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice', details: error.message || String(error) });
  }
};

const createInvoice = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    if (!(await studentInCenter(Number(req.body.student_id), centerId ?? 0))) {
      return res.status(400).json({ error: "O'quvchi bu markazga tegishli emas." });
    }
    const out = await invoiceService.createInvoice(req.body, centerId ?? undefined);
    const { invoice } = out as { invoice: any };
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'CREATE',
      entity_type: 'invoice',
      entity_id: invoice.invoice_id,
      center_id: centerId ?? undefined,
      details: { invoice_number: invoice.invoice_number, total: invoice.total },
      ip_address: req.ip,
    });
    res.status(201).json({ message: 'Invoice created', invoice });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create invoice', details: error.message || String(error) });
  }
};

const updateInvoice = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await invoiceService.updateInvoice(Number(req.params.id), req.body, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Hisob-faktura topilmadi' });
    res.json({ message: 'Invoice updated', invoice: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update invoice', details: error.message || String(error) });
  }
};

const deleteInvoice = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await invoiceService.deleteInvoice(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Hisob-faktura topilmadi' });
    res.json({ message: 'Invoice deleted', invoice: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete invoice', details: error.message || String(error) });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
};

export {};
