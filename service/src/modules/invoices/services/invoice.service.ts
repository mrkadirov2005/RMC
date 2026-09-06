const invoiceRepository = require('../repositories/invoice.repository');

// Runs inside the same transaction as the insert: the advisory lock serializes concurrent
// generation for this center+month prefix so two requests can't read the same count and
// generate the same number (see invoice.repository.ts's lockNumberPrefix).
const generateInvoiceNumber = async (centerId: number, client: any) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${centerId}-${y}${m}`;
  await invoiceRepository.lockNumberPrefix(prefix, client);
  const count = await invoiceRepository.countNumberLike(`${prefix}-%`, centerId, client);
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
  const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
  return invoiceRepository.findAllFiltered({
    studentId: query.student_id ? Number(query.student_id) : undefined,
    centerId: scopedCenterId,
    status: query.status,
  });
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
  const { subtotal, total } = calculateTotals(items, discount_total, tax_total);

  return invoiceRepository.withTransaction(async (client: any) => {
    const number = invoice_number || (await generateInvoiceNumber(scopedCenterId, client));

    const invoice = await invoiceRepository.insertInvoice(
      [
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
      ],
      client
    );

    for (const item of items) {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unit_price || 0);
      const lineTotal = qty * price;
      await invoiceRepository.insertItem(invoice.invoice_id, item.description, qty, price, lineTotal, client);
    }

    return { invoice };
  });
};

const updateInvoice = async (id: number, body: any, centerId?: number) => {
  const { issue_date, due_date, status, discount_total, tax_total, notes, items } = body;

  return invoiceRepository.withTransaction(async (client: any) => {
    const existing = await invoiceRepository.findById(id, centerId, client);
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
      await invoiceRepository.deleteItemsByInvoice(id, client);
      for (const item of items) {
        const qty = Number(item.quantity || 1);
        const price = Number(item.unit_price || 0);
        const lineTotal = qty * price;
        await invoiceRepository.insertItem(id, item.description, qty, price, lineTotal, client);
      }
    }

    const row = await invoiceRepository.updateInvoice(
      [issue_date, due_date, status, discount_total, tax_total, subtotal, total, notes, id],
      centerId,
      client
    );
    return row;
  });
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
