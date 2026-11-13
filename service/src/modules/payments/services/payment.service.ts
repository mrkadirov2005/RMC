const { splitTransferPayment, isSplittable } = require('./transferSplit');
const paymentRepository = require('../repositories/payment.repository');
const discountService = require('../../discounts/services/discount.service');
const debtRepository = require('../../debts/repositories/debt.repository');
const invoiceRepository = require('../../invoices/repositories/invoice.repository');

const listPayments = (options: {
  centerId?: number;
  teacherId?: number;
  limit?: number;
  offset?: number;
  studentId?: number;
} = {}) => paymentRepository.findAll(options);

const getPayment = (id: number, centerId?: number, teacherId?: number) => paymentRepository.findById(id, centerId, teacherId);

const resolveAppliedDiscount = (
  kind: 'monthly_discount' | 'serial_discount',
  discountId: any,
  discountType: string,
  discountValue: number,
  originalAmount: number
) => {
  const calculated = discountService.calculateDiscount(originalAmount, discountType, Number(discountValue));
  return {
    discount_id: discountId,
    discount_kind: kind,
    discount_value_type: discountType,
    discount_value: Number(discountValue),
    original_amount: calculated.originalAmount,
    discount_amount: calculated.discountAmount,
    final_amount: calculated.finalAmount,
  };
};

const syncDebtAfterPayment = async (client: any, studentId: number, paidAmount: number) => {
  if (!(paidAmount > 0)) return;
  const openDebts = await debtRepository.findOpenDebtsForStudent(Number(studentId), client);
  const debt = openDebts[0];
  if (!debt) return;
  const currentBalance = Number(debt.balance || 0);
  const currentPaid = Number(debt.amount_paid || 0);
  const newBalance = Math.max(0, currentBalance - paidAmount);
  const newAmountPaid = currentPaid + paidAmount;
  await debtRepository.applyPayment(debt.debt_id, newAmountPaid, newBalance, client);
};

const syncInvoiceAfterPayment = async (
  client: any,
  studentId: number,
  centerId: number | undefined,
  paymentDate: string,
  paidAmount: number
) => {
  if (!(paidAmount > 0)) return;
  const invoice = await invoiceRepository.findOpenInvoiceForPeriod(Number(studentId), centerId, paymentDate, client);
  if (!invoice) return;
  const total = Number(invoice.total || 0);
  const nextStatus = paidAmount >= total ? 'Paid' : 'Partially Paid';
  await invoiceRepository.updateStatus(invoice.invoice_id, nextStatus, client);
};

/** YYYY-MM-01 of the month `back` months before the date's month. */
const monthStartBefore = (date: string, back: number) => {
  const [year, month] = String(date).slice(0, 7).split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 - back, 1));
  return target.toISOString().slice(0, 10);
};

/** How many months back a late payment still settles a transfer month. */
const TRANSFER_LOOKBACK_MONTHS = 2;

/**
 * The months a payment can settle a transfer in, oldest first: two months back (only the month the
 * student left a group, and only while that group is still owed), then the payment's own month.
 * Each with every group the student was in that month.
 */
const findTransferMonths = async (studentId: number, paymentDate: string) => {
  const months: Array<{ month: string; shares: any[] }> = [];
  for (let back = TRANSFER_LOOKBACK_MONTHS; back >= 0; back -= 1) {
    const monthStart = monthStartBefore(paymentDate, back);
    const shares = (await paymentRepository.findTransferMonthShares(studentId, back === 0 ? paymentDate : monthStart, back === 0 ? {} : { transferMonthOnly: true })) || [];
    const earlier = shares.filter((row: any) => row.student_id !== studentId && Number(row.expected) > 0);
    const owed = earlier.some((row: any) => Number(row.expected) - Number(row.paid || 0) > 0.009);
    if (earlier.length && (back === 0 || owed)) months.push({ month: monthStart.slice(0, 7), shares });
  }
  return months;
};

/** The payment's parts that go to earlier groups, month by month, from what is left of it. */
const splitAcrossMonths = (studentId: number, amount: number, months: Array<{ month: string; shares: any[] }>) => {
  const parts: any[] = [];
  let left = amount;
  for (const { month, shares } of months) {
    if (!(left > 0)) break;
    for (const part of splitTransferPayment(left, shares, studentId)) {
      parts.push({ ...part, month });
      left = Math.round((left - part.amount) * 100) / 100;
    }
  }
  return parts;
};

const findTransferSplits = async (studentId: number, amount: number, paymentDate: string) =>
  splitAcrossMonths(studentId, amount, await findTransferMonths(studentId, paymentDate));

/**
 * For the payment form: the groups a transferred student was in during the month(s) this payment
 * settles, with the teacher, the lessons there (of 12) and, for an amount, the part each gets.
 * Null when the student was not transferred.
 */
const previewTransferSplit = async (studentId: number, amount: number, paymentDate: string) => {
  const months = await findTransferMonths(studentId, paymentDate);
  if (!months.length) return null;
  const parts = splitAcrossMonths(studentId, Number(amount) > 0 ? Number(amount) : 0, months);
  const partOf = (month: string, recordId: number) => parts.find((part) => part.month === month && part.student_id === recordId)?.amount || 0;
  const splitTotal = parts.reduce((sum, part) => sum + part.amount, 0);
  const money = (value: number) => Math.round(value * 100) / 100;
  const dueOf = (shares: any[]) => money(shares.reduce((sum, row) => sum + Math.max(0, Number(row.expected || 0)), 0));
  const owedOf = (shares: any[]) => money(shares.reduce((sum, row) => sum + Math.max(0, Number(row.expected || 0) - Number(row.paid || 0)), 0));
  return {
    // What the month costs in all its groups (each group's price for its lessons), and what is still unpaid.
    owed_total: money(months.reduce((sum, { shares }) => sum + owedOf(shares), 0)),
    months: months.map(({ month, shares }) => ({
      month,
      due: dueOf(shares),
      owed: owedOf(shares),
      groups: shares
        .filter((row: any) => Number(row.share) > 0)
        .sort((a: any, b: any) => String(a.start_date || '').localeCompare(String(b.start_date || '')))
        .map((row: any) => ({
          student_id: row.student_id,
          class_name: row.class_name,
          teacher_name: row.teacher_name,
          start_date: row.start_date,
          end_date: row.end_date,
          lessons: Math.round(Number(row.share || 0) * 12),
          expected: Number(row.expected || 0),
          paid: Number(row.paid || 0),
          current: row.student_id === studentId,
          split_amount: row.student_id === studentId ? null : partOf(month, row.student_id),
        })),
    })),
    split_total: Math.round(splitTotal * 100) / 100,
    kept_amount: Math.max(0, Math.round((Number(amount || 0) - splitTotal) * 100) / 100),
  };
};

const createPayment = async (body: any, centerId?: number, receivedByName?: string | null) => {
  const {
    student_id,
    payment_date,
    amount,
    currency,
    payment_method,
    transaction_reference,
    receipt_number,
    payment_status,
    payment_type,
    notes,
    discount_id,
    discount_kind,
    discount_value_type,
    discount_value,
    original_amount,
    discount_amount,
    final_amount,
    is_complete,
  } = body;
  const scopedCenterId = centerId || body.center_id;
  const paymentDate = payment_date || new Date().toISOString().slice(0, 10);
  const originalAmount = Number(original_amount ?? amount ?? 0);
  let appliedDiscount: any = null;

  // A stored monthly discount must still be active (not expired/used) at save time;
  // a manual one-off monthly discount has no discount_id and is taken as entered.
  const storedMonthlyDiscount = discount_kind === 'monthly_discount' && discount_id
    ? await discountService.getActiveByStudent(Number(student_id), Number(scopedCenterId), 'monthly_discount')
    : null;
  const manualMonthly = discount_kind === 'monthly_discount' && !discount_id && Number(discount_value || 0) > 0;

  if (storedMonthlyDiscount && Number(storedMonthlyDiscount.discount_id) === Number(discount_id)) {
    appliedDiscount = resolveAppliedDiscount(
      'monthly_discount',
      storedMonthlyDiscount.discount_id,
      storedMonthlyDiscount.discount_type,
      Number(storedMonthlyDiscount.value),
      originalAmount
    );
  } else if (manualMonthly) {
    appliedDiscount = resolveAppliedDiscount(
      'monthly_discount',
      discount_id || null,
      discount_value_type || 'fixed',
      Number(discount_value),
      originalAmount
    );
  } else {
    const monthlyDiscount = await discountService.getActiveByStudent(Number(student_id), Number(scopedCenterId), 'monthly_discount');
    const serialDiscount = monthlyDiscount
      ? null
      : await discountService.getActiveSerialByStudent(Number(student_id), Number(scopedCenterId));
    if (monthlyDiscount) {
      appliedDiscount = resolveAppliedDiscount(
        'monthly_discount',
        monthlyDiscount.discount_id,
        monthlyDiscount.discount_type,
        Number(monthlyDiscount.value),
        originalAmount
      );
    }
    if (serialDiscount) {
      appliedDiscount = resolveAppliedDiscount(
        'serial_discount',
        serialDiscount.discount_id,
        serialDiscount.discount_type,
        Number(serialDiscount.value),
        originalAmount
      );
    }
  }

  const resolvedOriginalAmount = Number(appliedDiscount?.original_amount ?? originalAmount);
  const resolvedDiscountAmount = Number(appliedDiscount?.discount_amount ?? 0);
  const resolvedFinalAmount = Number(appliedDiscount?.final_amount ?? Math.max(0, resolvedOriginalAmount - resolvedDiscountAmount));
  const paidAmount = Number(amount || 0);
  // The form computes is_complete against its own (possibly stale) discount, so it can only lower the flag
  const complete = paidAmount >= resolvedFinalAmount && is_complete !== false;

  // A student moved from another group: the part of the payment the earlier group's lessons were
  // worth goes to that group (see transferSplit), the rest stays here. This month's transfer and,
  // for a late payment, a transfer in one of the two months before it whose old group is still
  // owed its lessons (oldest first).
  const splitParts = student_id && isSplittable(payment_type)
    ? await findTransferSplits(Number(student_id), paidAmount, paymentDate)
    : [];
  const splitTotal = splitParts.reduce((sum: number, part: any) => sum + part.amount, 0);
  const keptAmount = Math.round((paidAmount - splitTotal) * 100) / 100;

  const paymentPayload = [
    student_id,
    scopedCenterId,
    paymentDate,
    splitParts.length ? keptAmount : amount,
    currency || 'UZS',
    payment_method || 'Cash',
    transaction_reference,
    receipt_number,
    payment_status || 'Completed',
    payment_type,
    notes,
    // Record only the discount actually applied, never stale fields from the form
    appliedDiscount?.discount_id || null,
    appliedDiscount?.discount_kind || null,
    appliedDiscount?.discount_value_type || null,
    appliedDiscount?.discount_value ?? 0,
    resolvedOriginalAmount,
    resolvedDiscountAmount,
    resolvedFinalAmount,
    complete,
    receivedByName ?? null,
  ];

  return paymentRepository.withTransaction(async (client: any) => {
    const createdPayment = await paymentRepository.insert(paymentPayload, client);

    for (const part of splitParts) {
      await paymentRepository.insert([
        part.student_id,
        part.center_id ?? scopedCenterId,
        paymentDate,
        part.amount,
        currency || 'UZS',
        payment_method || 'Cash',
        `SPLIT-${createdPayment?.payment_id ?? 'new'}-${part.student_id}-${part.month}`,
        null,
        'Completed',
        'Transfer Split',
        `Part of a payment taken in the new group after a transfer: the lessons taught in this group in ${part.month} (${Math.round(Number(part.share || 0) * 12)} of 12).`,
        null,
        null,
        null,
        0,
        part.amount,
        0,
        part.amount,
        true,
        receivedByName ?? null,
      ], client);
    }

    if (appliedDiscount?.discount_kind === 'monthly_discount' && appliedDiscount?.discount_id) {
      await discountService.update(appliedDiscount.discount_id, { active: false }, Number(scopedCenterId), client);
    }

    await syncDebtAfterPayment(client, student_id, resolvedFinalAmount);
    await syncInvoiceAfterPayment(client, student_id, scopedCenterId, paymentDate, resolvedFinalAmount);

    return createdPayment;
  });
};

// The cashier printed on a receipt: the owner or admin recording the payment. Owners and
// admins both sign in as userType "superuser"; role "owner" tells them apart.
const resolveCashierName = async (user: any): Promise<string | null> => {
  if (!user?.id || user.userType !== 'superuser') return null;
  if (user.is_developer === true) return 'Tizim';
  const name = await paymentRepository.findStaffName(user.role === 'owner' ? 'owners' : 'superusers', Number(user.id));
  return name || user.username || null;
};

const fullName = (lastName?: string | null, firstName?: string | null) =>
  [lastName, firstName].map((part) => String(part || '').trim()).filter(Boolean).join(' ') || null;

const getReceipt = async (id: number, centerId?: number) => {
  const row = await paymentRepository.findReceipt(id, centerId);
  if (!row) return null;
  const paid = Number(row.amount || 0);
  const discount = Number(row.discount_amount || 0);
  const expected = row.original_amount != null ? Number(row.original_amount) : Number(row.class_payment_amount ?? paid);
  return {
    payment_id: row.payment_id,
    receipt_number: row.receipt_number,
    payer_name: fullName(row.student_last_name, row.student_first_name),
    subject: row.subject_name || row.class_name || null,
    expected_amount: expected,
    discount_amount: discount,
    paid_amount: paid,
    currency: row.currency || 'UZS',
    payment_method: row.payment_method,
    teacher_name: fullName(row.teacher_last_name, row.teacher_first_name),
    paid_at: row.created_at,
    billing_month: String(row.covered_from || row.payment_date || '').slice(0, 7) || null,
    cashier_name: row.received_by_name || null,
    center_name: row.center_name || null,
    center_phone: row.center_phone || null,
    center_address: row.center_address || null,
  };
};

const updatePayment = (id: number, body: any, centerId?: number, teacherId?: number) => {
  const { amount, payment_status, notes } = body;
  return paymentRepository.update(id, [amount, payment_status, notes], centerId, teacherId);
};

const listByStudent = (studentId: number, centerId?: number, teacherId?: number) =>
  paymentRepository.findByStudent(studentId, centerId, teacherId);

const deletePayment = (id: number, centerId?: number, teacherId?: number) => paymentRepository.remove(id, centerId, teacherId);

const purgePayment = (id: number, centerId?: number, teacherId?: number) => paymentRepository.purge(id, centerId, teacherId);

// Dashboard payments page: every active student with what they paid in a date range (this month
// by default), 100 per page.
const PAGE_SIZE = 100;
const isDay = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const centerToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const monthsTouched = (from: string, to: string) =>
  (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + (Number(to.slice(5, 7)) - Number(from.slice(5, 7))) + 1;

const listStudentPaymentSummary = async (query: any, centerId?: number) => {
  const today = centerToday();
  const monthStart = `${today.slice(0, 7)}-01`;
  const lastDay = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate();
  let from = isDay(query.from) ? String(query.from) : monthStart;
  let to = isDay(query.to) ? String(query.to) : `${today.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
  if (from > to) [from, to] = [to, from];
  const months = Math.max(1, Math.min(36, monthsTouched(from, to)));
  const page = Math.max(1, Number(query.page) || 1);
  const status = ['paid', 'partial', 'unpaid', 'debt'].includes(String(query.status)) ? String(query.status) as 'paid' | 'partial' | 'unpaid' | 'debt' : undefined;

  const row = await paymentRepository.findStudentPaymentSummary({
    centerId,
    from,
    to,
    months,
    status,
    teacherId: Number(query.teacher_id) || undefined,
    classId: Number(query.class_id) || undefined,
    subject: String(query.subject || '').trim() || undefined,
    q: String(query.q || '').trim().slice(0, 100) || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const totals = row?.totals || {};
  const num = (value: unknown) => Number(value || 0);
  return {
    period: { from, to, months },
    page,
    limit: PAGE_SIZE,
    total: num(row?.total),
    totals: {
      students: num(totals.students),
      paid_students: num(totals.paid_students),
      partial_students: num(totals.partial_students),
      unpaid_students: num(totals.unpaid_students),
      collected: num(totals.collected),
      remaining: num(totals.remaining),
    },
    rows: (row?.rows || []).map((item: any) => ({
      ...item,
      monthly_fee: num(item.monthly_fee),
      paid_amount: num(item.paid_amount),
      expected: num(item.expected),
      remaining: Math.max(0, num(item.expected) - num(item.paid_amount)),
      // What to enter as the original amount when recording the rest: the payment form applies the
      // student's active discount itself, so this is before the serial discount.
      remaining_before_discount: num(item.remaining_before_discount),
    })),
  };
};

module.exports = {
  previewTransferSplit,
  findStudentCenter: (studentId: number) => paymentRepository.findStudentCenter(studentId),
  listStudentPaymentSummary,
  resolveCashierName,
  getReceipt,
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  listByStudent,
  deletePayment,
  purgePayment,
};

export {};
