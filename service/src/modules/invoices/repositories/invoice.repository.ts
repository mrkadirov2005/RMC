const { and, desc, eq, gte, like, lt, ne, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { invoiceItems, invoices } = require('../../../db/schema');

const db = pool.db;

const invoiceSelection = {
  invoice_id: invoices.invoiceId,
  center_id: invoices.centerId,
  student_id: invoices.studentId,
  invoice_number: invoices.invoiceNumber,
  issue_date: invoices.issueDate,
  due_date: invoices.dueDate,
  status: invoices.status,
  subtotal: invoices.subtotal,
  discount_total: invoices.discountTotal,
  tax_total: invoices.taxTotal,
  total: invoices.total,
  notes: invoices.notes,
  created_at: invoices.createdAt,
  updated_at: invoices.updatedAt,
};

const itemSelection = {
  item_id: invoiceItems.itemId,
  invoice_id: invoiceItems.invoiceId,
  description: invoiceItems.description,
  quantity: invoiceItems.quantity,
  unit_price: invoiceItems.unitPrice,
  total: invoiceItems.total,
  created_at: invoiceItems.createdAt,
  updated_at: invoiceItems.updatedAt,
};

const findAllFiltered = (filters: { studentId?: number; centerId?: number; status?: string } = {}) => {
  const conditions: any[] = [];
  if (filters.studentId) conditions.push(eq(invoices.studentId, filters.studentId));
  if (filters.centerId) conditions.push(eq(invoices.centerId, filters.centerId));
  if (filters.status) conditions.push(eq(invoices.status, filters.status));
  let query = db.select(invoiceSelection).from(invoices).orderBy(desc(invoices.createdAt));
  if (conditions.length) query = query.where(and(...conditions));
  return query;
};

const findById = async (id: number, centerId?: number, client: any = db) => {
  const conditions = [eq(invoices.invoiceId, id)];
  if (centerId) conditions.push(eq(invoices.centerId, centerId));
  const rows = await client.select(invoiceSelection).from(invoices).where(and(...conditions)).limit(1);
  return rows[0] || null;
};

const findItems = (invoiceId: number) => db.select(itemSelection).from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));

const countNumberLike = async (pattern: string, centerId?: number, client: any = db) => {
  const conditions = [like(invoices.invoiceNumber, pattern)];
  if (centerId) conditions.push(eq(invoices.centerId, centerId));
  const rows = await client.select({ count: sql`COUNT(*)::int` }).from(invoices).where(and(...conditions));
  return rows[0]?.count || 0;
};

// Serializes concurrent invoice-number generation for the same center+month prefix: the lock is
// held for the rest of the transaction, so a second transaction's countNumberLike blocks until
// the first commits its insert and releases it, closing the read-then-increment race.
const lockNumberPrefix = (prefix: string, client: any) => client.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`);

const insertInvoice = async (params: any[], client: any = db) => {
  const rows = await client
    .insert(invoices)
    .values({
      studentId: params[0],
      centerId: params[1],
      invoiceNumber: params[2],
      issueDate: params[3],
      dueDate: params[4],
      status: params[5],
      subtotal: params[6],
      discountTotal: params[7],
      taxTotal: params[8],
      total: params[9],
      notes: params[10],
    })
    .returning(invoiceSelection);
  return rows[0];
};

const insertItem = (invoiceId: number, description: string, qty: number, price: number, lineTotal: number, client: any = db) =>
  client.insert(invoiceItems).values({ invoiceId, description, quantity: qty, unitPrice: price, total: lineTotal });

const deleteItemsByInvoice = (invoiceId: number, client: any = db) => client.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));

const updateInvoice = async (params: any[], centerId?: number, client: any = db) => {
  const conditions = [eq(invoices.invoiceId, params[8])];
  if (centerId) conditions.push(eq(invoices.centerId, centerId));
  const rows = await client
    .update(invoices)
    .set({
      issueDate: sql`COALESCE(${params[0] ?? null}, ${invoices.issueDate})`,
      dueDate: sql`COALESCE(${params[1] ?? null}, ${invoices.dueDate})`,
      status: sql`COALESCE(${params[2] ?? null}, ${invoices.status})`,
      discountTotal: sql`COALESCE(${params[3] ?? null}, ${invoices.discountTotal})`,
      taxTotal: sql`COALESCE(${params[4] ?? null}, ${invoices.taxTotal})`,
      subtotal: sql`COALESCE(${params[5] ?? null}, ${invoices.subtotal})`,
      total: sql`COALESCE(${params[6] ?? null}, ${invoices.total})`,
      notes: sql`COALESCE(${params[7] ?? null}, ${invoices.notes})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(...conditions))
    .returning(invoiceSelection);
  return rows[0] || null;
};

const deleteInvoice = async (id: number, centerId?: number) => {
  const conditions = [eq(invoices.invoiceId, id)];
  if (centerId) conditions.push(eq(invoices.centerId, centerId));
  const rows = await db.delete(invoices).where(and(...conditions)).returning(invoiceSelection);
  return rows[0] || null;
};

const withTransaction = (callback: (tx: any) => Promise<any>) => db.transaction(callback);

const findOpenInvoiceForPeriod = async (studentId: number, centerId: number | undefined, periodDate: string, client: any = db) => {
  const period = new Date(periodDate);
  const monthStart = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}-01`;
  const nextMonth = new Date(period.getFullYear(), period.getMonth() + 1, 1);
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const conditions = [
    eq(invoices.studentId, studentId),
    ne(invoices.status, 'Paid'),
    gte(invoices.issueDate, monthStart),
    lt(invoices.issueDate, monthEnd),
  ];
  if (centerId) conditions.push(eq(invoices.centerId, centerId));
  const rows = await client.select(invoiceSelection).from(invoices).where(and(...conditions)).orderBy(desc(invoices.issueDate)).limit(1);
  return rows[0] || null;
};

const updateStatus = async (invoiceId: number, status: string, client: any = db) => {
  const rows = await client
    .update(invoices)
    .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(invoices.invoiceId, invoiceId))
    .returning(invoiceSelection);
  return rows[0] || null;
};

module.exports = {
  findAllFiltered,
  findById,
  findItems,
  countNumberLike,
  lockNumberPrefix,
  insertInvoice,
  insertItem,
  deleteItemsByInvoice,
  updateInvoice,
  deleteInvoice,
  findOpenInvoiceForPeriod,
  updateStatus,
  withTransaction,
};

export {};
