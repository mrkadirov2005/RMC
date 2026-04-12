const invoiceRepository = require('../repositories/invoice.repository');

const generateInvoiceNumber = async (centerId: number) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${centerId}-${y}${m}`;
  const count = await invoiceRepository.countNumberLike(`${prefix}-%`, centerId);
  const nextSeq = count + 1;
  return `${prefix}-${String(nextSeq).padStart(4, '0')}`;
};

const calculateTotals = (items: any[], discount_total = 0, tax_total = 0) => {
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity || 1);
    const price = Number(item.unit_price || 0);
    return sum + qty * price;
  }, 0);
  const total = subtotal - Number(discount_total || 0) + Number(tax_total || 0);
  return { subtotal, total };
};

const listInvoices = async (query: { student_id?: string; center_id?: string; status?: string }, centerId?: number) => {
  const params: any[] = [];
  const conditions: string[] = [];
  const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
  if (query.student_id) {
    params.push(query.student_id);
    conditions.push(`student_id = $${params.length}`);
  }
  if (scopedCenterId) {
    params.push(scopedCenterId);
    conditions.push(`center_id = $${params.length}`);
  }
  if (query.status) {
    params.push(query.status);
    conditions.push(`status = $${params.length}`);
  }
  return invoiceRepository.findAllFiltered(conditions, params);
};

const getInvoiceWithItems = async (id: number, centerId?: number) => {
  const inv = await invoiceRepository.findById(id, centerId);
  if (!inv) return null;
  const items = await invoiceRepository.findItems(id);
  return { ...inv, items };
};

const createInvoice = async (body: any, centerId?: number) => {
  const {
    student_id,
    center_id,
    invoice_number,
    issue_date,
    due_date,
    status,
    discount_total,
    tax_total,
    notes,
    items = [],
  } = body;

  const scopedCenterId = centerId ?? center_id;

  if (!student_id || !scopedCenterId || !issue_date || !Array.isArray(items) || items.length === 0) {
    return { error: 'validation' as const };
  }

  const number = invoice_number || (await generateInvoiceNumber(scopedCenterId));
  const { subtotal, total } = calculateTotals(items, discount_total, tax_total);

  const invoice = await invoiceRepository.insertInvoice([
    student_id,
    scopedCenterId,
    number,
    issue_date,
    due_date || null,
    status || 'Draft',
    subtotal,
    discount_total || 0,
    tax_total || 0,
    total,
    notes || null,
  ]);

  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const price = Number(item.unit_price || 0);
    const lineTotal = qty * price;
    await invoiceRepository.insertItem(invoice.invoice_id, item.description, qty, price, lineTotal);
  }

  return { invoice };
};

const updateInvoice = async (id: number, body: any, centerId?: number) => {
  const { issue_date, due_date, status, discount_total, tax_total, notes, items } = body;

  const existing = await invoiceRepository.findById(id, centerId);
  if (!existing) return null;

  let subtotal = existing.subtotal;
  let total = existing.total;

  if (Array.isArray(items)) {
    const totals = calculateTotals(
      items,
      discount_total ?? existing.discount_total,
      tax_total ?? existing.tax_total
    );
    subtotal = totals.subtotal;
    total = totals.total;
    await invoiceRepository.deleteItemsByInvoice(id);
    for (const item of items) {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unit_price || 0);
      const lineTotal = qty * price;
      await invoiceRepository.insertItem(id, item.description, qty, price, lineTotal);
    }
  }

  const row = await invoiceRepository.updateInvoice([
    issue_date,
    due_date,
    status,
    discount_total,
    tax_total,
    subtotal,
    total,
    notes,
    id,
  ], centerId);
  return row;
};

const deleteInvoice = (id: number, centerId?: number) => invoiceRepository.deleteInvoice(id, centerId);

module.exports = {
  listInvoices,
  getInvoiceWithItems,
  createInvoice,
  updateInvoice,
  deleteInvoice,
};

export {};
