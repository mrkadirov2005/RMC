const cashReportRepository = require('../repositories/cashReport.repository');

// The three ways money reaches the center, in the order the report lists them; anything else
// (cheques, old values) is shown last as "other".
const METHOD_ORDER = ['cash', 'card', 'bank', 'other'] as const;
type MethodGroup = (typeof METHOD_ORDER)[number];

/** Which till a payment method belongs to: naqd, karta or hisob raqam. */
const methodGroup = (method: unknown): MethodGroup => {
  const value = String(method || '').trim().toLowerCase();
  if (!value || value === 'cash' || value === 'naqd') return 'cash';
  if (value.includes('card') || value.includes('karta') || value.includes('wallet')) return 'card';
  if (value.includes('bank') || value.includes('transfer') || value.includes('hisob')) return 'bank';
  return 'other';
};

const EXPENSE_METHODS: Record<Exclude<MethodGroup, 'other'>, string> = { cash: 'Cash', card: 'Credit Card', bank: 'Bank Transfer' };

const isDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const money = (value: unknown) => Math.round(Number(value || 0) * 100) / 100;
const emptyTotals = () => Object.fromEntries(METHOD_ORDER.map((group) => [group, 0])) as Record<MethodGroup, number>;

/**
 * One day's till: every payment (cash first, then card, then bank, then other, each in time
 * order), the day's expenses, and per method what came in, what went out and what is left.
 */
const getDailyReport = async (date: string, centerId?: number) => {
  if (!isDate(date)) return { error: 'invalid_date' as const };
  const [payments, expenses] = await Promise.all([
    cashReportRepository.findPaymentsOn(date, centerId),
    cashReportRepository.findExpenses({ from: date, to: date, centerId }),
  ]);

  const income = emptyTotals();
  const spent = emptyTotals();
  const rows = payments.map((row: any) => ({
    payment_id: row.payment_id,
    student_id: row.student_id,
    student_name: [row.last_name, row.first_name].filter(Boolean).join(' ') || null,
    class_name: row.class_name || null,
    amount: money(row.amount),
    payment_method: row.payment_method || 'Cash',
    method_group: methodGroup(row.payment_method),
    received_by_name: row.received_by_name || null,
    paid_at: row.paid_at,
  }));
  rows.forEach((row: any) => { income[row.method_group as MethodGroup] += row.amount; });
  rows.sort((a: any, b: any) => METHOD_ORDER.indexOf(a.method_group) - METHOD_ORDER.indexOf(b.method_group));

  const expenseRows = expenses.map((row: any) => ({ ...row, amount: money(row.amount), method_group: methodGroup(row.payment_method) }));
  expenseRows.forEach((row: any) => { spent[row.method_group as MethodGroup] += row.amount; });

  const remaining = emptyTotals();
  METHOD_ORDER.forEach((group) => {
    income[group] = money(income[group]);
    spent[group] = money(spent[group]);
    remaining[group] = money(income[group] - spent[group]);
  });
  const sum = (totals: Record<MethodGroup, number>) => money(METHOD_ORDER.reduce((total, group) => total + totals[group], 0));

  return {
    date,
    payments: rows,
    expenses: expenseRows,
    income: { ...income, total: sum(income) },
    expenses_total: { ...spent, total: sum(spent) },
    remaining: { ...remaining, total: sum(remaining) },
  };
};

const listExpenses = async ({ from, to }: { from?: string; to?: string }, centerId?: number) => {
  if (!isDate(from) || !isDate(to) || String(from) > String(to)) return { error: 'invalid_range' as const };
  return cashReportRepository.findExpenses({ from: String(from), to: String(to), centerId });
};

const createExpense = async (body: any, centerId: number, createdByName: string | null) => {
  const amount = money(body?.amount);
  const description = String(body?.description || '').trim();
  const group = methodGroup(body?.payment_method);
  if (!isDate(body?.expense_date)) return { error: 'invalid_date' as const };
  if (!(amount > 0) || amount > 1_000_000_000) return { error: 'invalid_amount' as const };
  if (!description || description.length > 500) return { error: 'invalid_description' as const };
  if (group === 'other') return { error: 'invalid_method' as const };
  return cashReportRepository.insertExpense({
    centerId,
    expenseDate: body.expense_date,
    amount,
    paymentMethod: EXPENSE_METHODS[group],
    description,
    createdByName,
  });
};

const deleteExpense = async (expenseId: number, centerId?: number) => cashReportRepository.softDeleteExpense(expenseId, centerId);

module.exports = { getDailyReport, listExpenses, createExpense, deleteExpense, methodGroup };
export {};
